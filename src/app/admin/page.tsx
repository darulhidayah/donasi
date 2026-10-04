import { guardAdminPage } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase";
import AdminDashboardClient from "@/components/AdminDashboardClient";
import type { Database } from "@/lib/database.types";

type Donatur = Database["public"]["Tables"]["donatur"]["Row"];
type Pembayaran = Database["public"]["Tables"]["pembayaran"]["Row"];
type Konfigurasi = Database["public"]["Tables"]["konfigurasi"]["Row"];
type Setor = Database["public"]["Tables"]["setor_pihak_ketiga"]["Row"];
type SumberHutang = Database["public"]["Tables"]["sumber_hutang"]["Row"];
type PembayaranHutang = Database["public"]["Tables"]["pembayaran_hutang"]["Row"];

export default async function AdminDashboardPage() {
  await guardAdminPage();
  const supabase = await createServerSupabase();

  const now = new Date();
  const bulanIni = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const [
    { data: configRaw },
    { data: donaturAktifRaw },
    { data: pembayaranBulanIniRaw },
    { data: semuaPembayaranRaw },
    { data: setorPihakKetigaRaw },
    { data: sumberHutangRaw },
    { data: pembayaranHutangRaw },
  ] = await Promise.all([
    supabase.from("konfigurasi").select("kunci, nilai"),
    supabase.from("donatur").select("id, nama, no_hp, minimal_bulanan").eq("status", "aktif").order("nama"),
    supabase.from("pembayaran").select("id, donatur_id, nama_donatur, nominal, metode, tgl_bayar").eq("bulan", bulanIni),
    supabase.from("pembayaran").select("nominal"),
    supabase.from("setor_pihak_ketiga").select("jumlah"),
    supabase.from("sumber_hutang").select("*").order("nominal", { ascending: false }),
    supabase.from("pembayaran_hutang").select("sumber_hutang_id, nominal"),
  ]);

  const config = (configRaw ?? []) as Pick<Konfigurasi, "kunci" | "nilai">[];
  const donaturAktif = (donaturAktifRaw ?? []) as Pick<Donatur, "id" | "nama" | "no_hp" | "minimal_bulanan">[];
  const pembayaranBulanIni = (pembayaranBulanIniRaw ?? []) as Pick<Pembayaran, "id" | "donatur_id" | "nama_donatur" | "nominal" | "metode" | "tgl_bayar">[];
  const semuaPembayaran = (semuaPembayaranRaw ?? []) as Pick<Pembayaran, "nominal">[];
  const setorPihakKetiga = (setorPihakKetigaRaw ?? []) as Pick<Setor, "jumlah">[];
  const pembayaranHutang = (pembayaranHutangRaw ?? []) as Pick<PembayaranHutang, "sumber_hutang_id" | "nominal">[];

  // Hitung total terbayar per toko secara dinamis dari catatan pembayaran
  const sumberHutang = ((sumberHutangRaw ?? []) as SumberHutang[]).map((h) => {
    const totalBayarToko = pembayaranHutang
      .filter((p) => p.sumber_hutang_id === h.id)
      .reduce((sum, p) => sum + (p.nominal || 0), 0);
    const terbayarFinal = Math.max(h.terbayar || 0, totalBayarToko);
    let status = h.status;
    if (terbayarFinal >= h.nominal && h.nominal > 0) status = "lunas";
    else if (terbayarFinal > 0) status = "sebagian";

    return {
      ...h,
      terbayar: terbayarFinal,
      status,
    };
  });

  const configMap: Record<string, string> = {};
  config.forEach((c) => { configMap[c.kunci] = c.nilai; });

  // Total hutang dihitung dari jumlah sumber hutang jika ada, atau dari config
  const totalHutangDariSumber = sumberHutang.reduce((s, h) => s + h.nominal, 0);
  const totalHutang = totalHutangDariSumber > 0 ? totalHutangDariSumber : parseInt(configMap.total_hutang ?? "800000000");

  const totalTerkumpul = semuaPembayaran.reduce((s, p) => s + p.nominal, 0);
  const totalBayarHutang = pembayaranHutang.reduce((s, p) => s + (p.nominal || 0), 0);
  const totalSetorLangsung = setorPihakKetiga.reduce((s, p) => s + p.jumlah, 0);
  const totalSetor = Math.max(totalSetorLangsung, totalBayarHutang);
  const sisaHutang = Math.max(0, totalHutang - totalSetor);
  const totalBulanIni = pembayaranBulanIni.reduce((s, p) => s + p.nominal, 0);
  const sudahBayarIds = new Set(pembayaranBulanIni.map((p) => p.donatur_id));

  return (
    <AdminDashboardClient
      totalHutang={totalHutang}
      totalTerkumpul={totalTerkumpul}
      totalSetor={totalSetor}
      sisaHutang={sisaHutang}
      totalBulanIni={totalBulanIni}
      donaturAktif={donaturAktif}
      pembayaranBulanIni={pembayaranBulanIni}
      sudahBayarIds={sudahBayarIds}
      bulanIni={bulanIni}
      config={configMap}
      sumberHutangList={sumberHutang}
    />
  );
}
