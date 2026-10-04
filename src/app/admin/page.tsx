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

  // Query VIEW agregasi dan data operasional bulanan secara paralel
  const [
    { data: viewRingkasan },
    { data: viewSumberHutang },
    { data: configRaw },
    { data: donaturAktifRaw },
    { data: pembayaranBulanIniRaw },
    { data: semuaPembayaranRaw },
    { data: pembayaranHutangRaw },
    { data: sumberHutangRaw },
  ] = await Promise.all([
    supabase.from("view_ringkasan_donasi").select("*").maybeSingle(),
    supabase.from("view_sumber_hutang_detail").select("*"),
    supabase.from("konfigurasi").select("kunci, nilai"),
    supabase.from("donatur").select("id, nama, no_hp, minimal_bulanan").eq("status", "aktif").order("nama"),
    supabase.from("pembayaran").select("id, donatur_id, nama_donatur, nominal, metode, tgl_bayar").eq("bulan", bulanIni),
    // Fallback data jika VIEW belum terpasang di database
    supabase.from("pembayaran").select("nominal"),
    supabase.from("pembayaran_hutang").select("sumber_hutang_id, nominal"),
    supabase.from("sumber_hutang").select("*").order("nominal", { ascending: false }),
  ]);

  const config = (configRaw ?? []) as Pick<Konfigurasi, "kunci" | "nilai">[];
  const donaturAktif = (donaturAktifRaw ?? []) as Pick<Donatur, "id" | "nama" | "no_hp" | "minimal_bulanan">[];
  const pembayaranBulanIni = (pembayaranBulanIniRaw ?? []) as Pick<Pembayaran, "id" | "donatur_id" | "nama_donatur" | "nominal" | "metode" | "tgl_bayar">[];

  const configMap: Record<string, string> = {};
  config.forEach((c) => { configMap[c.kunci] = c.nilai; });

  let totalHutang = 0;
  let totalTerkumpul = 0;
  let totalSetor = 0;
  let sisaHutang = 0;
  let sumberHutang: SumberHutang[] = [];

  if (viewRingkasan && viewSumberHutang && viewSumberHutang.length > 0) {
    totalHutang = viewRingkasan.total_hutang;
    totalTerkumpul = viewRingkasan.total_donasi_terkumpul;
    totalSetor = viewRingkasan.total_setor_ke_toko;
    sisaHutang = viewRingkasan.sisa_hutang;
    sumberHutang = viewSumberHutang as SumberHutang[];
  } else {
    // Fallback perhitungan manual jika VIEW belum dibuat
    const pembayaranHutang = (pembayaranHutangRaw ?? []) as Pick<PembayaranHutang, "sumber_hutang_id" | "nominal">[];
    const semuaPembayaran = (semuaPembayaranRaw ?? []) as Pick<Pembayaran, "nominal">[];

    sumberHutang = ((sumberHutangRaw ?? []) as SumberHutang[]).map((h) => {
      const totalBayarToko = pembayaranHutang
        .filter((p) => p.sumber_hutang_id === h.id)
        .reduce((sum, p) => sum + (p.nominal || 0), 0);
      const terbayarFinal = Math.max(h.terbayar || 0, totalBayarToko);
      let status = h.status;
      if (terbayarFinal >= h.nominal && h.nominal > 0) status = "lunas";
      else if (terbayarFinal > 0) status = "sebagian";
      return { ...h, terbayar: terbayarFinal, status };
    });

    const totalHutangDariSumber = sumberHutang.reduce((s, h) => s + h.nominal, 0);
    totalHutang = totalHutangDariSumber > 0 ? totalHutangDariSumber : parseInt(configMap.total_hutang ?? "800000000");
    totalTerkumpul = semuaPembayaran.reduce((s, p) => s + p.nominal, 0);
    totalSetor = pembayaranHutang.reduce((s, p) => s + (p.nominal || 0), 0);
    sisaHutang = Math.max(0, totalHutang - totalTerkumpul);
  }

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
