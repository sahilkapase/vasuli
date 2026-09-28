import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface CollectionSummary {
  date: string;
  totalPaise: bigint;
  count: number;
}

export async function getDailyCollections(days = 30): Promise<CollectionSummary[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data } = await supabase
    .from("payments")
    .select("amount_paise, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  const byDate = new Map<string, CollectionSummary>();
  for (const p of data ?? []) {
    const date = p.created_at.slice(0, 10);
    const existing = byDate.get(date);
    if (existing) {
      existing.totalPaise += BigInt(p.amount_paise);
      existing.count += 1;
    } else {
      byDate.set(date, { date, totalPaise: BigInt(p.amount_paise), count: 1 });
    }
  }
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getMonthlyCollections(months = 12): Promise<CollectionSummary[]> {
  const supabase = await createClient();
  const since = new Date();
  since.setMonth(since.getMonth() - months);
  const { data } = await supabase
    .from("payments")
    .select("amount_paise, created_at")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false });

  const byMonth = new Map<string, CollectionSummary>();
  for (const p of data ?? []) {
    const month = p.created_at.slice(0, 7);
    const existing = byMonth.get(month);
    if (existing) {
      existing.totalPaise += BigInt(p.amount_paise);
      existing.count += 1;
    } else {
      byMonth.set(month, { date: month, totalPaise: BigInt(p.amount_paise), count: 1 });
    }
  }
  return [...byMonth.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
}
