import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function BorrowersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("borrowers").select("id, name, phone").order("name");
  if (q) query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
  const { data: borrowers } = await query;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Borrowers</h1>
        <Button asChild size="sm">
          <Link href="/borrowers/new">
            <Plus className="h-4 w-4" /> Add
          </Link>
        </Button>
      </div>

      <form className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={q} placeholder="Search name or phone" className="pl-9" />
      </form>

      <div className="space-y-2">
        {(borrowers ?? []).map((b) => (
          <Link key={b.id} href={`/borrowers/${b.id}`}>
            <Card>
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <p className="font-medium">{b.name}</p>
                  {b.phone && <p className="text-sm text-muted-foreground">{b.phone}</p>}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {(borrowers ?? []).length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No borrowers found.</p>
        )}
      </div>
    </div>
  );
}
