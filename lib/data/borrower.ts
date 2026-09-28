import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getBorrowerProfile(borrowerId: string) {
  const supabase = await createClient();
  // No refresh_all_installments() call here — see lib/data/dashboard.ts for why.

  const [{ data: borrower }, { data: loans }] = await Promise.all([
    supabase.from("borrowers").select("*").eq("id", borrowerId).single(),
    supabase
      .from("loans")
      .select(
        "id, principal_paise, rate_percent, interest_type, period_days, start_date, status, outstanding_principal_paise, created_at, installments(interest_due_paise, penalty_due_paise, interest_paid_paise, penalty_paid_paise, status)"
      )
      .eq("borrower_id", borrowerId)
      .order("created_at", { ascending: false }),
  ]);

  let totalOwedPaise = 0n;
  const loansWithDue = (loans ?? []).map((l) => {
    const dueFromInstallments = (l.installments ?? []).reduce(
      (sum, i) =>
        sum +
        (BigInt(i.interest_due_paise) - BigInt(i.interest_paid_paise)) +
        (BigInt(i.penalty_due_paise) - BigInt(i.penalty_paid_paise)),
      0n
    );
    const owed = l.status === "ACTIVE" ? BigInt(l.outstanding_principal_paise) + dueFromInstallments : 0n;
    totalOwedPaise += owed;
    const hasOverdue = (l.installments ?? []).some((i) => i.status === "OVERDUE");
    return { ...l, owedPaise: owed, hasOverdue };
  });

  return { borrower, loans: loansWithDue, totalOwedPaise };
}
