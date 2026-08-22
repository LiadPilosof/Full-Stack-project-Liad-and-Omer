// Each variable is referenced as a static `process.env.NAME` expression on
// purpose. Next.js inlines NEXT_PUBLIC_* values into the browser bundle by
// literal text substitution at build time, so dynamic access like
// process.env[name] would silently be undefined in client components.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || supabaseUrl.includes("REPLACE_ME")) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL is missing. Copy .env.example to .env.local and fill it in.",
  );
}

if (!supabaseAnonKey || supabaseAnonKey.includes("REPLACE_ME")) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Copy .env.example to .env.local and fill it in.",
  );
}

export const env = {
  supabaseUrl,
  supabaseAnonKey,
} as const;
