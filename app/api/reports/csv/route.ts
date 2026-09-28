import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { paiseToRupeeNumber } from "@/lib/money";

export async function GET() {
  await requireUser(); // any authenticated allowlisted user can export what RLS lets them see

  const supabase = await createClient();
  const { data: payments } = await supabase
    .from("payments")
    .select("id, loan_id, amount_paise, penalty_allocated_paise, interest_allocated_paise, principal_allocated_paise, created_at, loans(borrowers(name, phone))")
    .order("created_at", { ascending: false });

  const header = "date,borrower,phone,amount,penalty,interest,principal\n";
  const rows = (payments ?? [])
    .map((p) => {
      const loan = Array.isArray(p.loans) ? p.loans[0] : p.loans;
      const borrower = loan && (Array.isArray(loan.borrowers) ? loan.borrowers[0] : loan.borrowers);
      return [
        p.created_at,
        borrower?.name ?? "",
        borrower?.phone ?? "",
        paiseToRupeeNumber(BigInt(p.amount_paise)),
        paiseToRupeeNumber(BigInt(p.penalty_allocated_paise)),
        paiseToRupeeNumber(BigInt(p.interest_allocated_paise)),
        paiseToRupeeNumber(BigInt(p.principal_allocated_paise)),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    })
    .join("\n");

  return new NextResponse(header + rows, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="vasuli-collections-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
