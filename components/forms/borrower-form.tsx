"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { borrowerSchema, type BorrowerInput } from "@/lib/validation";
import { createBorrower, updateBorrower } from "@/lib/actions/borrowers";

export function BorrowerForm({
  borrowerId,
  defaultValues,
}: {
  borrowerId?: string;
  defaultValues?: Partial<BorrowerInput>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(formData: FormData) {
    const raw = Object.fromEntries(formData.entries());
    const parsed = borrowerSchema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    startTransition(async () => {
      const result = borrowerId
        ? await updateBorrower(borrowerId, parsed.data)
        : await createBorrower(parsed.data);

      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong");
        return;
      }
      toast.success(borrowerId ? "Borrower updated" : "Borrower added");
      router.push(`/borrowers/${result.id ?? borrowerId}`);
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <Field label="Full name" name="name" error={errors.name} defaultValue={defaultValues?.name} required />
      <Field
        label="Phone (optional)"
        name="phone"
        inputMode="numeric"
        error={errors.phone}
        defaultValue={defaultValues?.phone}
      />
      <Field label="Address" name="address" error={errors.address} defaultValue={defaultValues?.address} />
      <Field label="Notes" name="notes" error={errors.notes} defaultValue={defaultValues?.notes} />

      <Button type="submit" className="w-full" size="lg" disabled={isPending}>
        {isPending ? "Saving..." : borrowerId ? "Save changes" : "Add borrower"}
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  error,
  defaultValue,
  required,
  inputMode,
}: {
  label: string;
  name: string;
  error?: string;
  defaultValue?: string;
  required?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue} required={required} inputMode={inputMode} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
