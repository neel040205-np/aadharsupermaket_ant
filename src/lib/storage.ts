import { supabase } from "@/integrations/supabase/client";

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export async function uploadProductImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("product-images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data, error: sErr } = await supabase.storage
    .from("product-images")
    .createSignedUrl(path, TEN_YEARS);
  if (sErr || !data) throw sErr ?? new Error("Failed to sign URL");
  return data.signedUrl;
}
