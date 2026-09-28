-- Row-level security: owner sees/does everything; collector is scoped to assigned borrowers;
-- viewer is read-only. payments/ledger_entries/audit_log/payment_reversals get NO insert policy
-- for regular roles at all — they can only be written by the SECURITY DEFINER RPCs in
-- 0005_functions_rpc.sql, which run as the function owner and bypass RLS. This makes "writes
-- only go through the RPC" an architectural guarantee, not just a convention.

alter table users enable row level security;
alter table allowed_emails enable row level security;
alter table borrowers enable row level security;
alter table loans enable row level security;
alter table installments enable row level security;
alter table payments enable row level security;
alter table payment_reversals enable row level security;
alter table payment_installment_allocations enable row level security;
alter table ledger_entries enable row level security;
alter table audit_log enable row level security;
alter table app_settings enable row level security;

create or replace function current_role_t()
returns role_t
language sql stable security definer set search_path = public as $$
  select role from users where id = auth.uid();
$$;

create or replace function is_owner() returns boolean language sql stable as $$
  select current_role_t() = 'owner';
$$;

create or replace function borrower_visible_to_me(b_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select case current_role_t()
    when 'owner' then true
    when 'viewer' then true
    when 'collector' then exists (
      select 1 from borrowers where id = b_id and assigned_collector_id = auth.uid()
    )
    else false
  end;
$$;

-- users
create policy users_select_self_or_owner on users for select
  using (id = auth.uid() or is_owner());
create policy users_update_owner_only on users for update
  using (is_owner());

-- allowed_emails: owner-only management
create policy allowed_emails_owner_all on allowed_emails for all
  using (is_owner()) with check (is_owner());

-- borrowers
create policy borrowers_select on borrowers for select
  using (borrower_visible_to_me(id));
create policy borrowers_insert on borrowers for insert
  with check (current_role_t() in ('owner', 'collector'));
create policy borrowers_update on borrowers for update
  using (is_owner() or assigned_collector_id = auth.uid())
  with check (is_owner() or assigned_collector_id = auth.uid());

-- loans
create policy loans_select on loans for select
  using (borrower_visible_to_me(borrower_id));
create policy loans_insert on loans for insert
  with check (
    current_role_t() in ('owner', 'collector')
    and borrower_visible_to_me(borrower_id)
  );

-- installments (system-managed; read-only to all app roles)
create policy installments_select on installments for select
  using (
    exists (
      select 1 from loans l
      where l.id = installments.loan_id and borrower_visible_to_me(l.borrower_id)
    )
  );

-- payments (writes only via RPC, see 0005)
create policy payments_select on payments for select
  using (
    exists (
      select 1 from loans l
      where l.id = payments.loan_id and borrower_visible_to_me(l.borrower_id)
    )
  );

-- payment_reversals (writes only via RPC, owner only)
create policy payment_reversals_select on payment_reversals for select
  using (
    exists (
      select 1 from payments p
      join loans l on l.id = p.loan_id
      where p.id = payment_reversals.payment_id and borrower_visible_to_me(l.borrower_id)
    )
  );

-- ledger_entries (writes only via trigger from the RPC)
create policy ledger_entries_select on ledger_entries for select
  using (
    exists (
      select 1 from loans l
      where l.id = ledger_entries.loan_id and borrower_visible_to_me(l.borrower_id)
    )
  );

create policy pia_select on payment_installment_allocations for select
  using (
    exists (
      select 1 from payments p
      join loans l on l.id = p.loan_id
      where p.id = payment_installment_allocations.payment_id and borrower_visible_to_me(l.borrower_id)
    )
  );

-- audit_log: owner only
create policy audit_log_select_owner on audit_log for select
  using (is_owner());

-- app_settings: everyone can read (needed for default rate/penalty in forms), owner writes
create policy app_settings_select_all on app_settings for select using (true);
create policy app_settings_update_owner on app_settings for update using (is_owner());
