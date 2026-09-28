-- Backfills/updates public.users whenever allowed_emails changes, covering the case where
-- someone signed in with Google *before* being allowlisted: auth.users already has their row
-- (created during the OAuth exchange, ahead of our app-level allowlist check), but the
-- INSERT-on-auth.users trigger only fires once and had nothing to match at that time, so no
-- public.users profile ever got created for them. This trigger catches that retroactively.

create or replace function sync_user_from_allowlist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_auth_id uuid;
begin
  select id into matched_auth_id from auth.users where email = new.email;

  if matched_auth_id is not null then
    insert into users (id, email, role)
    values (matched_auth_id, new.email, new.role)
    on conflict (id) do update set role = excluded.role;
  end if;

  return new;
end;
$$;

create trigger on_allowed_email_upsert
  after insert or update on allowed_emails
  for each row execute function sync_user_from_allowlist();
