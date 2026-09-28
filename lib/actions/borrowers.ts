"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser, assertRole } from "@/lib/auth";
import { borrowerSchema, type BorrowerInput } from "@/lib/validation";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export async function createBorrower(input: BorrowerInput): Promise<ActionResult> {
  const user = await requireUser();
  assertRole(user, ["owner", "collector"]);

  const parsed = borrowerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_borrower", {
    p_name: v.name,
    p_phone: v.phone || null,
    p_address: v.address || null,
    p_notes: v.notes || null,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/borrowers");
  return { ok: true, id: data as string };
}

export async function updateBorrower(id: string, input: BorrowerInput): Promise<ActionResult> {
  const user = await requireUser();
  assertRole(user, ["owner", "collector"]);

  const parsed = borrowerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_borrower", {
    p_borrower_id: id,
    p_name: v.name,
    p_phone: v.phone || null,
    p_address: v.address || null,
    p_notes: v.notes || null,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/borrowers");
  revalidatePath(`/borrowers/${id}`);
  return { ok: true, id };
}

export async function assignCollector(borrowerId: string, collectorUserId: string | null): Promise<ActionResult> {
  const user = await requireUser();
  assertRole(user, ["owner"]);

  const supabase = await createClient();
  const { error } = await supabase
    .from("borrowers")
    .update({ assigned_collector_id: collectorUserId })
    .eq("id", borrowerId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/borrowers/${borrowerId}`);
  return { ok: true };
}
