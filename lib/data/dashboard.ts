import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface DashboardData {
  totalLentPaise: bigint;
  outstandingPrincipalPaise: bigint;
  interestDueTodayPaise: bigint;
  interestDueThisWeekPaise: bigint;
  overdueAmountPaise: bigint;
  todaysCollections: Array<{
    loanId: string;
    borrowerName: string;
    borrowerPhone: string | null;
    duePaise: bigint;
  }>;
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();
  await supabase.rpc("refresh_all_installments");

  const [{ data: loans }, { data: installments }] = await Promise.all([
    supabase.from("loans").select("principal_paise, outstanding_principal_paise, status"),
    supabase
      .from("installments")
      .select(
        "id, loan_id, due_date, interest_due_paise, penalty_due_paise, interest_paid_paise, penalty_paid_paise, status, loans(borrower_id, status, borrowers(name, phone))"
      ),
  ]);

  const totalLentPaise = (loans ?? []).reduce((sum, l) => sum + BigInt(l.principal_paise), 0n);
  const outstandingPrincipalPaise = (loans ?? [])
    .filter((l) => l.status === "ACTIVE")
    .reduce((sum, l) => sum + BigInt(l.outstanding_principal_paise), 0n);

  const today = new Date().toISOString().slice(0, 10);
  const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  let interestDueTodayPaise = 0n;
  let interestDueThisWeekPaise = 0n;
  let overdueAmountPaise = 0n;
  const todaysCollections: DashboardData["todaysCollections"] = [];

  for (const inst of installments ?? []) {
    const due = BigInt(inst.interest_due_paise) - BigInt(inst.interest_paid_paise);
    const penDue = BigInt(inst.penalty_due_paise) - BigInt(inst.penalty_paid_paise);
    if (inst.status === "OVERDUE") {
      overdueAmountPaise += due + penDue;
    }
    if (inst.due_date === today && due > 0n) {
      interestDueTodayPaise += due;
      const loan = Array.isArray(inst.loans) ? inst.loans[0] : inst.loans;
      const borrower = loan && (Array.isArray(loan.borrowers) ? loan.borrowers[0] : loan.borrowers);
      if (borrower) {
        todaysCollections.push({
          loanId: inst.loan_id,
          borrowerName: borrower.name,
          borrowerPhone: borrower.phone,
          duePaise: due + penDue,
        });
      }
    }
    if (inst.due_date >= today && inst.due_date <= weekAhead && due > 0n) {
      interestDueThisWeekPaise += due;
    }
  }

  return {
    totalLentPaise,
    outstandingPrincipalPaise,
    interestDueTodayPaise,
    interestDueThisWeekPaise,
    overdueAmountPaise,
    todaysCollections,
  };
}
