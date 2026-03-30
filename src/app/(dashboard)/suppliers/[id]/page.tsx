export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupplier, getSupplierProducts } from "@/lib/services/suppliers";
import { SupplierInfoForm } from "./_components/supplier-info-form";
import { ProductForm } from "./_components/product-form";
import { ProductsList } from "./_components/products-list";

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [supplier, products] = await Promise.all([
    getSupplier(id),
    getSupplierProducts(id),
  ]);

  if (!supplier) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/suppliers"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Suppliers
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-2xl font-bold">{supplier.company_name}</h1>
      </div>

      <SupplierInfoForm supplier={supplier} />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">
          Productos ({products.length})
        </h2>
        <ProductForm supplierId={supplier.id} />
        <ProductsList products={products} />
      </div>
    </div>
  );
}
