/**
 * Payment allocation: every payment is applied in order penalty -> interest -> principal.
 * This mirrors the DB RPC (collect_payment) exactly so the UI preview matches what gets committed.
 * All amounts are integer paise (BigInt).
 */

export interface AllocationInput {
  amountPaise: bigint;
  penaltyDuePaise: bigint;
  interestDuePaise: bigint;
  principalOutstandingPaise: bigint;
}

export interface AllocationResult {
  penaltyPaise: bigint;
  interestPaise: bigint;
  principalPaise: bigint;
  /** Any amount left over after penalty+interest+principal are fully cleared (overpayment). */
  unallocatedPaise: bigint;
}

export function allocatePayment(input: AllocationInput): AllocationResult {
  const { penaltyDuePaise, interestDuePaise, principalOutstandingPaise } = input;
  let remaining = input.amountPaise;
  if (remaining < 0n) throw new Error("Payment amount must be positive");

  const penaltyPaise = min(remaining, max(penaltyDuePaise, 0n));
  remaining -= penaltyPaise;

  const interestPaise = min(remaining, max(interestDuePaise, 0n));
  remaining -= interestPaise;

  const principalPaise = min(remaining, max(principalOutstandingPaise, 0n));
  remaining -= principalPaise;

  return {
    penaltyPaise,
    interestPaise,
    principalPaise,
    unallocatedPaise: remaining,
  };
}

function min(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}
function max(a: bigint, b: bigint): bigint {
  return a > b ? a : b;
}
