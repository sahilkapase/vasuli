-- Vasuli schema: core tables. All money is BIGINT paise. All timestamps are server-side (default now()).
create extension if not exists pgcrypto; -- gen_random_uuid(), digest()

create type role_t as enum ('owner', 'collector', 'viewer');
create type interest_type_t as enum ('FLAT', 'REDUCING');
create type penalty_type_t as enum ('PERCENT', 'FIXED', 'NONE');
create type loan_status_t as enum ('ACTIVE', 'CLOSED');
create type installment_status_t as enum ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE');
create type ledger_entry_type_t as enum (
  'DISBURSEMENT', 'INTEREST_ACCRUAL', 'PAYMENT_PENALTY', 'PAYMENT_INTEREST',
  'PAYMENT_PRINCIPAL', 'REVERSAL'
);

-- Emails allowed to sign in. Checked by middleware/RLS after Google OAuth login.
create table allowed_emails (
  email text primary key,
  role role_t not null default 'viewer',
  created_at timestamptz not null default now()
);

-- Mirrors auth.users for allowlisted accounts only. Row is created on first successful login
-- by a trigger on auth.users (see below) that checks allowed_emails.
create table users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  role role_t not null default 'viewer',
  created_at timestamptz not null default now()
);

create table borrowers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) >= 2),
  phone text not null check (phone ~ '^[6-9]\d{9}$'),
  address text,
  id_proof_type text,
  id_proof_number text,
  guarantor_name text,
  guarantor_phone text,
  notes text,
  assigned_collector_id uuid references users (id),
  created_by uuid not null references users (id),
  created_at timestamptz not null default now()
);
create index idx_borrowers_assigned_collector on borrowers (assigned_collector_id);

create table loans (
  id uuid primary key default gen_random_uuid(),
  borrower_id uuid not null references borrowers (id),
  principal_paise bigint not null check (principal_paise > 0),
  rate_percent numeric(5, 2) not null check (rate_percent >= 10 and rate_percent <= 15),
  interest_type interest_type_t not null,
  period_days int not null check (period_days >= 1),
  start_date date not null,
  penalty_type penalty_type_t not null default 'NONE',
  penalty_value numeric(10, 2) check (penalty_value is null or penalty_value >= 0),
  status loan_status_t not null default 'ACTIVE',
  outstanding_principal_paise bigint not null check (outstanding_principal_paise >= 0),
  created_by uuid not null references users (id),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
create index idx_loans_borrower on loans (borrower_id);
create index idx_loans_status on loans (status);

create table installments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references loans (id),
  period_number int not null check (period_number >= 1),
  due_date date not null,
  interest_due_paise bigint not null check (interest_due_paise >= 0),
  penalty_due_paise bigint not null default 0 check (penalty_due_paise >= 0),
  interest_paid_paise bigint not null default 0 check (interest_paid_paise >= 0 and interest_paid_paise <= interest_due_paise),
  penalty_paid_paise bigint not null default 0 check (penalty_paid_paise >= 0 and penalty_paid_paise <= penalty_due_paise),
  status installment_status_t not null default 'PENDING',
  created_at timestamptz not null default now(),
  unique (loan_id, period_number)
);
create index idx_installments_loan on installments (loan_id);
create index idx_installments_due_date on installments (due_date);

-- APPEND-ONLY: rows are never updated or deleted (see 0002_append_only_triggers.sql).
-- Reversal status is derived (not mutated) via payment_reversals below.
create table payments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references loans (id),
  idempotency_key uuid not null unique,
  amount_paise bigint not null check (amount_paise > 0),
  penalty_allocated_paise bigint not null default 0 check (penalty_allocated_paise >= 0),
  interest_allocated_paise bigint not null default 0 check (interest_allocated_paise >= 0),
  principal_allocated_paise bigint not null default 0 check (principal_allocated_paise >= 0),
  note text,
  created_by uuid not null references users (id),
  created_at timestamptz not null default now()
);
create index idx_payments_loan on payments (loan_id);

-- APPEND-ONLY: one row per reversed payment (unique payment_id blocks double reversal).
create table payment_reversals (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null unique references payments (id),
  reason text not null check (char_length(reason) >= 5),
  reversed_by uuid not null references users (id),
  created_at timestamptz not null default now()
);

-- APPEND-ONLY: exact trace of which installments a payment's penalty/interest went to,
-- so reverse_payment() can undo precisely instead of guessing.
create table payment_installment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments (id),
  installment_id uuid not null references installments (id),
  penalty_paise bigint not null default 0 check (penalty_paise >= 0),
  interest_paise bigint not null default 0 check (interest_paise >= 0),
  created_at timestamptz not null default now()
);
create index idx_pia_payment on payment_installment_allocations (payment_id);
create index idx_pia_installment on payment_installment_allocations (installment_id);

-- APPEND-ONLY, hash-chained (see 0003_hash_chain.sql).
create table ledger_entries (
  seq bigserial primary key,
  id uuid not null default gen_random_uuid(),
  loan_id uuid not null references loans (id),
  entry_type ledger_entry_type_t not null,
  amount_paise bigint not null,
  reference_payment_id uuid references payments (id),
  prev_hash text,
  hash text not null,
  created_by uuid not null references users (id),
  created_at timestamptz not null default now()
);
create index idx_ledger_loan on ledger_entries (loan_id);

-- APPEND-ONLY audit trail for login, create, payment, reversal, role change.
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users (id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);
create index idx_audit_user on audit_log (user_id);
create index idx_audit_created on audit_log (created_at);

create table app_settings (
  id smallint primary key default 1 check (id = 1),
  default_rate_percent numeric(5, 2) not null default 12.5
    check (default_rate_percent >= 10 and default_rate_percent <= 15),
  default_penalty_type penalty_type_t not null default 'NONE',
  default_penalty_value numeric(10, 2),
  updated_at timestamptz not null default now()
);

-- Provision public.users automatically for allowlisted Google accounts on first sign-in.
create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_role role_t;
begin
  select role into matched_role from allowed_emails where email = new.email;

  if matched_role is not null then
    insert into users (id, email, full_name, role)
    values (new.id, new.email, new.raw_user_meta_data ->> 'full_name', matched_role)
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();
