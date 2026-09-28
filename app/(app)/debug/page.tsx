import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Temporary diagnostic page — safe to delete once the RLS mismatch is resolved.
export default async function DebugWhoamiPage() {
  const appUser = await requireUser();
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const { data: rpcResult, error: rpcError } = await supabase.rpc("debug_whoami");

  return (
    <div className="space-y-4 p-4 font-mono text-sm">
      <h1 className="text-xl font-bold font-sans">Debug: who am I?</h1>

      <div>
        <p className="font-sans font-semibold">supabase.auth.getUser()</p>
        <pre className="whitespace-pre-wrap rounded bg-muted p-2">
          {JSON.stringify({ id: authUser?.id, email: authUser?.email }, null, 2)}
        </pre>
      </div>

      <div>
        <p className="font-sans font-semibold">requireUser() (reads public.users)</p>
        <pre className="whitespace-pre-wrap rounded bg-muted p-2">{JSON.stringify(appUser, null, 2)}</pre>
      </div>

      <div>
        <p className="font-sans font-semibold">rpc(&quot;debug_whoami&quot;) — auth.uid() + current_role_t() as seen by Postgres/RLS</p>
        <pre className="whitespace-pre-wrap rounded bg-muted p-2">
          {JSON.stringify({ rpcResult, rpcError: rpcError?.message }, null, 2)}
        </pre>
      </div>
    </div>
  );
}
