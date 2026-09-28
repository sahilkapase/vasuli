export type Role = "owner" | "collector" | "viewer";

export type InterestType = "FLAT" | "REDUCING";
export type PenaltyType = "PERCENT" | "FIXED" | "NONE";
export type LoanStatus = "ACTIVE" | "CLOSED";
export type EntryType =
  | "DISBURSEMENT"
  | "INTEREST_ACCRUAL"
  | "PAYMENT_PENALTY"
  | "PAYMENT_INTEREST"
  | "PAYMENT_PRINCIPAL"
  | "REVERSAL";

