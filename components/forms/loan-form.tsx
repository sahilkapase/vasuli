"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { loanSchema } from "@/lib/validation";
import { createLoan } from "@/lib/actions/loans";
import { rupeesToPaiseWhole, formatPaise } from "@/lib/money";
import { rateToHundredths, generateSchedulePreview } from "@/lib/interest";

interface Borrower {
  id: string;
  name: string;
  phone: string | null;
}

export function LoanForm({
  borrowers,
  defaultBorrowerId,
  defaultRatePercent,
  defaultPenaltyType,
  defaultPenaltyValue,
}: {
  borrowers: Borrower[];
  defaultBorrowerId?: string;
  defaultRatePercent: number;
  defaultPenaltyType: "PERCENT" | "FIXED" | "NONE";
  defaultPenaltyValue?: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [borrowerId, setBorrowerId] = useState(defaultBorrowerId ?? "");
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState(String(defaultRatePercent));
  const [interestType, setInterestType] = useState<"FLAT" | "REDUCING">("FLAT");
  const [periodDays, setPeriodDays] = useState("30");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [penaltyType, setPenaltyType] = useState<"PERCENT" | "FIXED" | "NONE">(defaultPenaltyType);
  const [penaltyValue, setPenaltyValue] = useState(defaultPenaltyValue ? String(defaultPenaltyValue) : "");

  const preview = useMemo(() => {
    const p = Number(principal);
    const r = Number(rate);
    const days = Number(periodDays);
    if (!p || p <= 0 || !r || !days) return null;
    try {
      const principalPaise = rupeesToPaiseWhole(p);
      return generateSchedulePreview({
        principalPaise,
        rateHundredths: rateToHundredths(r),
        periodDays: days,
        numPeriods: 4,
      });
    } catch {
      return null;
    }
  }, [principal, rate, periodDays]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const raw = {
      borrowerId,
      principalRupees: principal,
      ratePercent: rate,
      interestType,
      periodDays,
      startDate,
      penaltyType,
      penaltyValue: penaltyType === "NONE" ? undefined : penaltyValue,
    };
    const parsed = loanSchema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    startTransition(async () => {
      const result = await createLoan(parsed.data);
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong");
        return;
      }
      toast.success("Loan created");
      router.push(`/loans/${result.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Borrower</Label>
        <Select value={borrowerId} onValueChange={setBorrowerId}>
          <SelectTrigger>
            <SelectValue placeholder="Select borrower" />
          </SelectTrigger>
          <SelectContent>
            {borrowers.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
                {b.phone ? ` (${b.phone})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.borrowerId && <p className="text-xs text-destructive">{errors.borrowerId}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Principal (₹)</Label>
        <Input inputMode="numeric" value={principal} onChange={(e) => setPrincipal(e.target.value)} required />
        {errors.principalRupees && <p className="text-xs text-destructive">{errors.principalRupees}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Rate % (10-15)</Label>
          <Input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} required />
          {errors.ratePercent && <p className="text-xs text-destructive">{errors.ratePercent}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Period (days)</Label>
          <Input inputMode="numeric" value={periodDays} onChange={(e) => setPeriodDays(e.target.value)} required />
          {errors.periodDays && <p className="text-xs text-destructive">{errors.periodDays}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Interest type</Label>
        <Select value={interestType} onValueChange={(v) => setInterestType(v as "FLAT" | "REDUCING")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="FLAT">Flat (on original principal)</SelectItem>
            <SelectItem value="REDUCING">Reducing (on remaining principal)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Start date</Label>
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Late penalty</Label>
          <Select value={penaltyType} onValueChange={(v) => setPenaltyType(v as typeof penaltyType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">None</SelectItem>
              <SelectItem value="PERCENT">Percent</SelectItem>
              <SelectItem value="FIXED">Fixed (₹)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {penaltyType !== "NONE" && (
          <div className="space-y-1.5">
            <Label>{penaltyType === "PERCENT" ? "Penalty %" : "Penalty ₹"}</Label>
            <Input inputMode="decimal" value={penaltyValue} onChange={(e) => setPenaltyValue(e.target.value)} />
          </div>
        )}
      </div>

      {preview && (
        <Card>
          <CardContent className="space-y-1 p-4 text-sm">
            <p className="font-semibold">Schedule preview (first 4 periods)</p>
            {interestType === "REDUCING" && (
              <p className="text-xs text-muted-foreground">
                Estimated assuming no early principal repayment — reducing interest recalculates after each principal payment.
              </p>
            )}
            {preview.map((row) => (
              <div key={row.period} className="flex justify-between">
                <span>
                  Period {row.period} (day {row.dayOffset})
                </span>
                <span>{formatPaise(row.interestPaise)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Button type="submit" className="w-full" size="lg" disabled={isPending}>
        {isPending ? "Creating..." : "Create loan"}
      </Button>
    </form>
  );
}
