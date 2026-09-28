import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Role } from "./supabase/types";

export interface CurrentUser {
  id: string;
  email: string;
  role: Role;
}

/** Verifies the session server-side and loads the user's role from `public.users`. Redirects to /login if absent. */
export async function requireUser(): Promise<CurrentUser> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, email, role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // Session valid but not provisioned/allowlisted — middleware should have blocked this already.
    redirect("/login?error=not_allowlisted");
  }

  return { id: profile.id, email: profile.email, role: profile.role };
}

/** Throws if the current user's role isn't in `roles`. Use inside server actions for defense in depth (RLS is the real gate). */
export function assertRole(user: CurrentUser, roles: Role[]) {
  if (!roles.includes(user.role)) {
    throw new Error("Forbidden: insufficient role");
  }
}
