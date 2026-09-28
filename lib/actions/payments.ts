"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser, assertRole } from "@/lib/auth";
import { paymentSchema, reversalSchema, type PaymentInput, type ReversalInput } from "@/lib/validation";
import { rupeesToPaise } from "@/lib/money";
import type { ActionResult } from "@/lib/actions/borrowers";

export interface CollectPaymentResult extends ActionResult {
  penaltyPaise?: string;
  interestPaise?: string;
  principalPaise?: string;
  loanClosed?: boolean;
}

export async function collectPayment(input: PaymentInput): Promise<CollectPaymentResult> {
  await requireUser(); // role check happens inside the RPC too (defense in depth)

  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;
  const amountPaise = rupeesToPaise(String(v.amountRupees));

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("collect_payment", {
    p_loan_id: v.loanId,
    p_amount_paise: amountPaise.toString(),
    p_idempotency_key: v.idempotencyKey,
    p_note: v.note || null,
  });

  if (error) return { ok: false, error: error.message };
  const row = Array.isArray(data) ? data[0] : data;

  revalidatePath("/overdue");
  revalidatePath("/collect");
  revalidatePath(`/loans/${v.loanId}`);

  return {
    ok: true,
    id: row.payment_id,
    penaltyPaise: row.penalty_allocated_paise,
    interestPaise: row.interest_allocated_paise,
    principalPaise: row.principal_allocated_paise,
    loanClosed: row.loan_closed,
  };
}

export async function reversePayment(input: ReversalInput): Promise<ActionResult> {
  const user = await requireUser();
  assertRole(user, ["owner"]);

  const parsed = reversalSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("reverse_payment", {
    p_payment_id: v.paymentId,
    p_reason: v.reason,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/overdue");
  return { ok: true };
}
