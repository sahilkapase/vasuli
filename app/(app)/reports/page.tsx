import { Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPaise } from "@/lib/money";
import { getDailyCollections, getMonthlyCollections } from "@/lib/data/reports";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [daily, monthly] = await Promise.all([getDailyCollections(), getMonthlyCollections()]);

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Reports</h1>
        <Button asChild size="sm" variant="outline">
          <a href="/api/reports/csv" download>
            <Download className="h-4 w-4" /> Export CSV
          </a>
        </Button>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Daily collections</h2>
        <div className="space-y-2">
          {daily.map((d) => (
            <Card key={d.date}>
              <CardContent className="flex items-center justify-between p-3">
                <span>{d.date}</span>
                <span className="font-semibold">
                  {formatPaise(d.totalPaise)} <span className="text-muted-foreground">({d.count})</span>
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Monthly collections</h2>
        <div className="space-y-2">
          {monthly.map((m) => (
            <Card key={m.date}>
              <CardContent className="flex items-center justify-between p-3">
                <span>{m.date}</span>
                <span className="font-semibold">
                  {formatPaise(m.totalPaise)} <span className="text-muted-foreground">({m.count})</span>
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
