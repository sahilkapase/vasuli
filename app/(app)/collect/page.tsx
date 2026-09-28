import { getActiveLoansForCollection } from "@/lib/data/collect";
import { CollectFlow } from "@/components/forms/collect-flow";

export const dynamic = "force-dynamic";

export default async function CollectPage() {
  const loans = await getActiveLoansForCollection();
  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-bold">Collect payment</h1>
      <CollectFlow loans={loans} />
    </div>
  );
}
