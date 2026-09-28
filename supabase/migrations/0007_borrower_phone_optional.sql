-- Only the borrower's name is required now; phone becomes optional (guarantor/ID proof were
-- already optional). Existing rows keep their phone values; the format check still applies
-- when a phone is provided.
alter table borrowers alter column phone drop not null;
alter table borrowers drop constraint borrowers_phone_check;
alter table borrowers add constraint borrowers_phone_check
  check (phone is null or phone ~ '^[6-9]\d{9}$');
