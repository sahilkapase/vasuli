-- Moves borrower create/update off direct RLS-gated table writes and onto the same
-- SECURITY DEFINER RPC pattern already used for loans/payments. If the role check ever
-- fails, the exception now embeds the actual resolved role/uid so it's self-diagnosing
-- instead of a generic "violates row-level security policy" message.

create or replace function create_borrower(
  p_name text,
  p_phone text default null,
  p_address text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  caller_role role_t := current_role_t();
  new_id uuid;
begin
  if caller_role is null or caller_role not in ('owner', 'collector') then
    raise exception 'Forbidden: resolved role=%, uid=%', caller_role, caller;
  end if;

  insert into borrowers (name, phone, address, notes, assigned_collector_id, created_by)
  values (
    p_name, p_phone, p_address, p_notes,
    case when caller_role = 'collector' then caller else null end,
    caller
  )
  returning id into new_id;

  insert into audit_log (user_id, action, entity_type, entity_id, details)
  values (caller, 'create_borrower', 'borrower', new_id, jsonb_build_object('name', p_name));

  return new_id;
end;
$$;

create or replace function update_borrower(
  p_borrower_id uuid,
  p_name text,
  p_phone text default null,
  p_address text default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  caller_role role_t := current_role_t();
  allowed boolean;
begin
  select (caller_role = 'owner' or exists (
    select 1 from borrowers where id = p_borrower_id and assigned_collector_id = caller
  )) into allowed;

  if not coalesce(allowed, false) then
    raise exception 'Forbidden: resolved role=%, uid=%', caller_role, caller;
  end if;

  update borrowers
  set name = p_name, phone = p_phone, address = p_address, notes = p_notes
  where id = p_borrower_id;

  insert into audit_log (user_id, action, entity_type, entity_id, details)
  values (caller, 'update_borrower', 'borrower', p_borrower_id, '{}'::jsonb);
end;
$$;
