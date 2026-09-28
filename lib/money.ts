/**
 * Money is always stored/passed as BIGINT paise (integer). Never use floats for money.
 * These helpers convert paise <-> rupees only for display/input parsing.
 */

/** Format paise as Indian-formatted rupee string, e.g. 12500000 -> "₹1,25,000". */
export function formatPaise(paise: number | bigint, opts?: { showDecimals?: boolean }): string {
  const p = typeof paise === "bigint" ? paise : BigInt(Math.round(paise));
  const negative = p < 0n;
  const abs = negative ? -p : p;
  const rupees = abs / 100n;
  const paiseRemainder = abs % 100n;

  const rupeeStr = indianGroup(rupees.toString());
  const decimals = opts?.showDecimals
    ? "." + paiseRemainder.toString().padStart(2, "0")
    : "";

  return `${negative ? "-" : ""}₹${rupeeStr}${decimals}`;
}

/** Indian digit grouping: last 3 digits, then groups of 2. "1250000" -> "12,50,000" */
function indianGroup(digits: string): string {
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${grouped},${last3}`;
}

/** Parse a rupee input string (e.g. "1,25,000.50" or "125000") into integer paise. Throws on invalid input. */
export function rupeesToPaise(input: string): bigint {
  const cleaned = input.replace(/,/g, "").trim();
  if (cleaned === "" || !/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new Error(`Invalid rupee amount: "${input}"`);
  }
  const [rupeePart, paisePart = ""] = cleaned.split(".");
  const paisePadded = (paisePart + "00").slice(0, 2);
  return BigInt(rupeePart) * 100n + BigInt(paisePadded || "0");
}

/** Convert integer paise to a rupee number (for form defaults only, never for arithmetic). */
export function paiseToRupeeNumber(paise: number | bigint): number {
  const p = typeof paise === "bigint" ? paise : BigInt(Math.round(paise));
  return Number(p) / 100;
}

/** Whole-rupee integer paise input (used for principal / amount forms that don't need paise precision). */
export function rupeesToPaiseWhole(rupees: number): bigint {
  if (!Number.isFinite(rupees) || rupees < 0) throw new Error("Invalid rupee amount");
  return BigInt(Math.round(rupees * 100));
}
