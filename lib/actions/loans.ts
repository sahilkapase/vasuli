"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser, assertRole } from "@/lib/auth";
import { loanSchema, type LoanInput } from "@/lib/validation";
import { rupeesToPaiseWhole } from "@/lib/money";
import type { ActionResult } from "@/lib/actions/borrowers";

export async function createLoan(input: LoanInput): Promise<ActionResult> {
  const user = await requireUser();
  assertRole(user, ["owner", "collector"]);

  const parsed = loanSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;
  const principalPaise = rupeesToPaiseWhole(v.principalRupees);
  const penaltyType = v.penaltyType === "NONE" ? "NONE" : v.penaltyType;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_loan", {
    p_borrower_id: v.borrowerId,
    p_principal_paise: principalPaise.toString(),
    p_rate_percent: v.ratePercent,
    p_interest_type: v.interestType,
    p_period_days: v.periodDays,
    p_start_date: v.startDate,
    p_penalty_type: penaltyType,
    p_penalty_value: penaltyType === "NONE" ? null : v.penaltyValue ?? null,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/borrowers");
  revalidatePath(`/borrowers/${v.borrowerId}`);
  return { ok: true, id: data as string };
}
