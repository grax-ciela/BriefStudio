import { createServerClient } from "@/lib/supabase/server";
import type { Product } from "@/types/product";

export async function getProducts(): Promise<Product[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, supplier_id, materials, dimensions, variants, packaging, moq, cost, notes, created_at, suppliers(company_name)"
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`);
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    name: row.name as string,
    supplier_id: row.supplier_id as string | null,
    supplier_name:
      (row.suppliers as { company_name: string } | null)?.company_name ?? null,
    materials: row.materials as string | null,
    dimensions: row.dimensions as string | null,
    variants: row.variants as string | null,
    packaging: row.packaging as string | null,
    moq: row.moq as string | null,
    cost: row.cost as string | null,
    notes: row.notes as string | null,
    created_at: row.created_at as string,
  }));
}

export async function getProduct(id: string): Promise<Product | null> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, supplier_id, materials, dimensions, variants, packaging, moq, cost, notes, created_at, suppliers(company_name)"
    )
    .eq("id", id)
    .single();

  if (error) {
    return null;
  }

  const row = data as Record<string, unknown>;
  return {
    id: row.id as string,
    name: row.name as string,
    supplier_id: row.supplier_id as string | null,
    supplier_name:
      (row.suppliers as { company_name: string } | null)?.company_name ?? null,
    materials: row.materials as string | null,
    dimensions: row.dimensions as string | null,
    variants: row.variants as string | null,
    packaging: row.packaging as string | null,
    moq: row.moq as string | null,
    cost: row.cost as string | null,
    notes: row.notes as string | null,
    created_at: row.created_at as string,
  };
}
