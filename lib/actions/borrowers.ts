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
  const { data, error } = await supabase
    .from("borrowers")
    .insert({
      name: v.name,
      phone: v.phone || null,
      address: v.address || null,
      id_proof_type: v.idProofType ?? null,
      id_proof_number: v.idProofNumber || null,
      guarantor_name: v.guarantorName || null,
      guarantor_phone: v.guarantorPhone || null,
      notes: v.notes || null,
      // Collectors default to being assigned their own new borrower; owner can reassign later.
      assigned_collector_id: user.role === "collector" ? user.id : null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/borrowers");
  return { ok: true, id: data.id };
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
  const { error } = await supabase
    .from("borrowers")
    .update({
      name: v.name,
      phone: v.phone || null,
      address: v.address || null,
      id_proof_type: v.idProofType ?? null,
      id_proof_number: v.idProofNumber || null,
      guarantor_name: v.guarantorName || null,
      guarantor_phone: v.guarantorPhone || null,
      notes: v.notes || null,
    })
    .eq("id", id);

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
