import { notFound } from "next/navigation";
import { BorrowerForm } from "@/components/forms/borrower-form";
import { createClient } from "@/lib/supabase/server";

export default async function EditBorrowerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: borrower } = await supabase.from("borrowers").select("*").eq("id", id).single();
  if (!borrower) notFound();

  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-bold">Edit borrower</h1>
      <BorrowerForm
        borrowerId={id}
        defaultValues={{
          name: borrower.name,
          phone: borrower.phone ?? "",
          address: borrower.address ?? "",
          notes: borrower.notes ?? "",
        }}
      />
    </div>
  );
}
