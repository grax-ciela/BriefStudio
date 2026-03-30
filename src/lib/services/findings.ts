import { createServerClient } from "@/lib/supabase/server";
import type { Finding } from "@/types/finding";

export async function getFindings(): Promise<Finding[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("findings")
    .select("id, company, city, product, moq, quoted_price, photo_url, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch findings: ${error.message}`);
  }

  return data ?? [];
}
