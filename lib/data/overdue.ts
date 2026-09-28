import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface OverdueItem {
  loanId: string;
  borrowerName: string;
  borrowerPhone: string | null;
  daysLate: number;
  amountDuePaise: bigint;
}

export async function getOverdueList(): Promise<OverdueItem[]> {
  const supabase = await createClient();
  await supabase.rpc("refresh_all_installments");

  const { data: installments } = await supabase
    .from("installments")
    .select("loan_id, due_date, interest_due_paise, interest_paid_paise, penalty_due_paise, penalty_paid_paise, loans(borrowers(name, phone))")
    .eq("status", "OVERDUE");

  const today = new Date();
  const byLoan = new Map<string, OverdueItem>();

  for (const i of installments ?? []) {
    const due = BigInt(i.interest_due_paise) - BigInt(i.interest_paid_paise) + BigInt(i.penalty_due_paise) - BigInt(i.penalty_paid_paise);
    if (due <= 0n) continue;
    const daysLate = Math.floor((today.getTime() - new Date(i.due_date).getTime()) / 86400000);
    const loan = Array.isArray(i.loans) ? i.loans[0] : i.loans;
    const borrower = loan && (Array.isArray(loan.borrowers) ? loan.borrowers[0] : loan.borrowers);
    if (!borrower) continue;

    const existing = byLoan.get(i.loan_id);
    if (existing) {
      existing.amountDuePaise += due;
      existing.daysLate = Math.max(existing.daysLate, daysLate);
    } else {
      byLoan.set(i.loan_id, {
        loanId: i.loan_id,
        borrowerName: borrower.name,
        borrowerPhone: borrower.phone,
        daysLate,
        amountDuePaise: due,
      });
    }
  }

  return [...byLoan.values()].sort((a, b) => b.daysLate - a.daysLate);
}
