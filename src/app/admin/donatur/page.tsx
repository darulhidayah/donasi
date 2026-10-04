import { guardAdminPage } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase";
import AdminDonaturClient from "@/components/AdminDonaturClient";
import type { Database } from "@/lib/database.types";

type Donatur = Database["public"]["Tables"]["donatur"]["Row"];

export default async function AdminDonaturPage() {
  const { adminUser } = await guardAdminPage();
  const supabase = await createServerSupabase();

  const { data } = await supabase
    .from("donatur")
    .select("*")
    .order("status", { ascending: false })
    .order("nama");

  return <AdminDonaturClient initialList={(data ?? []) as Donatur[]} adminNama={adminUser.nama} />;
}
