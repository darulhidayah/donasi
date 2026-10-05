import { guardAdminPage } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase";
import AdminDonaturClient from "@/components/AdminDonaturClient";
import type { Database } from "@/lib/database.types";

type Donatur = Database["public"]["Tables"]["donatur"]["Row"];

export default async function AdminDonaturPage() {
  const { adminUser } = await guardAdminPage();
  const supabase = await createServerSupabase();

  const [{ data: donaturData }, { data: pembayaranData }, { data: configData }] = await Promise.all([
    supabase
      .from("donatur")
      .select("*")
      .order("status", { ascending: false })
      .order("nama"),
    supabase
      .from("pembayaran")
      .select("donatur_id"),
    supabase
      .from("konfigurasi")
      .select("kunci, nilai"),
  ]);

  const paidDonaturIds = Array.from(new Set((pembayaranData ?? []).map((p) => p.donatur_id)));
  const configMap: Record<string, string> = {};
  (configData ?? []).forEach((c) => { configMap[c.kunci] = c.nilai; });
  const minimalDonasi = parseInt(configMap.minimal_donasi || "50000", 10) || 50000;

  return (
    <AdminDonaturClient
      initialList={(donaturData ?? []) as Donatur[]}
      paidDonaturIds={paidDonaturIds}
      adminNama={adminUser.nama}
      minimalDonasi={minimalDonasi}
    />
  );
}
