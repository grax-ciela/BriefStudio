import { createServerClient } from "@/lib/supabase/server";
import type { Supplier, SupplierProduct } from "@/types/supplier";

export async function getSuppliers(): Promise<Supplier[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("suppliers")
    .select("id, company_name, country, city, notes, relationship_status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch suppliers: ${error.message}`);
  }

  return data ?? [];
}

export async function getSupplier(id: string): Promise<Supplier | null> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("suppliers")
    .select("id, company_name, country, city, notes, relationship_status, created_at")
    .eq("id", id)
    .single();

  if (error) {
    return null;
  }

  return data;
}

export async function getSupplierProducts(
  supplierId: string
): Promise<SupplierProduct[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("supplier_products")
    .select("id, supplier_id, product_name, variants, moq, price, notes, created_at")
    .eq("supplier_id", supplierId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`);
  }

  return data ?? [];
}
