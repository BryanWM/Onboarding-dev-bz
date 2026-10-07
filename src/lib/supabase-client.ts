import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

const env = import.meta.env as Record<string, string | undefined>;
const supabaseUrl = env["VITE_SUPABASE_URL"] || "https://placeholder-wrmax.supabase.co";
const supabaseAnonKey = env["VITE_SUPABASE_ANON_KEY"] || "placeholder-anon-key";

export const isSupabaseConfigured = Boolean(
  env["VITE_SUPABASE_URL"] && env["VITE_SUPABASE_ANON_KEY"]
);

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
