-- Temporary diagnostic: lets a logged-in user see exactly what auth.uid() and
-- current_role_t() resolve to for their own live session, to debug RLS mismatches.
-- Safe to drop later (drop function debug_whoami();).
create or replace function debug_whoami()
returns table (uid uuid, resolved_role role_t)
language sql
stable
as $$
  select auth.uid(), current_role_t();
$$;
