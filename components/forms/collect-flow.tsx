"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { WifiOff, Search, ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AmountInput } from "@/components/amount-input";
import { formatPaise, rupeesToPaise } from "@/lib/money";
import { allocatePayment } from "@/lib/payment-allocation";
import { collectPayment } from "@/lib/actions/payments";
import { useOnline } from "@/lib/hooks/use-online";
import type { CollectableLoan } from "@/lib/data/collect";

type Step = "choose" | "amount" | "confirm";

export function CollectFlow({ loans }: { loans: CollectableLoan[] }) {
  const router = useRouter();
  const online = useOnline();
  const [step, setStep] = useState<Step>("choose");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CollectableLoan | null>(null);
  const [amount, setAmount] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(
    () =>
      loans.filter(
        (l) =>
          l.borrowerName.toLowerCase().includes(query.toLowerCase()) ||
          (l.borrowerPhone ?? "").includes(query)
      ),
    [loans, query]
  );

  const allocation = useMemo(() => {
    if (!selected || !amount) return null;
    try {
      const amountPaise = rupeesToPaise(amount);
      return allocatePayment({
        amountPaise,
        penaltyDuePaise: BigInt(selected.penaltyDuePaise),
        interestDuePaise: BigInt(selected.interestDuePaise),
        principalOutstandingPaise: BigInt(selected.outstandingPrincipalPaise),
      });
    } catch {
      return null;
    }
  }, [selected, amount]);

  function selectLoan(loan: CollectableLoan) {
    setSelected(loan);
    setStep("amount");
  }

  function goToConfirm() {
    if (!allocation) {
      toast.error("Enter a valid amount");
      return;
    }
    setIdempotencyKey(crypto.randomUUID());
    setStep("confirm");
  }

  async function confirm() {
    if (!selected || !idempotencyKey) return;
    setSubmitting(true);
    const result = await collectPayment({
      loanId: selected.loanId,
      amountRupees: Number(amount),
      idempotencyKey,
      note: "",
    });
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error ?? "Payment failed");
      return;
    }
    toast.success(result.loanClosed ? "Payment recorded — loan closed!" : "Payment recorded");
    router.push(`/loans/${selected.loanId}`);
    router.refresh();
  }

  if (!online) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center">
        <WifiOff className="h-8 w-8 text-muted-foreground" />
        <p className="font-medium">No connection</p>
        <p className="text-sm text-muted-foreground">
          Payments are never queued offline to avoid duplicates. Reconnect and try again.
        </p>
      </div>
    );
  }

  if (step === "choose") {
    return (
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search borrower" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
        <div className="space-y-2">
          {filtered.map((l) => (
            <Card key={l.loanId} className="cursor-pointer" onClick={() => selectLoan(l)}>
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <p className="font-medium">{l.borrowerName}</p>
                  {l.borrowerPhone && <p className="text-sm text-muted-foreground">{l.borrowerPhone}</p>}
                </div>
                <p className="text-sm font-semibold">
                  {formatPaise(BigInt(l.interestDuePaise) + BigInt(l.penaltyDuePaise))} due
                </p>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No active loans found.</p>}
        </div>
      </div>
    );
  }

  if (step === "amount" && selected) {
    return (
      <div className="space-y-4">
        <button onClick={() => setStep("choose")} className="flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <p className="font-medium">{selected.borrowerName}</p>
        <AmountInput
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
          className="h-16 text-center text-3xl font-bold"
        />
        {allocation && (
          <Card>
            <CardContent className="space-y-1 p-4 text-sm">
              <Row label="Penalty" value={allocation.penaltyPaise} />
              <Row label="Interest" value={allocation.interestPaise} />
              <Row label="Principal" value={allocation.principalPaise} />
              {allocation.unallocatedPaise > 0n && (
                <p className="text-xs text-destructive">Amount exceeds total payable.</p>
              )}
            </CardContent>
          </Card>
        )}
        <Button className="w-full" size="lg" onClick={goToConfirm} disabled={!allocation || allocation.unallocatedPaise > 0n}>
          Continue
        </Button>
      </div>
    );
  }

  if (step === "confirm" && selected && allocation) {
    return (
      <div className="space-y-4">
        <button onClick={() => setStep("amount")} className="flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="text-sm text-muted-foreground">Confirm payment</p>
            <p className="text-2xl font-bold">{formatPaise(rupeesToPaise(amount))}</p>
            <p className="text-sm">from {selected.borrowerName}</p>
            <div className="border-t pt-2 text-sm">
              <Row label="Penalty" value={allocation.penaltyPaise} />
              <Row label="Interest" value={allocation.interestPaise} />
              <Row label="Principal" value={allocation.principalPaise} />
            </div>
          </CardContent>
        </Card>
        <Button className="w-full" size="lg" onClick={confirm} disabled={submitting}>
          {submitting ? "Recording..." : "Confirm & record payment"}
        </Button>
      </div>
    );
  }

  return null;
}

function Row({ label, value }: { label: string; value: bigint }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{formatPaise(value)}</span>
    </div>
  );
}
