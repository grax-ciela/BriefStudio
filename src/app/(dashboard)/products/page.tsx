export const dynamic = "force-dynamic";

import { getProducts } from "@/lib/services/products";
import { getSuppliers } from "@/lib/services/suppliers";
import { ProductFormModal } from "./_components/product-form-modal";
import { ProductsTable } from "./_components/products-table";

export default async function ProductsPage() {
  const [products, suppliers] = await Promise.all([
    getProducts(),
    getSuppliers(),
  ]);

  const supplierOptions = suppliers.map((s) => ({
    id: s.id,
    company_name: s.company_name,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fichas técnicas</h1>
        <ProductFormModal suppliers={supplierOptions} />
      </div>
      <ProductsTable products={products} />
    </div>
  );
}
