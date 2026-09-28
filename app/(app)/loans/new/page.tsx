import { createClient } from "@/lib/supabase/server";
import { LoanForm } from "@/components/forms/loan-form";

export default async function NewLoanPage({
  searchParams,
}: {
  searchParams: Promise<{ borrowerId?: string }>;
}) {
  const { borrowerId } = await searchParams;
  const supabase = await createClient();
  const [{ data: borrowers }, { data: settings }] = await Promise.all([
    supabase.from("borrowers").select("id, name, phone").order("name"),
    supabase.from("app_settings").select("*").eq("id", 1).single(),
  ]);

  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-bold">New loan</h1>
      <LoanForm
        borrowers={borrowers ?? []}
        defaultBorrowerId={borrowerId}
        defaultRatePercent={settings ? Number(settings.default_rate_percent) : 12.5}
        defaultPenaltyType={settings?.default_penalty_type ?? "NONE"}
        defaultPenaltyValue={settings?.default_penalty_value ? Number(settings.default_penalty_value) : undefined}
      />
    </div>
  );
}
