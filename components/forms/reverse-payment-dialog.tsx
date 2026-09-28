"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { reversePayment } from "@/lib/actions/payments";

export function ReversePaymentDialog({ paymentId, amount }: { paymentId: string; amount: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    if (reason.trim().length < 5) {
      toast.error("Please provide a reason (min 5 characters)");
      return;
    }
    startTransition(async () => {
      const result = await reversePayment({ paymentId, reason });
      if (!result.ok) {
        toast.error(result.error ?? "Reversal failed");
        return;
      }
      toast.success("Payment reversed");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Reverse
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reverse payment of {amount}</DialogTitle>
          <DialogDescription>This creates a reversing entry. The original record is never deleted.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="reason">Reason</Label>
          <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. entered by mistake" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isPending}>
            {isPending ? "Reversing..." : "Confirm reversal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
