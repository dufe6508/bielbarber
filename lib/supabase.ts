import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Lazy: só cria o client quando realmente usado (evita crash no build se
// as variáveis ainda não estiverem disponíveis na coleta de páginas).
let _browser: SupabaseClient | null = null;
let _admin: SupabaseClient | null = null;

// Client-side (componentes e hooks)
export function getSupabase(): SupabaseClient {
  if (!_browser) _browser = createClient(supabaseUrl, supabaseAnonKey);
  return _browser;
}

// Service role — somente no servidor, nunca expor no client
export function getSupabaseAdmin(): SupabaseClient {
  if (!_admin)
    _admin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  return _admin;
}

// Server-side com cookies (Server Components e Route Handlers)
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        );
      },
    },
  });
}
