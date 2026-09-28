-- Moves the expensive "walk every active loan" installment refresh off the request path
-- entirely. Previously several pages called refresh_all_installments() before every render,
-- which repeated the same full-table sweep redundantly on nearly every navigation. Now it
-- runs on a fixed schedule in Postgres instead; collect_payment() still refreshes the single
-- loan being paid inline, so payment accuracy is unaffected — only read-only overview pages
-- (dashboard, overdue, borrower profile) tolerate a few minutes of staleness.

create extension if not exists pg_cron with schema extensions;

select cron.schedule(
  'refresh-installments-every-10-min',
  '*/10 * * * *',
  $$select refresh_all_installments();$$
);
