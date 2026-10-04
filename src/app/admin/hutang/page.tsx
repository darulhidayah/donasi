import { guardAdminPage } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase";
import AdminHutangClient from "@/components/AdminHutangClient";
import type { Database } from "@/lib/database.types";

type SumberHutang = Database["public"]["Tables"]["sumber_hutang"]["Row"];
type PembayaranHutang = Database["public"]["Tables"]["pembayaran_hutang"]["Row"];

export default async function AdminHutangPage() {
  const { adminUser } = await guardAdminPage();
  const supabase = await createServerSupabase();

  const [
    { data: viewSumberHutang },
    { data: viewRingkasan },
    { data: pembayaranData },
    { data: hutangDataFallback },
    { data: donasiDataFallback },
  ] = await Promise.all([
    supabase.from("view_sumber_hutang_detail").select("*"),
    supabase.from("view_ringkasan_donasi").select("*").maybeSingle(),
    supabase.from("pembayaran_hutang").select("*").order("tanggal_bayar", { ascending: false }),
    supabase.from("sumber_hutang").select("*").order("nominal", { ascending: false }),
    supabase.from("pembayaran").select("nominal"),
  ]);

  const pembayaranList = (pembayaranData ?? []) as PembayaranHutang[];

  let hutangList: SumberHutang[] = [];
  if (viewSumberHutang && viewSumberHutang.length > 0) {
    hutangList = viewSumberHutang as SumberHutang[];
  } else {
    // Sinkronkan akumulasi terbayar per kreditor dari riwayat pembayaran secara dinamis jika VIEW belum dibuat
    hutangList = ((hutangDataFallback ?? []) as SumberHutang[]).map((h) => {
      const totalBayarToko = pembayaranList
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
  }

  const totalDonasiTerkumpul =
    viewRingkasan?.total_donasi_terkumpul ??
    (donasiDataFallback ?? []).reduce((acc, p) => acc + (p.nominal || 0), 0);

  return (
    <AdminHutangClient
      initialList={hutangList}
      initialPembayaran={pembayaranList}
      totalDonasiTerkumpul={totalDonasiTerkumpul}
      adminNama={adminUser.nama}
    />
  );
}

