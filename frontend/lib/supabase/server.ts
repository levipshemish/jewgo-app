// RSC-safe server client for Server Components & Server Actions
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if the URL is valid (should be a Supabase project URL, not a database connection string)
const isValidSupabaseUrl = (url: string | undefined): boolean => {
  if (!url) {
    return false;
  }
  // Should be a valid HTTPS URL ending with .supabase.co
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'https:' && urlObj.hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
};

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  
  // Use fallback values if environment variables are not set
  let url = 'https://placeholder.supabase.co';
  let key = 'placeholder-key';
  
  if (isValidSupabaseUrl(supabaseUrl) && supabaseAnonKey) {
    url = supabaseUrl!; // We know this is not undefined due to the check above
    key = supabaseAnonKey;
  } else {
    // console.warn('Supabase environment variables not configured. Using fallback client.');
  }
  
  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }
  );
  return supabase;
}
