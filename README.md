# Vasuli

Mobile-first money-lending record system. Next.js (App Router, TypeScript) + Tailwind CSS +
hand-built shadcn-style components + Supabase (Postgres + Auth) + Zod.

## Architecture

- **Money**: every amount is a `BIGINT` of paise, passed around the app as `bigint`. No floats,
  ever. See [lib/money.ts](lib/money.ts) for paise↔rupee helpers and Indian digit grouping.
- **Interest**: [lib/interest.ts](lib/interest.ts) computes FLAT/REDUCING interest and schedule
  previews with integer-only math (rate stored as hundredths-of-a-percent internally).
- **Allocation**: [lib/payment-allocation.ts](lib/payment-allocation.ts) mirrors the DB's
  `collect_payment` RPC exactly (penalty → interest → principal) so the UI preview always matches
  what gets committed.
- **Writes go through Postgres, not the app**: `payments`, `ledger_entries`, `payment_reversals`,
  and `payment_installment_allocations` are append-only (triggers block UPDATE/DELETE/TRUNCATE)
  and have **no RLS insert policy for normal roles** — the only way to write to them is the
  `SECURITY DEFINER` RPCs (`collect_payment`, `reverse_payment`, `create_loan`), which run
  inside a single transaction, lock the loan row, and write the audit trail. This makes "one RPC,
  one transaction" an architectural guarantee, not a convention the app code has to honor.
- **Hash chain**: every `ledger_entries` row stores `prev_hash` and a `sha256(prev_hash || row)`
  hash computed in a trigger ([0003_hash_chain.sql](supabase/migrations/0003_hash_chain.sql)).
  `verify_ledger_chain()` walks the whole chain and returns pass/fail + the first broken row;
  wired up to an owner-only "Verify data integrity" button at `/integrity`.
- **Auth**: Google OAuth via Supabase. `middleware.ts` refreshes the session on every request and
  redirects any authenticated-but-unlisted account back to `/login?error=not_allowlisted`. A
  Postgres trigger on `auth.users` only creates a `public.users` row (with a role) for emails
  present in `allowed_emails` — so an unlisted Google account simply has no profile and every
  RLS policy that joins through `users` denies it by construction.
- **Roles**: `owner` / `collector` / `viewer`, enforced by Postgres RLS policies (see
  [0004_rls_policies.sql](supabase/migrations/0004_rls_policies.sql)), not just hidden UI.

### Assumptions made

- No fixed loan "term" — a loan is open-ended until principal + all due interest/penalty is
  paid off. Installments are generated lazily per elapsed period (`generate_due_installments`),
  not pre-scheduled for a fixed number of periods.
- REDUCING interest for a not-yet-elapsed period is priced off whatever `outstanding_principal_paise`
  is *at the moment that installment is generated* — it isn't retroactively re-priced if a
  principal payment lands mid-period after the row already exists. This is called out in
  `generate_due_installments`'s SQL comment along with the upgrade path (snapshot principal
  history) if exact historical re-pricing is ever needed.
- A payment can't exceed total payable (penalty + interest due + outstanding principal) —
  `collect_payment` rejects overpayment rather than silently banking a credit balance.
- First owner account is bootstrapped by hand (insert into `allowed_emails`) after they sign in
  once — see [Setup](#setup) below.

## Project structure

```
app/
  login/                     Public: Google sign-in
  auth/callback/             OAuth code exchange + login audit
  (app)/                     Authenticated shell (sidebar/bottom tabs, requireUser())
    page.tsx                 Dashboard
    borrowers/                Borrowers list, new, [id] profile, [id]/edit
    loans/new, loans/[id]     New loan (with schedule preview) & loan detail/timeline
    collect/                  3-tap collect payment flow
    overdue/                  Overdue list with call/WhatsApp links
    reports/                  Daily/monthly collections + CSV export
    settings/                 Owner-only: allowlist, roles, defaults
    integrity/                Owner-only: verify_ledger_chain button
    more/                     Mobile-only nav destination
  api/reports/csv/           CSV export route handler
components/
  ui/                        Hand-built shadcn-style primitives (button, card, dialog, ...)
  forms/                     Feature forms (borrower, loan, collect flow, settings, reversal)
  nav/                       Bottom tab bar (mobile), sidebar (desktop), header
lib/
  supabase/                  Browser + server Supabase clients
  actions/                   "use server" mutations (Zod-validated, call RPCs)
  data/                      Server-only read helpers for each page
  money.ts, interest.ts, payment-allocation.ts, validation.ts, auth.ts
supabase/migrations/         0001 schema → 0006 seed (see below)
middleware.ts                Session refresh + allowlist gate
```

## SQL migrations

Run in order from [supabase/migrations](supabase/migrations):

1. `0001_schema.sql` — tables, enums, checks, the `auth.users` → `public.users` provisioning trigger
2. `0002_append_only_triggers.sql` — blocks UPDATE/DELETE/TRUNCATE on ledger/payment tables
3. `0003_hash_chain.sql` — hash-chain trigger + `verify_ledger_chain()`
4. `0004_rls_policies.sql` — row-level security for every table
5. `0005_functions_rpc.sql` — `collect_payment`, `reverse_payment`, `create_loan`,
   `generate_due_installments`, `refresh_all_installments`, `log_login`, `change_user_role`
6. `0006_seed.sql` — default `app_settings` row

## Setup

1. **Create a Supabase project** at supabase.com.
2. **Run the migrations**: `supabase link --project-ref <ref>` then
   `supabase db push` (or paste each file into the SQL editor in order 0001→0006).
3. **Configure Google OAuth**: Supabase dashboard → Authentication → Providers → Google. Add your
   Google OAuth client ID/secret, and set the redirect URL to
   `https://<your-project>.supabase.co/auth/v1/callback`. Add your app's own callback
   (`https://<your-domain>/auth/callback` and `http://localhost:3000/auth/callback` for dev) as
   authorized redirect URIs on the Google Cloud OAuth client.
4. **Allowlist yourself as owner** (do this *before* your first login — the provisioning trigger
   only fires on new `auth.users` rows, i.e. the moment you first sign in):
   ```sql
   insert into allowed_emails (email, role) values ('you@example.com', 'owner');
   ```
5. **Copy `.env.example` to `.env.local`** and fill in `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` from Supabase → Settings → API.
6. **Install and run**:
   ```bash
   npm install
   npm run dev
   ```
7. Sign in with Google at `http://localhost:3000/login`.

## Tests

```bash
npm test
```

Unit tests cover interest calculation (FLAT rounding, schedule preview, penalties) and payment
allocation (penalty → interest → principal ordering, partial payments, overpayment rejection).

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import it in Vercel, set the same env vars from `.env.local` in the Vercel project settings.
3. Add your production domain's `/auth/callback` URL to the Google OAuth client's authorized
   redirect URIs.
4. Deploy. Supabase migrations are applied independently via the Supabase CLI/dashboard, not by
   the Vercel build.

## PWA

`public/manifest.json` + `public/sw.js` make the app installable; the service worker only caches
static assets (network-first) and never intercepts non-GET requests — payments are never queued
offline, the Collect flow shows an explicit "no connection" state instead
([lib/hooks/use-online.ts](lib/hooks/use-online.ts)). Icons are SVG
([public/icons](public/icons)) with a `favicon.ico` fallback for browsers that don't support SVG
manifest icons — swap in real 192×192/512×512 PNGs for the most compatible install prompt across
all platforms.

## i18n (English + Hindi/Marathi scaffold)

[lib/i18n.ts](lib/i18n.ts) holds a `dictionaries` map (`en`/`hi`/`mr`) and
[lib/hooks/use-locale.tsx](lib/hooks/use-locale.tsx) provides a `useTranslation()` hook backed by
`localStorage`. A language switcher lives in the header. Only nav labels and the dashboard stat
titles are wired up so far — the rest of the app's copy is still English-only strings in JSX.
Extending a page: add the string to all three locale objects in `lib/i18n.ts`, then swap the
hardcoded text for `t("your.key")` (see [components/dashboard-stats.tsx](components/dashboard-stats.tsx)
for the pattern — split server pages that need translated text into a small client subcomponent).
