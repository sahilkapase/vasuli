import Link from "next/link";
import { Phone, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPaise } from "@/lib/money";
import { getOverdueList } from "@/lib/data/overdue";

export const dynamic = "force-dynamic";

export default async function OverduePage() {
  const items = await getOverdueList();

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">Overdue</h1>
      {items.length === 0 && <p className="text-sm text-muted-foreground">Nothing overdue. 🎉</p>}
      <div className="space-y-2">
        {items.map((item) => (
          <Card key={item.loanId}>
            <CardContent className="flex items-center justify-between p-3">
              <div>
                <Link href={`/loans/${item.loanId}`} className="font-medium hover:underline">
                  {item.borrowerName}
                </Link>
                <div className="flex items-center gap-2">
                  <Badge variant="danger">{item.daysLate}d late</Badge>
                  <span className="text-sm text-muted-foreground">{formatPaise(item.amountDuePaise)}</span>
                </div>
              </div>
              <div className="flex gap-2">
                {item.borrowerPhone && (
                  <>
                    <a href={`tel:${item.borrowerPhone}`} className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary" aria-label="Call">
                      <Phone className="h-5 w-5" />
                    </a>
                    <a
                      href={`https://wa.me/91${item.borrowerPhone}?text=${encodeURIComponent(
                        `Reminder: ${formatPaise(item.amountDuePaise)} is overdue by ${item.daysLate} day(s). Please pay at your earliest convenience.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-white"
                      aria-label="WhatsApp"
                    >
                      <MessageCircle className="h-5 w-5" />
                    </a>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
