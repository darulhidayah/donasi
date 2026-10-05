import { guardAdminPage } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase";
import AdminPembayaranClient from "@/components/AdminPembayaranClient";
import type { Database } from "@/lib/database.types";

type Donatur = Database["public"]["Tables"]["donatur"]["Row"];
type Pembayaran = Database["public"]["Tables"]["pembayaran"]["Row"];

export default async function AdminPembayaranPage() {
  const { adminUser } = await guardAdminPage();
  const supabase = await createServerSupabase();

  const now = new Date();
  const bulanDefault = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const [{ data: donaturRaw }, { data: pembayaranRaw }, { data: configData }] = await Promise.all([
    supabase.from("donatur").select("id, nama, no_hp, minimal_bulanan, metode_default").eq("status", "aktif").order("nama"),
    supabase.from("pembayaran").select("*").eq("bulan", bulanDefault).order("tgl_bayar", { ascending: false }),
    supabase.from("konfigurasi").select("kunci, nilai"),
  ]);

  const configMap: Record<string, string> = {};
  (configData ?? []).forEach((c) => { configMap[c.kunci] = c.nilai; });
  const minimalDonasi = parseInt(configMap.minimal_donasi || "50000", 10) || 50000;

  return (
    <AdminPembayaranClient
      donaturList={(donaturRaw ?? []) as Donatur[]}
      initialPembayaran={(pembayaranRaw ?? []) as Pembayaran[]}
      bulanDefault={bulanDefault}
      adminNama={adminUser.nama}
      minimalDonasi={minimalDonasi}
    />
  );
}
