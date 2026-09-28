import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Server client for use in Server Components, Server Actions, and Route Handlers. Uses anon key + user session (RLS enforced). */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component without a response to write to — safe to ignore
            // because middleware refreshes the session on every request.
          }
        },
      },
    }
  );
}
