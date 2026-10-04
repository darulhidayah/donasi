import { guardAdminPage } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase";
import AdminLaporanClient from "@/components/AdminLaporanClient";
import type { Database } from "@/lib/database.types";

type Konfigurasi = Database["public"]["Tables"]["konfigurasi"]["Row"];

export default async function AdminLaporanPage() {
  const { adminUser } = await guardAdminPage();
  const supabase = await createServerSupabase();

  const [{ data: configRaw }, { data: allPembayaranRaw }, { data: semuaSetorRaw }] = await Promise.all([
    supabase.from("konfigurasi").select("kunci, nilai"),
    supabase.from("pembayaran").select("bulan, nominal, metode, donatur_id, nama_donatur, tgl_bayar").order("bulan").order("tgl_bayar"),
    supabase.from("setor_pihak_ketiga").select("bulan, jumlah, keterangan, created_by_name, updated_by_name"),
  ]);

  const config = (configRaw ?? []) as Pick<Konfigurasi, "kunci" | "nilai">[];
  const configMap: Record<string, string> = {};
  config.forEach((c) => { configMap[c.kunci] = c.nilai; });

  const now = new Date();
  const bulanDefault = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  return (
    <AdminLaporanClient
      allPembayaran={(allPembayaranRaw ?? []) as any[]}
      semuaSetor={(semuaSetorRaw ?? []) as any[]}
      config={configMap}
      bulanDefault={bulanDefault}
      adminNama={adminUser.nama}
    />
  );
}
