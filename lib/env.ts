// Support both NEXT_PUBLIC_ prefixed and standard env variables
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || supabaseUrl.includes("REPLACE_ME")) {
  throw new Error(
    "SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL is missing. Please set it in your environment.",
  );
}

if (!supabaseAnonKey || supabaseAnonKey.includes("REPLACE_ME")) {
  throw new Error(
    "SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Please set it in your environment.",
  );
}

export const env = {
  supabaseUrl,
  supabaseAnonKey,
} as const;

