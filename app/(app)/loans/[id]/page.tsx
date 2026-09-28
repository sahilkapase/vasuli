import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getLoanDetail } from "@/lib/data/loan";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatPaise } from "@/lib/money";
import { ReversePaymentDialog } from "@/components/forms/reverse-payment-dialog";

export const dynamic = "force-dynamic";

export default async function LoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const { loan, installments, payments, totalPenaltyDue, totalInterestDue } = await getLoanDetail(id);
  if (!loan) notFound();

  const hasOverdue = installments.some((i) => i.status === "OVERDUE");
  const statusKind = loan.status === "CLOSED" ? "CLOSED" : hasOverdue ? "OVERDUE" : "ACTIVE";

  const timeline = [
    ...installments.map((i) => ({
      type: "installment" as const,
      date: i.due_date,
      data: i,
    })),
    ...payments.map((p) => ({
      type: "payment" as const,
      date: p.created_at,
      data: p,
    })),
  ].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{loan.borrowers?.name}</h1>
          <p className="text-sm text-muted-foreground">
            {formatPaise(loan.principal_paise)} @ {loan.rate_percent}% {loan.interest_type} · every {loan.period_days}d
          </p>
        </div>
        <StatusBadge kind={statusKind} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Principal left</p>
            <p className="font-bold">{formatPaise(loan.outstanding_principal_paise)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Interest due</p>
            <p className="font-bold">{formatPaise(totalInterestDue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Penalty due</p>
            <p className="font-bold">{formatPaise(totalPenaltyDue)}</p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-sm font-semibold text-muted-foreground">Timeline</h2>
      <div className="space-y-2">
        {timeline.map((item) =>
          item.type === "installment" ? (
            <Card key={`i-${item.data.id}`}>
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <p className="text-sm font-medium">Period {item.data.period_number} — due {item.data.due_date}</p>
                  <p className="text-xs text-muted-foreground">
                    Interest {formatPaise(item.data.interest_due_paise)}
                    {item.data.penalty_due_paise !== "0" && ` + penalty ${formatPaise(item.data.penalty_due_paise)}`}
                  </p>
                </div>
                <StatusBadge
                  kind={
                    item.data.status === "PAID"
                      ? "CLOSED"
                      : item.data.status === "OVERDUE"
                        ? "OVERDUE"
                        : item.data.status === "PARTIAL"
                          ? "DUE_TODAY"
                          : "ACTIVE"
                  }
                />
              </CardContent>
            </Card>
          ) : (
            <Card key={`p-${item.data.id}`} className={item.data.reversed ? "opacity-60" : undefined}>
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <p className="text-sm font-medium">
                    Payment {formatPaise(item.data.amount_paise)} {item.data.reversed && "(reversed)"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Penalty {formatPaise(item.data.penalty_allocated_paise)} · Interest{" "}
                    {formatPaise(item.data.interest_allocated_paise)} · Principal{" "}
                    {formatPaise(item.data.principal_allocated_paise)}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(item.data.created_at).toLocaleString("en-IN")}</p>
                </div>
                {user.role === "owner" && !item.data.reversed && (
                  <ReversePaymentDialog paymentId={item.data.id} amount={formatPaise(item.data.amount_paise)} />
                )}
              </CardContent>
            </Card>
          )
        )}
      </div>
    </div>
  );
}
