import { guardSuperAdmin } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase";
import AdminUsersClient from "@/components/AdminUsersClient";
import type { Database } from "@/lib/database.types";

type AdminUser = Database["public"]["Tables"]["admin_users"]["Row"];

export default async function AdminUsersPage() {
  await guardSuperAdmin();
  const supabase = await createServerSupabase();

  const { data } = await supabase
    .from("admin_users")
    .select("id, email, nama, role, aktif, created_at, last_active_at")
    .order("role", { ascending: false })
    .order("nama");

  return <AdminUsersClient initialList={(data ?? []) as AdminUser[]} />;
}
