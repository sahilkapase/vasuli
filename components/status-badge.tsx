import { Badge } from "@/components/ui/badge";

export type LoanStatusBadgeKind = "ACTIVE" | "DUE_TODAY" | "OVERDUE" | "CLOSED";

const LABELS: Record<LoanStatusBadgeKind, string> = {
  ACTIVE: "Active",
  DUE_TODAY: "Due today",
  OVERDUE: "Overdue",
  CLOSED: "Closed",
};

const VARIANTS: Record<LoanStatusBadgeKind, "success" | "warning" | "danger" | "muted"> = {
  ACTIVE: "success",
  DUE_TODAY: "warning",
  OVERDUE: "danger",
  CLOSED: "muted",
};

export function StatusBadge({ kind }: { kind: LoanStatusBadgeKind }) {
  return <Badge variant={VARIANTS[kind]}>{LABELS[kind]}</Badge>;
}
