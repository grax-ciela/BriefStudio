export const dynamic = "force-dynamic";

import { getSuppliers } from "@/lib/services/suppliers";
import { NewSupplierModal } from "./_components/new-supplier-modal";
import { KanbanBoard } from "./_components/kanban-board";

export default async function SuppliersPage() {
  const suppliers = await getSuppliers();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Suppliers</h1>
        <NewSupplierModal />
      </div>

      <div className="mt-4">
        <KanbanBoard initialSuppliers={suppliers} />
      </div>
    </div>
  );
}
