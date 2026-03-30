export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { getProduct } from "@/lib/services/products";
import { getSuppliers } from "@/lib/services/suppliers";
import { ProductDetailForm } from "./_components/product-detail-form";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [product, suppliers] = await Promise.all([
    getProduct(id),
    getSuppliers(),
  ]);

  if (!product) {
    notFound();
  }

  const supplierOptions = suppliers.map((s) => ({
    id: s.id,
    company_name: s.company_name,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/products"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Fichas técnicas
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-2xl font-bold">{product.name}</h1>
      </div>

      <ProductDetailForm product={product} suppliers={supplierOptions} />
    </div>
  );
}
