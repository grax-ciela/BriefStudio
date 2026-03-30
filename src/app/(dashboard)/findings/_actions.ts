"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";

export async function createFinding(formData: FormData) {
  const company = formData.get("company") as string;
  const city = (formData.get("city") as string) || null;
  const product = formData.get("product") as string;
  const moq = (formData.get("moq") as string) || null;
  const quoted_price = (formData.get("quoted_price") as string) || null;
  const photo = formData.get("photo") as File | null;

  if (!company?.trim()) {
    return { error: "La empresa es requerida." };
  }
  if (!product?.trim()) {
    return { error: "El producto es requerido." };
  }

  const supabase = createServerClient();

  let photo_url: string | null = null;

  if (photo && photo.size > 0) {
    const ext = photo.name.split(".").pop() ?? "jpg";
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const filePath = `findings/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("findings")
      .upload(filePath, photo, {
        contentType: photo.type,
        upsert: false,
      });

    if (uploadError) {
      return { error: `Error al subir foto: ${uploadError.message}` };
    }

    const { data: urlData } = supabase.storage
      .from("findings")
      .getPublicUrl(filePath);

    photo_url = urlData.publicUrl;
  }

  const { error } = await supabase.from("findings").insert({
    company: company.trim(),
    city: city?.trim() || null,
    product: product.trim(),
    moq: moq?.trim() || null,
    quoted_price: quoted_price?.trim() || null,
    photo_url,
  });

  if (error) {
    return { error: `Error al crear hallazgo: ${error.message}` };
  }

  revalidatePath("/findings");
  return { success: true };
}
