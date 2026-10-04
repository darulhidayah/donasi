import { guardAdminPage } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase";
import AdminLaporanClient from "@/components/AdminLaporanClient";
import type { Database } from "@/lib/database.types";

type Konfigurasi = Database["public"]["Tables"]["konfigurasi"]["Row"];

export default async function AdminLaporanPage() {
  const { adminUser } = await guardAdminPage();
  const supabase = await createServerSupabase();

  const [
    { data: configRaw },
    { data: allPembayaranRaw },
    { data: semuaSetorRaw },
    { data: pembayaranHutangRaw },
  ] = await Promise.all([
    supabase.from("konfigurasi").select("kunci, nilai"),
    supabase.from("pembayaran").select("bulan, nominal, metode, donatur_id, nama_donatur, tgl_bayar").order("bulan").order("tgl_bayar"),
    supabase.from("setor_pihak_ketiga").select("bulan, jumlah, keterangan, created_by_name, updated_by_name"),
    supabase.from("pembayaran_hutang").select("tanggal_bayar, nominal, keterangan, dicatat_oleh_name"),
  ]);

  const config = (configRaw ?? []) as Pick<Konfigurasi, "kunci" | "nilai">[];
  const configMap: Record<string, string> = {};
  config.forEach((c) => { configMap[c.kunci] = c.nilai; });

  const now = new Date();
  const bulanDefault = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  // Sinkronkan data setor pihak ketiga agar otomatis terhubung dengan kwitansi toko tanpa edit manual
  type Setor = { bulan: string; jumlah: number; keterangan: string | null; created_by_name?: string | null; updated_by_name?: string | null };
  const setorMap = new Map<string, Setor>();

  (semuaSetorRaw ?? []).forEach((s: any) => {
    setorMap.set(s.bulan, { ...s });
  });

  (pembayaranHutangRaw ?? []).forEach((p: any) => {
    const bln = p.tanggal_bayar ? `${p.tanggal_bayar.slice(0, 7)}-01` : "";
    if (!bln) return;
    const existing = setorMap.get(bln);
    if (existing) {
      if ((p.nominal || 0) > existing.jumlah) {
        existing.jumlah = p.nominal;
      }
    } else {
      setorMap.set(bln, {
        bulan: bln,
        jumlah: p.nominal || 0,
        keterangan: p.keterangan || "Pembayaran hutang toko",
        created_by_name: p.dicatat_oleh_name,
      });
    }
  });

  const mergedSetor = Array.from(setorMap.values());

  return (
    <AdminLaporanClient
      allPembayaran={(allPembayaranRaw ?? []) as any[]}
      semuaSetor={mergedSetor}
      config={configMap}
      bulanDefault={bulanDefault}
      adminNama={adminUser.nama}
    />
  );
}
