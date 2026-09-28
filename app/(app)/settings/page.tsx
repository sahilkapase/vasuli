import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AllowlistManager, UserRoleManager, DefaultsForm } from "@/components/forms/settings-forms";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  if (user.role !== "owner") redirect("/");

  const supabase = await createClient();
  const [{ data: allowlist }, { data: users }, { data: settings }] = await Promise.all([
    supabase.from("allowed_emails").select("email, role").order("email"),
    supabase.from("users").select("id, email, role").order("email"),
    supabase.from("app_settings").select("*").eq("id", 1).single(),
  ]);

  return (
    <div className="space-y-8 p-4">
      <h1 className="text-xl font-bold">Settings</h1>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Allowlist</h2>
        <AllowlistManager entries={allowlist ?? []} />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">User roles</h2>
        <UserRoleManager users={users ?? []} />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Defaults</h2>
        <DefaultsForm
          defaultRatePercent={settings ? Number(settings.default_rate_percent) : 12.5}
          defaultPenaltyType={settings?.default_penalty_type ?? "NONE"}
          defaultPenaltyValue={settings?.default_penalty_value ? Number(settings.default_penalty_value) : undefined}
        />
      </section>
    </div>
  );
}
