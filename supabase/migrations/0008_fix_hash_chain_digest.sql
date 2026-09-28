-- Fixes 0003_hash_chain.sql: pgcrypto's digest() takes bytea, not text. Passing text directly
-- raised "function digest(text, unknown) does not exist". Cast the canonical string to bytea
-- explicitly before hashing.

create or replace function ledger_entries_set_hash()
returns trigger
language plpgsql
as $$
declare
  last_hash text;
  canonical text;
begin
  select hash into last_hash from ledger_entries order by seq desc limit 1;

  new.prev_hash := last_hash; -- null for the very first row, by design

  canonical := coalesce(new.id::text, '') || '|' ||
               coalesce(new.loan_id::text, '') || '|' ||
               new.entry_type::text || '|' ||
               new.amount_paise::text || '|' ||
               coalesce(new.reference_payment_id::text, '') || '|' ||
               coalesce(new.created_by::text, '') || '|' ||
               new.created_at::text;

  new.hash := encode(digest(convert_to(coalesce(last_hash, '') || canonical, 'UTF8'), 'sha256'), 'hex');

  return new;
end;
$$;

create or replace function verify_ledger_chain()
returns table (is_valid boolean, first_broken_seq bigint, first_broken_id uuid, message text)
language plpgsql
as $$
declare
  rec record;
  expected_prev text := null;
  expected_hash text;
  canonical text;
begin
  for rec in select * from ledger_entries order by seq asc loop
    if rec.prev_hash is distinct from expected_prev then
      return query select false, rec.seq, rec.id,
        format('prev_hash mismatch at seq %s: expected %s, found %s',
               rec.seq, coalesce(expected_prev, 'NULL'), coalesce(rec.prev_hash, 'NULL'));
      return;
    end if;

    canonical := coalesce(rec.id::text, '') || '|' ||
                 coalesce(rec.loan_id::text, '') || '|' ||
                 rec.entry_type::text || '|' ||
                 rec.amount_paise::text || '|' ||
                 coalesce(rec.reference_payment_id::text, '') || '|' ||
                 coalesce(rec.created_by::text, '') || '|' ||
                 rec.created_at::text;

    expected_hash := encode(digest(convert_to(coalesce(expected_prev, '') || canonical, 'UTF8'), 'sha256'), 'hex');

    if expected_hash <> rec.hash then
      return query select false, rec.seq, rec.id,
        format('hash mismatch at seq %s: row data does not match stored hash', rec.seq);
      return;
    end if;

    expected_prev := rec.hash;
  end loop;

  return query select true, null::bigint, null::uuid, 'chain intact'::text;
end;
$$;
