import { describe, expect, it } from "vitest";
import { periodInterest, rateToHundredths, generateSchedulePreview, calculatePenalty } from "@/lib/interest";

describe("periodInterest", () => {
  it("computes flat interest at 12.5% on 1,00,000 principal", () => {
    // 100000 rupees = 10_000_000 paise; 12.5% -> 1_250_000 paise (₹12,500)
    const interest = periodInterest(10_000_000n, rateToHundredths(12.5));
    expect(interest).toBe(1_250_000n);
  });

  it("rounds half up", () => {
    // 100 paise * 10.5% = 10.5 paise -> rounds to 11
    const interest = periodInterest(100n, rateToHundredths(10.5));
    expect(interest).toBe(11n);
  });

  it("returns 0 for non-positive principal", () => {
    expect(periodInterest(0n, rateToHundredths(12))).toBe(0n);
    expect(periodInterest(-500n, rateToHundredths(12))).toBe(0n);
  });
});

describe("generateSchedulePreview", () => {
  it("produces fixed per-period interest for FLAT-style preview", () => {
    const rows = generateSchedulePreview({
      principalPaise: 10_000_000n,
      rateHundredths: rateToHundredths(10),
      periodDays: 7,
      numPeriods: 3,
    });
    expect(rows).toHaveLength(3);
    expect(rows[0].interestPaise).toBe(1_000_000n);
    expect(rows[2].cumulativeInterestPaise).toBe(3_000_000n);
    expect(rows[1].dayOffset).toBe(14);
  });
});

describe("calculatePenalty", () => {
  it("computes percent penalty on overdue interest", () => {
    const penalty = calculatePenalty({
      overdueInterestPaise: 100_000n,
      penaltyType: "PERCENT",
      penaltyValue: 2,
    });
    expect(penalty).toBe(2_000n);
  });

  it("uses fixed penalty regardless of overdue interest size", () => {
    const penalty = calculatePenalty({
      overdueInterestPaise: 100_000n,
      penaltyType: "FIXED",
      penaltyValue: 5000,
    });
    expect(penalty).toBe(5000n);
  });

  it("returns 0 when there's no overdue interest", () => {
    const penalty = calculatePenalty({ overdueInterestPaise: 0n, penaltyType: "PERCENT", penaltyValue: 2 });
    expect(penalty).toBe(0n);
  });
});
