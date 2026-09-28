"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser, assertRole } from "@/lib/auth";
import { allowlistSchema, settingsSchema, type AllowlistInput, type SettingsInput } from "@/lib/validation";
import type { ActionResult } from "@/lib/actions/borrowers";

export async function addAllowlistEntry(input: AllowlistInput): Promise<ActionResult> {
  const user = await requireUser();
  assertRole(user, ["owner"]);

  const parsed = allowlistSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("allowed_emails").upsert({ email: v.email, role: v.role });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true };
}

export async function removeAllowlistEntry(email: string): Promise<ActionResult> {
  const user = await requireUser();
  assertRole(user, ["owner"]);

  const supabase = await createClient();
  const { error } = await supabase.from("allowed_emails").delete().eq("email", email);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true };
}

export async function changeUserRole(userId: string, role: "owner" | "collector" | "viewer"): Promise<ActionResult> {
  const user = await requireUser();
  assertRole(user, ["owner"]);

  const supabase = await createClient();
  const { error } = await supabase.rpc("change_user_role", { p_user_id: userId, p_role: role });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true };
}

export async function updateSettings(input: SettingsInput): Promise<ActionResult> {
  const user = await requireUser();
  assertRole(user, ["owner"]);

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("app_settings")
    .update({
      default_rate_percent: v.defaultRatePercent,
      default_penalty_type: v.defaultPenaltyType,
      default_penalty_value: v.defaultPenaltyType === "NONE" ? null : v.defaultPenaltyValue ?? null,
    })
    .eq("id", 1);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true };
}
