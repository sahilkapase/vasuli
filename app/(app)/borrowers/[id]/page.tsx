import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatPaise } from "@/lib/money";
import { getBorrowerProfile } from "@/lib/data/borrower";

export const dynamic = "force-dynamic";

export default async function BorrowerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { borrower, loans, totalOwedPaise } = await getBorrowerProfile(id);
  if (!borrower) notFound();

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{borrower.name}</h1>
          {borrower.phone && <p className="text-sm text-muted-foreground">{borrower.phone}</p>}
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/borrowers/${id}/edit`}>Edit</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total owed</p>
          <p className="text-2xl font-bold">{formatPaise(totalOwedPaise)}</p>
        </CardContent>
      </Card>

      {borrower.address && <p className="text-sm text-muted-foreground">{borrower.address}</p>}
      {borrower.guarantor_name && (
        <p className="text-sm text-muted-foreground">
          Guarantor: {borrower.guarantor_name} {borrower.guarantor_phone && `(${borrower.guarantor_phone})`}
        </p>
      )}
      {borrower.notes && <p className="text-sm text-muted-foreground">Notes: {borrower.notes}</p>}

      <div className="flex items-center justify-between pt-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Loans</h2>
        <Button asChild size="sm">
          <Link href={`/loans/new?borrowerId=${id}`}>
            <Plus className="h-4 w-4" /> New loan
          </Link>
        </Button>
      </div>

      <div className="space-y-2">
        {loans.map((l) => (
          <Link key={l.id} href={`/loans/${l.id}`}>
            <Card>
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <p className="font-medium">{formatPaise(l.principal_paise)} @ {l.rate_percent}%</p>
                  <p className="text-sm text-muted-foreground">
                    {l.interest_type} · every {l.period_days}d
                  </p>
                </div>
                <StatusBadge kind={l.status === "CLOSED" ? "CLOSED" : l.hasOverdue ? "OVERDUE" : "ACTIVE"} />
              </CardContent>
            </Card>
          </Link>
        ))}
        {loans.length === 0 && <p className="text-sm text-muted-foreground">No loans yet.</p>}
      </div>
    </div>
  );
}
