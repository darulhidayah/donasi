import { guardSuperAdmin } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase";
import AdminUsersClient from "@/components/AdminUsersClient";
import type { Database } from "@/lib/database.types";

type AdminUser = Database["public"]["Tables"]["admin_users"]["Row"];

export default async function AdminUsersPage() {
  await guardSuperAdmin();
  const supabase = await createServerSupabase();

  const [{ data }, { data: configData }] = await Promise.all([
    supabase
      .from("admin_users")
      .select("id, email, nama, role, aktif, created_at, last_active_at")
      .order("role", { ascending: false })
      .order("nama"),
    supabase
      .from("konfigurasi")
      .select("kunci, nilai")
      .eq("kunci", "max_admin")
      .maybeSingle(),
  ]);

  const maxAdmin = parseInt(configData?.nilai || "3", 10) || 3;

  return <AdminUsersClient initialList={(data ?? []) as AdminUser[]} maxAdmin={maxAdmin} />;
}
