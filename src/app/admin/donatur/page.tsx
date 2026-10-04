import { guardAdminPage } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase";
import AdminDonaturClient from "@/components/AdminDonaturClient";
import type { Database } from "@/lib/database.types";

type Donatur = Database["public"]["Tables"]["donatur"]["Row"];

export default async function AdminDonaturPage() {
  const { adminUser } = await guardAdminPage();
  const supabase = await createServerSupabase();

  const [{ data: donaturData }, { data: pembayaranData }] = await Promise.all([
    supabase
      .from("donatur")
      .select("*")
      .order("status", { ascending: false })
      .order("nama"),
    supabase
      .from("pembayaran")
      .select("donatur_id"),
  ]);

  const paidDonaturIds = Array.from(new Set((pembayaranData ?? []).map((p) => p.donatur_id)));

  return (
    <AdminDonaturClient
      initialList={(donaturData ?? []) as Donatur[]}
      paidDonaturIds={paidDonaturIds}
      adminNama={adminUser.nama}
    />
  );
}
