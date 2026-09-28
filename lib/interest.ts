/**
 * Interest calculation — all money in integer paise (BigInt), rate in "hundredths of a percent"
 * (e.g. 12.5% -> 1250) so every computation stays integer. Never use floating point for money.
 */

export type InterestType = "FLAT" | "REDUCING";

/** Convert a decimal percentage rate (e.g. 12.5) to integer hundredths-of-percent (1250). */
export function rateToHundredths(ratePercent: number): number {
  return Math.round(ratePercent * 100);
}

/** Round-half-up integer division for BigInt. */
function divRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  const negative = numerator < 0n !== denominator < 0n;
  const n = numerator < 0n ? -numerator : numerator;
  const d = denominator < 0n ? -denominator : denominator;
  const result = (n * 2n + d) / (2n * d);
  return negative ? -result : result;
}

/** Interest for a single period on a given principal, at rateHundredths (e.g. 1250 = 12.5%). */
export function periodInterest(principalPaise: bigint, rateHundredths: number): bigint {
  if (principalPaise <= 0n) return 0n;
  return divRoundHalfUp(principalPaise * BigInt(rateHundredths), 10000n);
}

export interface SchedulePreviewRow {
  period: number;
  /** Days from loan start this period ends. */
  dayOffset: number;
  interestPaise: bigint;
  /** Running total interest across all shown periods. */
  cumulativeInterestPaise: bigint;
}

/**
 * Live schedule preview shown when creating a loan.
 * FLAT: interest is fixed every period on the original principal.
 * REDUCING: interest recalculates on outstanding principal after each collection, so a
 * true future schedule can't be known in advance (partial principal payments are unpredictable).
 * We preview it assuming no principal is repaid early — i.e. same as FLAT until a repayment
 * happens — and label that assumption in the UI.
 */
export function generateSchedulePreview(params: {
  principalPaise: bigint;
  rateHundredths: number;
  periodDays: number;
  numPeriods: number;
}): SchedulePreviewRow[] {
  const { principalPaise, rateHundredths, periodDays, numPeriods } = params;
  const rows: SchedulePreviewRow[] = [];
  let cumulative = 0n;
  for (let i = 1; i <= numPeriods; i++) {
    const interest = periodInterest(principalPaise, rateHundredths);
    cumulative += interest;
    rows.push({
      period: i,
      dayOffset: i * periodDays,
      interestPaise: interest,
      cumulativeInterestPaise: cumulative,
    });
  }
  return rows;
}

/** Fixed or percentage-based late penalty on the overdue interest amount. */
export function calculatePenalty(params: {
  overdueInterestPaise: bigint;
  penaltyType: "PERCENT" | "FIXED" | null;
  penaltyValue: number | null; // percent (hundredths handled by caller) or paise for FIXED
}): bigint {
  const { overdueInterestPaise, penaltyType, penaltyValue } = params;
  if (!penaltyType || penaltyValue == null || overdueInterestPaise <= 0n) return 0n;
  if (penaltyType === "FIXED") return BigInt(Math.round(penaltyValue));
  const hundredths = rateToHundredths(penaltyValue);
  return divRoundHalfUp(overdueInterestPaise * BigInt(hundredths), 10000n);
}
