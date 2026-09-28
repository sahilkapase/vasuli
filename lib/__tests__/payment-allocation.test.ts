import { describe, expect, it } from "vitest";
import { allocatePayment } from "@/lib/payment-allocation";

describe("allocatePayment", () => {
  it("allocates in order penalty -> interest -> principal, fully covering all", () => {
    const result = allocatePayment({
      amountPaise: 1000n,
      penaltyDuePaise: 100n,
      interestDuePaise: 300n,
      principalOutstandingPaise: 600n,
    });
    expect(result).toEqual({
      penaltyPaise: 100n,
      interestPaise: 300n,
      principalPaise: 600n,
      unallocatedPaise: 0n,
    });
  });

  it("partially pays penalty only when amount is too small", () => {
    const result = allocatePayment({
      amountPaise: 50n,
      penaltyDuePaise: 100n,
      interestDuePaise: 300n,
      principalOutstandingPaise: 600n,
    });
    expect(result).toEqual({
      penaltyPaise: 50n,
      interestPaise: 0n,
      principalPaise: 0n,
      unallocatedPaise: 0n,
    });
  });

  it("spills over into interest once penalty is cleared", () => {
    const result = allocatePayment({
      amountPaise: 150n,
      penaltyDuePaise: 100n,
      interestDuePaise: 300n,
      principalOutstandingPaise: 600n,
    });
    expect(result).toEqual({
      penaltyPaise: 100n,
      interestPaise: 50n,
      principalPaise: 0n,
      unallocatedPaise: 0n,
    });
  });

  it("leaves unallocatedPaise on overpayment beyond total due", () => {
    const result = allocatePayment({
      amountPaise: 2000n,
      penaltyDuePaise: 0n,
      interestDuePaise: 300n,
      principalOutstandingPaise: 600n,
    });
    expect(result.principalPaise).toBe(600n);
    expect(result.unallocatedPaise).toBe(1100n);
  });

  it("rejects negative amounts", () => {
    expect(() =>
      allocatePayment({
        amountPaise: -1n,
        penaltyDuePaise: 0n,
        interestDuePaise: 0n,
        principalOutstandingPaise: 0n,
      })
    ).toThrow();
  });
});
