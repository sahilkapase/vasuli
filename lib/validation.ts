import { z } from "zod";

/** Borrower create/edit form. */
export const borrowerSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(120),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  idProofType: z.enum(["AADHAAR", "PAN", "VOTER_ID", "OTHER"]).optional(),
  idProofNumber: z.string().trim().max(50).optional().or(z.literal("")),
  guarantorName: z.string().trim().max(120).optional().or(z.literal("")),
  guarantorPhone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit number")
    .optional()
    .or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type BorrowerInput = z.infer<typeof borrowerSchema>;

/** New loan form. */
export const loanSchema = z.object({
  borrowerId: z.string().uuid(),
  principalRupees: z.coerce.number().positive("Principal must be greater than 0"),
  ratePercent: z.coerce
    .number()
    .min(10, "Rate must be at least 10%")
    .max(15, "Rate must be at most 15%"),
  interestType: z.enum(["FLAT", "REDUCING"]),
  periodDays: z.coerce.number().int().min(1, "Period must be at least 1 day"),
  startDate: z.string().min(1, "Start date is required"),
  penaltyType: z.enum(["PERCENT", "FIXED", "NONE"]).default("NONE"),
  penaltyValue: z.coerce.number().nonnegative().optional(),
});
export type LoanInput = z.infer<typeof loanSchema>;

/** Collect payment form. */
export const paymentSchema = z.object({
  loanId: z.string().uuid(),
  amountRupees: z.coerce.number().positive("Amount must be greater than 0"),
  idempotencyKey: z.string().uuid(),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});
export type PaymentInput = z.infer<typeof paymentSchema>;

/** Reverse-payment (owner only). */
export const reversalSchema = z.object({
  paymentId: z.string().uuid(),
  reason: z.string().trim().min(5, "Please provide a reason (min 5 characters)").max(1000),
});
export type ReversalInput = z.infer<typeof reversalSchema>;

/** Settings: allowlist entry. */
export const allowlistSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(["owner", "collector", "viewer"]),
});
export type AllowlistInput = z.infer<typeof allowlistSchema>;

/** Settings: default rate / penalty configuration. */
export const settingsSchema = z.object({
  defaultRatePercent: z.coerce.number().min(10).max(15),
  defaultPenaltyType: z.enum(["PERCENT", "FIXED", "NONE"]),
  defaultPenaltyValue: z.coerce.number().nonnegative().optional(),
});
export type SettingsInput = z.infer<typeof settingsSchema>;

/** Assign a collector to a borrower. */
export const assignmentSchema = z.object({
  borrowerId: z.string().uuid(),
  collectorUserId: z.string().uuid(),
});
export type AssignmentInput = z.infer<typeof assignmentSchema>;
