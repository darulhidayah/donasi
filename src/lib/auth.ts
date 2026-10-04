import { createServerSupabase } from "@/lib/supabase";
import { redirect } from "next/navigation";
import type { Database } from "@/lib/database.types";

type AdminUser = Database["public"]["Tables"]["admin_users"]["Row"];

/** Guard halaman admin - redirect ke /login jika bukan admin aktif */
export async function guardAdminPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) redirect("/login");

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("id, email, nama, role, aktif")
    .eq("email", user.email)
    .single();

  if (!adminUser || !adminUser.aktif) redirect("/login?error=akses_ditolak");

  // Update last_active_at
  await supabase
    .from("admin_users")
    .update({ last_active_at: new Date().toISOString() })
    .eq("email", user.email);

  return { user, adminUser: adminUser as AdminUser };
}

/** Guard khusus superadmin */
export async function guardSuperAdmin() {
  const { user, adminUser } = await guardAdminPage();
  if (adminUser.role !== "superadmin") redirect("/admin?error=akses_ditolak");
  return { user, adminUser };
}
