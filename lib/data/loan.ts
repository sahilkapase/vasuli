import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getLoanDetail(loanId: string) {
  const supabase = await createClient();
  await supabase.rpc("refresh_all_installments");

  const [{ data: loan }, { data: installments }, { data: payments }, { data: reversals }] = await Promise.all([
    supabase.from("loans").select("*, borrowers(id, name, phone)").eq("id", loanId).single(),
    supabase.from("installments").select("*").eq("loan_id", loanId).order("period_number"),
    supabase.from("payments").select("*").eq("loan_id", loanId).order("created_at", { ascending: false }),
    supabase.from("payment_reversals").select("payment_id, reason, created_at"),
  ]);

  const reversedPaymentIds = new Set((reversals ?? []).map((r) => r.payment_id));

  const totalPenaltyDue = (installments ?? []).reduce(
    (s, i) => s + (BigInt(i.penalty_due_paise) - BigInt(i.penalty_paid_paise)),
    0n
  );
  const totalInterestDue = (installments ?? []).reduce(
    (s, i) => s + (BigInt(i.interest_due_paise) - BigInt(i.interest_paid_paise)),
    0n
  );

  return {
    loan,
    installments: installments ?? [],
    payments: (payments ?? []).map((p) => ({ ...p, reversed: reversedPaymentIds.has(p.id) })),
    totalPenaltyDue,
    totalInterestDue,
  };
}
