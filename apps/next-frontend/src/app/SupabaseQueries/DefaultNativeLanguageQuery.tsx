import { createClient } from "@/utils/supabase/server"

export async function DefaultNativeLanguageQuery(): Promise<string> {
  const supabaseClient = createClient();

  try {
    const { data, error } = await supabaseClient
      .from('user_data')
      .select('default_native_language')
      .single();

    if (error || !data || !data.default_native_language) {
      throw new Error("Error fetching default native language");
    }

    return data.default_native_language;
  } catch (e) {
    //TODO: remove for production
    console.error("Error in Supabase query:", e);
    throw e; // Rethrow the error after logging it
  }
}
