"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPaise } from "@/lib/money";
import { useTranslation } from "@/lib/hooks/use-locale";

export function DashboardStats({
  totalLentPaise,
  outstandingPrincipalPaise,
  interestDueTodayPaise,
  interestDueThisWeekPaise,
  overdueAmountPaise,
}: {
  totalLentPaise: bigint;
  outstandingPrincipalPaise: bigint;
  interestDueTodayPaise: bigint;
  interestDueThisWeekPaise: bigint;
  overdueAmountPaise: bigint;
}) {
  const { t } = useTranslation();

  const stats = [
    { key: "dashboard.totalLent", value: totalLentPaise },
    { key: "dashboard.outstandingPrincipal", value: outstandingPrincipalPaise },
    { key: "dashboard.interestDueToday", value: interestDueTodayPaise },
    { key: "dashboard.interestDueWeek", value: interestDueThisWeekPaise },
    { key: "dashboard.overdueAmount", value: overdueAmountPaise, danger: true },
  ];

  return (
    <>
      <h1 className="text-xl font-bold">{t("dashboard.title")}</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.key}>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">{t(s.key)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-lg font-bold ${s.danger && s.value > 0n ? "text-red-600" : ""}`}>
                {formatPaise(s.value)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
