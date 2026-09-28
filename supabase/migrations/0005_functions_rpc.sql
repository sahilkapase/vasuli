-- Core write path. All money mutations for loans/payments go through these SECURITY DEFINER
-- functions, which run as the function owner and therefore bypass RLS — this is the ONLY way
-- payments/ledger_entries/installments get written, enforced architecturally by 0004's RLS
-- (no INSERT policy exists for those tables for normal roles).

create or replace function calculate_penalty_paise(overdue_interest_paise bigint, p_type penalty_type_t, p_value numeric)
returns bigint
language plpgsql immutable as $$
begin
  if p_type is null or p_type = 'NONE' or p_value is null or overdue_interest_paise <= 0 then
    return 0;
  end if;
  if p_type = 'FIXED' then
    return round(p_value)::bigint;
  end if;
  -- PERCENT: p_value is a percentage, e.g. 2.5 -> 2.5% of the overdue interest
  return round(overdue_interest_paise * p_value / 100.0)::bigint;
end;
$$;

-- Ensures installments exist for every elapsed period and flags overdue ones with penalty.
-- REDUCING interest is computed against the loan's current outstanding principal at the time
-- each installment is generated; ponytail: this doesn't retroactively re-price periods whose
-- principal later changed mid-period. Upgrade path: snapshot principal history if exact
-- historical re-pricing is ever required.
create or replace function generate_due_installments(p_loan_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  loan_rec loans%rowtype;
  periods_elapsed int;
  n int;
  due date;
  interest_amt bigint;
  penalty_amt bigint;
begin
  select * into loan_rec from loans where id = p_loan_id for update;
  if loan_rec.status <> 'ACTIVE' then
    return;
  end if;

  periods_elapsed := floor(extract(epoch from (current_date - loan_rec.start_date)) / (loan_rec.period_days * 86400));

  for n in 1..greatest(periods_elapsed, 0) loop
    if not exists (select 1 from installments where loan_id = p_loan_id and period_number = n) then
      due := loan_rec.start_date + (n * loan_rec.period_days);
      interest_amt := case loan_rec.interest_type
        when 'FLAT' then round(loan_rec.principal_paise * loan_rec.rate_percent / 100.0)::bigint
        else round(loan_rec.outstanding_principal_paise * loan_rec.rate_percent / 100.0)::bigint
      end;
      penalty_amt := 0;
      if due < current_date then
        penalty_amt := calculate_penalty_paise(interest_amt, loan_rec.penalty_type, loan_rec.penalty_value);
      end if;

      insert into installments (loan_id, period_number, due_date, interest_due_paise, penalty_due_paise, status)
      values (p_loan_id, n, due, interest_amt, penalty_amt, case when due < current_date then 'OVERDUE' else 'PENDING' end);
    end if;
  end loop;

  -- age up previously-generated installments that have since become overdue
  update installments
  set status = 'OVERDUE',
      penalty_due_paise = calculate_penalty_paise(interest_due_paise, loan_rec.penalty_type, loan_rec.penalty_value)
  where loan_id = p_loan_id
    and due_date < current_date
    and status = 'PENDING'
    and penalty_due_paise = 0;
end;
$$;

create or replace function recompute_installment_status(p_installment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  i installments%rowtype;
begin
  select * into i from installments where id = p_installment_id for update;
  if i.interest_paid_paise >= i.interest_due_paise and i.penalty_paid_paise >= i.penalty_due_paise then
    update installments set status = 'PAID' where id = p_installment_id;
  elsif i.interest_paid_paise > 0 or i.penalty_paid_paise > 0 then
    update installments set status = 'PARTIAL' where id = p_installment_id;
  elsif i.due_date < current_date then
    update installments set status = 'OVERDUE' where id = p_installment_id;
  else
    update installments set status = 'PENDING' where id = p_installment_id;
  end if;
end;
$$;

-- The single write path for recording a payment. Allocation order is fixed:
-- penalty -> interest -> principal. Idempotent on p_idempotency_key.
create or replace function collect_payment(
  p_loan_id uuid,
  p_amount_paise bigint,
  p_idempotency_key uuid,
  p_note text default null
)
returns table (
  payment_id uuid,
  penalty_allocated_paise bigint,
  interest_allocated_paise bigint,
  principal_allocated_paise bigint,
  loan_closed boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  loan_rec loans%rowtype;
  existing payments%rowtype;
  total_penalty_due bigint;
  total_interest_due bigint;
  total_due bigint;
  remaining bigint;
  alloc_penalty bigint := 0;
  alloc_interest bigint := 0;
  alloc_principal bigint := 0;
  new_payment_id uuid;
  will_close boolean := false;
  inst record;
  take bigint;
begin
  if p_amount_paise is null or p_amount_paise <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  -- idempotency: a retried request with the same key returns the original result, no re-insert
  select * into existing from payments where idempotency_key = p_idempotency_key;
  if found then
    return query
      select existing.id, existing.penalty_allocated_paise, existing.interest_allocated_paise,
             existing.principal_allocated_paise,
             (select status = 'CLOSED' from loans where id = existing.loan_id);
    return;
  end if;

  select * into loan_rec from loans where id = p_loan_id for update;
  if not found then
    raise exception 'Loan not found';
  end if;
  if not (current_role_t() in ('owner', 'collector') and borrower_visible_to_me(loan_rec.borrower_id)) then
    raise exception 'Forbidden';
  end if;
  if loan_rec.status <> 'ACTIVE' then
    raise exception 'Loan is not active';
  end if;

  perform generate_due_installments(p_loan_id);

  select coalesce(sum(penalty_due_paise - penalty_paid_paise), 0),
         coalesce(sum(interest_due_paise - interest_paid_paise), 0)
    into total_penalty_due, total_interest_due
    from installments where loan_id = p_loan_id;

  total_due := total_penalty_due + total_interest_due + loan_rec.outstanding_principal_paise;
  if p_amount_paise > total_due then
    raise exception 'Amount (%) exceeds total payable (%)', p_amount_paise, total_due;
  end if;

  remaining := p_amount_paise;
  alloc_penalty := least(remaining, total_penalty_due);
  remaining := remaining - alloc_penalty;
  alloc_interest := least(remaining, total_interest_due);
  remaining := remaining - alloc_interest;
  alloc_principal := least(remaining, loan_rec.outstanding_principal_paise);
  remaining := remaining - alloc_principal;

  insert into payments (
    loan_id, idempotency_key, amount_paise, penalty_allocated_paise,
    interest_allocated_paise, principal_allocated_paise, note, created_by
  ) values (
    p_loan_id, p_idempotency_key, p_amount_paise, alloc_penalty,
    alloc_interest, alloc_principal, p_note, caller
  ) returning id into new_payment_id;

  -- distribute penalty then interest across installments, oldest first, recording exact traces
  take := alloc_penalty;
  if take > 0 then
    for inst in select * from installments where loan_id = p_loan_id and penalty_due_paise > penalty_paid_paise order by due_date asc loop
      exit when take <= 0;
      declare portion bigint := least(take, inst.penalty_due_paise - inst.penalty_paid_paise);
      begin
        update installments set penalty_paid_paise = penalty_paid_paise + portion where id = inst.id;
        insert into payment_installment_allocations (payment_id, installment_id, penalty_paise, interest_paise)
          values (new_payment_id, inst.id, portion, 0);
        perform recompute_installment_status(inst.id);
        take := take - portion;
      end;
    end loop;
  end if;

  take := alloc_interest;
  if take > 0 then
    for inst in select * from installments where loan_id = p_loan_id and interest_due_paise > interest_paid_paise order by due_date asc loop
      exit when take <= 0;
      declare portion bigint := least(take, inst.interest_due_paise - inst.interest_paid_paise);
      begin
        update installments set interest_paid_paise = interest_paid_paise + portion where id = inst.id;
        insert into payment_installment_allocations (payment_id, installment_id, penalty_paise, interest_paise)
          values (new_payment_id, inst.id, 0, portion);
        perform recompute_installment_status(inst.id);
        take := take - portion;
      end;
    end loop;
  end if;

  will_close := (loan_rec.outstanding_principal_paise - alloc_principal) = 0
                and (total_interest_due - alloc_interest) = 0
                and (total_penalty_due - alloc_penalty) = 0;

  update loans
  set outstanding_principal_paise = outstanding_principal_paise - alloc_principal,
      status = case when will_close then 'CLOSED' else status end,
      closed_at = case when will_close then now() else closed_at end
  where id = p_loan_id;

  if alloc_penalty > 0 then
    insert into ledger_entries (loan_id, entry_type, amount_paise, reference_payment_id, created_by)
    values (p_loan_id, 'PAYMENT_PENALTY', alloc_penalty, new_payment_id, caller);
  end if;
  if alloc_interest > 0 then
    insert into ledger_entries (loan_id, entry_type, amount_paise, reference_payment_id, created_by)
    values (p_loan_id, 'PAYMENT_INTEREST', alloc_interest, new_payment_id, caller);
  end if;
  if alloc_principal > 0 then
    insert into ledger_entries (loan_id, entry_type, amount_paise, reference_payment_id, created_by)
    values (p_loan_id, 'PAYMENT_PRINCIPAL', alloc_principal, new_payment_id, caller);
  end if;

  insert into audit_log (user_id, action, entity_type, entity_id, details)
  values (caller, 'payment', 'loan', p_loan_id, jsonb_build_object(
    'payment_id', new_payment_id, 'amount_paise', p_amount_paise,
    'penalty', alloc_penalty, 'interest', alloc_interest, 'principal', alloc_principal
  ));

  return query select new_payment_id, alloc_penalty, alloc_interest, alloc_principal, will_close;
end;
$$;

-- Owner-only reversal. Exactly undoes a payment's allocations using the recorded trace, and
-- writes a REVERSAL ledger entry referencing the original payment. The original payment row
-- itself is never touched (append-only).
create or replace function reverse_payment(p_payment_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  pay payments%rowtype;
  loan_rec loans%rowtype;
  alloc record;
begin
  if current_role_t() <> 'owner' then
    raise exception 'Forbidden: only owner can reverse payments';
  end if;
  if p_reason is null or char_length(trim(p_reason)) < 5 then
    raise exception 'A reason of at least 5 characters is required';
  end if;

  select * into pay from payments where id = p_payment_id;
  if not found then
    raise exception 'Payment not found';
  end if;
  if exists (select 1 from payment_reversals where payment_id = p_payment_id) then
    raise exception 'Payment already reversed';
  end if;

  select * into loan_rec from loans where id = pay.loan_id for update;

  for alloc in select * from payment_installment_allocations where payment_id = p_payment_id loop
    update installments
    set penalty_paid_paise = penalty_paid_paise - alloc.penalty_paise,
        interest_paid_paise = interest_paid_paise - alloc.interest_paise
    where id = alloc.installment_id;
    perform recompute_installment_status(alloc.installment_id);
  end loop;

  update loans
  set outstanding_principal_paise = outstanding_principal_paise + pay.principal_allocated_paise,
      status = 'ACTIVE',
      closed_at = null
  where id = pay.loan_id;

  insert into payment_reversals (payment_id, reason, reversed_by)
  values (p_payment_id, p_reason, caller);

  insert into ledger_entries (loan_id, entry_type, amount_paise, reference_payment_id, created_by)
  values (pay.loan_id, 'REVERSAL', pay.amount_paise, p_payment_id, caller);

  insert into audit_log (user_id, action, entity_type, entity_id, details)
  values (caller, 'reversal', 'payment', p_payment_id, jsonb_build_object('reason', p_reason));
end;
$$;

-- Creates a loan, its disbursement ledger entry, and the audit record in one transaction.
create or replace function create_loan(
  p_borrower_id uuid,
  p_principal_paise bigint,
  p_rate_percent numeric,
  p_interest_type interest_type_t,
  p_period_days int,
  p_start_date date,
  p_penalty_type penalty_type_t default 'NONE',
  p_penalty_value numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  new_loan_id uuid;
begin
  if current_role_t() not in ('owner', 'collector') then
    raise exception 'Forbidden';
  end if;
  if not borrower_visible_to_me(p_borrower_id) then
    raise exception 'Forbidden: borrower not visible to you';
  end if;

  insert into loans (
    borrower_id, principal_paise, rate_percent, interest_type, period_days,
    start_date, penalty_type, penalty_value, outstanding_principal_paise, created_by
  ) values (
    p_borrower_id, p_principal_paise, p_rate_percent, p_interest_type, p_period_days,
    p_start_date, p_penalty_type, p_penalty_value, p_principal_paise, caller
  ) returning id into new_loan_id;

  insert into ledger_entries (loan_id, entry_type, amount_paise, created_by)
  values (new_loan_id, 'DISBURSEMENT', p_principal_paise, caller);

  insert into audit_log (user_id, action, entity_type, entity_id, details)
  values (caller, 'create_loan', 'loan', new_loan_id, jsonb_build_object('principal_paise', p_principal_paise));

  return new_loan_id;
end;
$$;

-- Called once per successful login (from the OAuth callback route).
create or replace function log_login()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into audit_log (user_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'login', 'session', auth.uid(), '{}'::jsonb);
end;
$$;

-- Owner changes another user's role; audited.
create or replace function change_user_role(p_user_id uuid, p_role role_t)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_role_t() <> 'owner' then
    raise exception 'Forbidden';
  end if;
  update users set role = p_role where id = p_user_id;
  insert into audit_log (user_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'role_change', 'user', p_user_id, jsonb_build_object('new_role', p_role));
end;
$$;

-- Brings every active loan's installments up to date. Called before dashboard/overdue reads
-- so "due today" and "overdue" figures reflect the current date even if nobody has collected
-- a payment yet today.
create or replace function refresh_all_installments()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  loan_id uuid;
begin
  for loan_id in select id from loans where status = 'ACTIVE' loop
    perform generate_due_installments(loan_id);
  end loop;
end;
$$;
