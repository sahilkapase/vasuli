import Link from "next/link";
import { Phone, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatPaise } from "@/lib/money";
import { getDashboardData } from "@/lib/data/dashboard";
import { DashboardStats } from "@/components/dashboard-stats";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6 p-4">
      <DashboardStats
        totalLentPaise={data.totalLentPaise}
        outstandingPrincipalPaise={data.outstandingPrincipalPaise}
        interestDueTodayPaise={data.interestDueTodayPaise}
        interestDueThisWeekPaise={data.interestDueThisWeekPaise}
        overdueAmountPaise={data.overdueAmountPaise}
      />

      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Today&apos;s collection list</h2>
        {data.todaysCollections.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing due today.</p>
        ) : (
          <div className="space-y-2">
            {data.todaysCollections.map((c) => (
              <Card key={c.loanId}>
                <CardContent className="flex items-center justify-between p-3">
                  <div>
                    <Link href={`/loans/${c.loanId}`} className="font-medium hover:underline">
                      {c.borrowerName}
                    </Link>
                    <p className="text-sm text-muted-foreground">{formatPaise(c.duePaise)} due</p>
                  </div>
                  <div className="flex gap-2">
                    {c.borrowerPhone && (
                      <>
                        <a
                          href={`tel:${c.borrowerPhone}`}
                          className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary"
                          aria-label="Call"
                        >
                          <Phone className="h-5 w-5" />
                        </a>
                        <a
                          href={`https://wa.me/91${c.borrowerPhone}`}
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
        )}
      </div>
    </div>
  );
}
