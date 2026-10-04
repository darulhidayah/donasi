import { guardAdminPage } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase";
import AdminLayoutClient from "@/components/AdminLayoutClient";
import type { Database } from "@/lib/database.types";

type Konfigurasi = Database["public"]["Tables"]["konfigurasi"]["Row"];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { adminUser } = await guardAdminPage();
  const supabase = await createServerSupabase();

  const { data: configRaw } = await supabase
    .from("konfigurasi")
    .select("kunci, nilai");

  const config = (configRaw ?? []) as Pick<Konfigurasi, "kunci" | "nilai">[];
  const configMap: Record<string, string> = {};
  config.forEach((c) => { configMap[c.kunci] = c.nilai; });

  return (
    <AdminLayoutClient adminUser={adminUser} config={configMap}>
      {children}
    </AdminLayoutClient>
  );
}
