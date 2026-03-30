"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";

export async function createProduct(formData: FormData) {
  const name = formData.get("name") as string;
  const supplier_id = (formData.get("supplier_id") as string) || null;
  const materials = (formData.get("materials") as string) || null;
  const dimensions = (formData.get("dimensions") as string) || null;
  const variants = (formData.get("variants") as string) || null;
  const packaging = (formData.get("packaging") as string) || null;
  const moq = (formData.get("moq") as string) || null;
  const cost = (formData.get("cost") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  if (!name?.trim()) {
    return { error: "El nombre del producto es requerido." };
  }

  const supabase = createServerClient();

  const { error } = await supabase.from("products").insert({
    name: name.trim(),
    supplier_id: supplier_id || null,
    materials: materials?.trim() || null,
    dimensions: dimensions?.trim() || null,
    variants: variants?.trim() || null,
    packaging: packaging?.trim() || null,
    moq: moq?.trim() || null,
    cost: cost?.trim() || null,
    notes: notes?.trim() || null,
  });

  if (error) {
    return { error: `Error al crear producto: ${error.message}` };
  }

  revalidatePath("/products");
  return { success: true };
}

export async function updateProduct(productId: string, formData: FormData) {
  const name = formData.get("name") as string;
  const supplier_id = (formData.get("supplier_id") as string) || null;
  const materials = (formData.get("materials") as string) || null;
  const dimensions = (formData.get("dimensions") as string) || null;
  const variants = (formData.get("variants") as string) || null;
  const packaging = (formData.get("packaging") as string) || null;
  const moq = (formData.get("moq") as string) || null;
  const cost = (formData.get("cost") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  if (!name?.trim()) {
    return { error: "El nombre del producto es requerido." };
  }

  const supabase = createServerClient();

  const { error } = await supabase
    .from("products")
    .update({
      name: name.trim(),
      supplier_id: supplier_id || null,
      materials: materials?.trim() || null,
      dimensions: dimensions?.trim() || null,
      variants: variants?.trim() || null,
      packaging: packaging?.trim() || null,
      moq: moq?.trim() || null,
      cost: cost?.trim() || null,
      notes: notes?.trim() || null,
    })
    .eq("id", productId);

  if (error) {
    return { error: `Error al actualizar producto: ${error.message}` };
  }

  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
  return { success: true };
}
