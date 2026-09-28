import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface CollectableLoan {
  loanId: string;
  borrowerName: string;
  borrowerPhone: string | null;
  outstandingPrincipalPaise: string;
  interestDuePaise: string;
  penaltyDuePaise: string;
}

export async function getActiveLoansForCollection(): Promise<CollectableLoan[]> {
  const supabase = await createClient();
  await supabase.rpc("refresh_all_installments");

  const { data: loans } = await supabase
    .from("loans")
    .select(
      "id, outstanding_principal_paise, borrowers(name, phone), installments(interest_due_paise, interest_paid_paise, penalty_due_paise, penalty_paid_paise)"
    )
    .eq("status", "ACTIVE");

  return (loans ?? []).map((l) => {
    const interestDue = (l.installments ?? []).reduce(
      (s, i) => s + (BigInt(i.interest_due_paise) - BigInt(i.interest_paid_paise)),
      0n
    );
    const penaltyDue = (l.installments ?? []).reduce(
      (s, i) => s + (BigInt(i.penalty_due_paise) - BigInt(i.penalty_paid_paise)),
      0n
    );
    const borrower = Array.isArray(l.borrowers) ? l.borrowers[0] : l.borrowers;
    return {
      loanId: l.id,
      borrowerName: borrower?.name ?? "",
      borrowerPhone: borrower?.phone ?? "",
      outstandingPrincipalPaise: l.outstanding_principal_paise,
      interestDuePaise: interestDue.toString(),
      penaltyDuePaise: penaltyDue.toString(),
    };
  });
}
