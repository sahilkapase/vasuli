-- payments, ledger_entries, and payment_reversals are strictly append-only: no UPDATE, DELETE,
-- or TRUNCATE is ever permitted, with no exceptions. Corrections are new rows that reference
-- the original (payment_reversals.payment_id -> payments.id, ledger REVERSAL entries).

create or replace function forbid_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Table % is append-only: % is not permitted', tg_table_name, tg_op;
end;
$$;

create trigger payments_no_update before update on payments
  for each row execute function forbid_mutation();
create trigger payments_no_delete before delete on payments
  for each row execute function forbid_mutation();
create trigger payments_no_truncate before truncate on payments
  for each statement execute function forbid_mutation();

create trigger ledger_entries_no_update before update on ledger_entries
  for each row execute function forbid_mutation();
create trigger ledger_entries_no_delete before delete on ledger_entries
  for each row execute function forbid_mutation();
create trigger ledger_entries_no_truncate before truncate on ledger_entries
  for each statement execute function forbid_mutation();

create trigger payment_reversals_no_update before update on payment_reversals
  for each row execute function forbid_mutation();
create trigger payment_reversals_no_delete before delete on payment_reversals
  for each row execute function forbid_mutation();
create trigger payment_reversals_no_truncate before truncate on payment_reversals
  for each statement execute function forbid_mutation();

create trigger pia_no_update before update on payment_installment_allocations
  for each row execute function forbid_mutation();
create trigger pia_no_delete before delete on payment_installment_allocations
  for each row execute function forbid_mutation();
create trigger pia_no_truncate before truncate on payment_installment_allocations
  for each statement execute function forbid_mutation();
