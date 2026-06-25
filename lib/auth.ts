import { createSupabaseServerClient } from "./supabase";
import { redirect } from "next/navigation";

export async function getSession() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// Usa em Server Components e layouts do admin
export async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}
