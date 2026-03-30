"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";

export async function createSupplier(formData: FormData) {
  const company_name = formData.get("company_name") as string;
  const country = (formData.get("country") as string) || null;
  const city = (formData.get("city") as string) || null;
  const notes = (formData.get("notes") as string) || null;
  const relationship_status =
    (formData.get("relationship_status") as string) || null;

  if (!company_name?.trim()) {
    return { error: "El nombre de la empresa es requerido." };
  }

  const supabase = createServerClient();

  const { error } = await supabase.from("suppliers").insert({
    company_name: company_name.trim(),
    country: country?.trim() || null,
    city: city?.trim() || null,
    notes: notes?.trim() || null,
    relationship_status,
  });

  if (error) {
    return { error: `Error al crear proveedor: ${error.message}` };
  }

  revalidatePath("/suppliers");
  return { success: true };
}

export async function updateSupplierStatus(
  supplierId: string,
  newStatus: string
) {
  const supabase = createServerClient();

  const { error } = await supabase
    .from("suppliers")
    .update({ relationship_status: newStatus })
    .eq("id", supplierId);

  if (error) {
    return { error: `Error al actualizar estado: ${error.message}` };
  }

  revalidatePath("/suppliers");
  return { success: true };
}

export async function updateSupplier(supplierId: string, formData: FormData) {
  const company_name = formData.get("company_name") as string;
  const country = (formData.get("country") as string) || null;
  const city = (formData.get("city") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  if (!company_name?.trim()) {
    return { error: "El nombre de la empresa es requerido." };
  }

  const supabase = createServerClient();

  const { error } = await supabase
    .from("suppliers")
    .update({
      company_name: company_name.trim(),
      country: country?.trim() || null,
      city: city?.trim() || null,
      notes: notes?.trim() || null,
    })
    .eq("id", supplierId);

  if (error) {
    return { error: `Error al actualizar proveedor: ${error.message}` };
  }

  revalidatePath(`/suppliers/${supplierId}`);
  revalidatePath("/suppliers");
  return { success: true };
}

export async function createSupplierProduct(
  supplierId: string,
  formData: FormData
) {
  const product_name = formData.get("product_name") as string;
  const variants = (formData.get("variants") as string) || null;
  const moq = (formData.get("moq") as string) || null;
  const price = (formData.get("price") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  if (!product_name?.trim()) {
    return { error: "El nombre del producto es requerido." };
  }

  const supabase = createServerClient();

  const { error } = await supabase.from("supplier_products").insert({
    supplier_id: supplierId,
    product_name: product_name.trim(),
    variants: variants?.trim() || null,
    moq: moq?.trim() || null,
    price: price?.trim() || null,
    notes: notes?.trim() || null,
  });

  if (error) {
    return { error: `Error al crear producto: ${error.message}` };
  }

  revalidatePath(`/suppliers/${supplierId}`);
  return { success: true };
}
