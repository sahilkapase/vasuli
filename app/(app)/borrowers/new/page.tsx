import { BorrowerForm } from "@/components/forms/borrower-form";

export default function NewBorrowerPage() {
  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-bold">Add borrower</h1>
      <BorrowerForm />
    </div>
  );
}
