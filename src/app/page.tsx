import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase";
import { formatRupiah, hitungProgress, NAMA_BULAN, cn } from "@/lib/utils";
import ThemeToggle from "@/components/ThemeToggle";
import {
  Mosque, QrCode, CreditCard, HeartHandshake, LogIn, CheckCircle2,
  Building2,
} from "lucide-react";
import type { Database } from "@/lib/database.types";

type Konfigurasi = Database["public"]["Tables"]["konfigurasi"]["Row"];
type Pembayaran = Database["public"]["Tables"]["pembayaran"]["Row"];
type Setor = Database["public"]["Tables"]["setor_pihak_ketiga"]["Row"];
type Donatur = Database["public"]["Tables"]["donatur"]["Row"];
type SumberHutang = Database["public"]["Tables"]["sumber_hutang"]["Row"];

export const revalidate = 60; // refresh data setiap 60 detik

export default async function PublicHomePage() {
  const supabase = await createServerSupabase();

  const [
    { data: configRaw },
    { data: semuaPembayaranRaw },
    { data: setorPihakKetigaRaw },
    { data: donaturRaw },
    { data: sumberHutangRaw },
  ] = await Promise.all([
    supabase.from("konfigurasi").select("kunci, nilai"),
    supabase.from("pembayaran").select("nominal"),
    supabase.from("setor_pihak_ketiga").select("jumlah"),
    supabase.from("donatur").select("id").eq("status", "aktif"),
    supabase.from("sumber_hutang").select("*").order("nominal", { ascending: false }),
  ]);

  const config = (configRaw ?? []) as Pick<Konfigurasi, "kunci" | "nilai">[];
  const configMap: Record<string, string> = {};
  config.forEach((c) => {
    configMap[c.kunci] = c.nilai;
  });

  const sumberHutang = (sumberHutangRaw ?? []) as SumberHutang[];
  const totalHutangDariSumber = sumberHutang.reduce((s, h) => s + h.nominal, 0);
  const totalHutang =
    totalHutangDariSumber > 0
      ? totalHutangDariSumber
      : parseInt(configMap.total_hutang ?? "800000000");

  const totalDonasi = ((semuaPembayaranRaw ?? []) as Pick<Pembayaran, "nominal">[]).reduce(
    (s, p) => s + p.nominal,
    0
  );
  const totalSetor = ((setorPihakKetigaRaw ?? []) as Pick<Setor, "jumlah">[]).reduce(
    (s, p) => s + p.jumlah,
    0
  );
  const totalTerkumpul = totalDonasi + totalSetor;
  const sisaHutang = Math.max(0, totalHutang - totalTerkumpul);
  const progress = hitungProgress(totalTerkumpul, totalHutang);
  const totalDonatur = (donaturRaw ?? []).length;

  const now = new Date();
  const labelBulan = `${NAMA_BULAN[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* Top Navbar */}
      <header className="border-b border-outline-variant bg-surface sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-container-lowest border border-outline-variant p-1 shadow-xs">
              <img src="/logo.png" alt="Logo Masjid Darul Hidayah" className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="font-bold text-sm text-primary leading-tight">
                {configMap.nama_masjid ?? "Masjid Darul Hidayah"}
              </p>
              <p className="text-xs text-on-surface-variant">
                {configMap.alamat ?? "Titik Nol Tanah Merah, Boven Digoel"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/login"
              className="flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary-container px-3.5 py-1.5 text-xs font-bold text-on-primary-container hover:bg-primary-container/80 transition-colors"
            >
              <LogIn className="h-3.5 w-3.5" /> Portal Admin
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Hero Banner */}
        <div className="rounded-3xl bg-surface-container border border-outline-variant p-6 md:p-8 text-on-surface shadow-xs">
          <div className="flex items-center gap-2 mb-2 text-primary text-xs font-bold uppercase tracking-wider">
            <HeartHandshake className="h-4 w-4" /> Program Donasi Pelunasan Hutang
          </div>
          <h1 className="text-2xl md:text-3xl font-black leading-tight mb-2 text-on-surface">
            Pelunasan Hutang Pembangunan Masjid
          </h1>
          <p className="text-sm md:text-base text-on-surface-variant max-w-xl">
            Mari bersama-sama membebaskan hutang pembangunan rumah Allah. Donasi tetap minimal{" "}
            <strong className="text-on-surface">Rp 50.000/bulan</strong>, tanpa batasan maksimal.
          </p>

          {/* Progress Card */}
          <div className="mt-6 bg-surface-container-low rounded-2xl p-5 border border-outline-variant">
            <div className="flex justify-between items-baseline mb-2">
              <div>
                <p className="text-xs text-on-surface-variant font-medium">Telah Terkumpul</p>
                <p className="text-xl md:text-2xl font-black text-primary">
                  {formatRupiah(totalTerkumpul)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-on-surface-variant font-medium">Target Pelunasan</p>
                <p className="text-base md:text-lg font-bold text-on-surface">
                  {formatRupiah(totalHutang)}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-surface-container-high rounded-full h-3.5 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-1000 shadow-sm"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex justify-between items-center mt-2.5 text-xs">
              <span className="font-bold text-primary bg-primary-container px-2 py-0.5 rounded-full">
                {progress}% Lunas
              </span>
              <span className="text-status-danger font-bold">
                Sisa: {formatRupiah(sisaHutang)}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-outline-variant bg-surface p-4 text-center">
            <p className="text-xs text-on-surface-variant font-medium">Donatur Tetap Terdaftar</p>
            <p className="text-2xl font-black text-primary mt-1">{totalDonatur}</p>
            <p className="text-[11px] text-on-surface-variant mt-0.5">Orang di Grup WA</p>
          </div>
          <div className="rounded-2xl border border-outline-variant bg-surface p-4 text-center">
            <p className="text-xs text-on-surface-variant font-medium">Minimal Donasi</p>
            <p className="text-2xl font-black text-primary mt-1">50 Ribu</p>
            <p className="text-[11px] text-on-surface-variant mt-0.5">/ orang / bulan (fleksibel)</p>
          </div>
          <div className="col-span-2 md:col-span-1 rounded-2xl border border-outline-variant bg-surface p-4 text-center">
            <p className="text-xs text-on-surface-variant font-medium">Periode Berjalan</p>
            <p className="text-lg font-bold text-primary mt-1.5 truncate">{labelBulan}</p>
            <p className="text-[11px] text-on-surface-variant mt-0.5">Update berkala</p>
          </div>
        </div>

        {/* Rincian Sumber Hutang (Transparansi) */}
        {sumberHutang.length > 0 && (
          <div className="rounded-3xl border border-outline-variant bg-surface p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-on-surface">Transparansi Sumber Hutang</h2>
            </div>
            <p className="text-xs text-on-surface-variant mb-4">
              Rincian kewajiban hutang pembangunan masjid kepada pihak ketiga / toko material:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {sumberHutang.map((h) => {
                const sisa = Math.max(0, h.nominal - h.terbayar);
                const persen = h.nominal > 0 ? Math.min(100, Math.round((h.terbayar / h.nominal) * 100)) : 0;
                return (
                  <div
                    key={h.id}
                    className="rounded-2xl bg-surface-container-low border border-outline-variant p-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-sm text-on-surface">{h.nama_kreditor}</p>
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0",
                            h.status === "lunas"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : h.status === "sebagian"
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                              : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                          )}
                        >
                          {h.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">
                        {h.keterangan || "Material pembangunan masjid"}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-outline-variant space-y-2">
                      <div className="flex justify-between items-baseline text-xs">
                        <span className="text-on-surface-variant text-[11px]">Terbayar:</span>
                        <span className="font-mono font-bold text-status-success tabular-nums">
                          {formatRupiah(h.terbayar)} ({persen}%)
                        </span>
                      </div>
                      <div className="w-full bg-surface-container-high rounded-full h-1.5 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            h.status === "lunas" ? "bg-emerald-500" : h.status === "sebagian" ? "bg-amber-500" : "bg-rose-500"
                          )}
                          style={{ width: `${persen}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-baseline text-xs">
                        <span className="text-on-surface-variant text-[11px]">Sisa Hutang:</span>
                        <span className="font-mono font-black text-status-danger tabular-nums">
                          {formatRupiah(sisa)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Metode Pembayaran / Saluran Donasi */}
        <div className="rounded-3xl border border-outline-variant bg-surface p-6 md:p-8 shadow-xs">
          <h2 className="text-lg font-bold text-on-surface mb-1 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" /> Saluran Pembayaran Donasi
          </h2>
          <p className="text-xs text-on-surface-variant mb-6">
            Bisa melalui Transfer Bank atau scan QRIS di bawah ini. Harap konfirmasi bukti transfer ke
            admin di grup WA.
          </p>

          <div className="grid md:grid-cols-2 gap-6 items-center">
            {/* Rekening Bank */}
            <div className="space-y-4">
              <div className="rounded-2xl bg-surface-container-low border border-outline-variant p-5">
                <span className="text-[11px] font-bold text-primary uppercase tracking-wider bg-primary-container px-2.5 py-0.5 rounded-md">
                  Transfer Bank
                </span>
                <p className="text-xs text-on-surface-variant mt-3 font-medium">Nomor Rekening:</p>
                <p className="font-mono text-xl md:text-2xl font-black text-on-surface tracking-wider mt-0.5">
                  {configMap.rekening_bank ?? "2156-0100-0796-535"}
                </p>
                <p className="text-xs font-semibold text-on-surface mt-2">
                  a.n. {configMap.nama_rekening ?? "Kas Pembangunan Masjid Darul Hidayah"}
                </p>
              </div>

              <div className="rounded-2xl bg-primary-container/30 border border-primary/20 p-4 text-xs text-on-primary-container space-y-1.5">
                <p className="font-bold flex items-center gap-1.5 text-primary">
                  <CheckCircle2 className="h-4 w-4 shrink-0" /> Panduan Pembayaran:
                </p>
                <p>1. Donasi fleksibel sesuai keikhlasan dan kemampuan (minimal Rp 50.000/bulan).</p>
                <p>2. Setelah transfer atau scan QRIS, kirimkan bukti setoran ke grup WhatsApp donatur.</p>
                <p>3. Rekap daftar donatur lunas dan laporan transparansi dibagikan berkala oleh admin.</p>
              </div>
            </div>

            {/* QRIS Image */}
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-surface-container-low border border-outline-variant">
              <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface mb-3">
                <QrCode className="h-4 w-4 text-primary" /> Scan QRIS Masjid Darul Hidayah
              </div>
              <div className="relative w-64 h-80 max-w-full rounded-xl overflow-hidden bg-surface-container-lowest shadow-sm border border-outline-variant flex items-center justify-center p-2">
                <img
                  src="/qris.jpg"
                  alt="QRIS Masjid Darul Hidayah"
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-[11px] text-on-surface-variant mt-2.5 text-center">
                Mendukung semua e-wallet (GoPay, OVO, Dana, ShopeePay) & Mobile Banking
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-on-surface-variant pt-4 pb-8 space-y-1">
          <p className="font-semibold text-on-surface">
            {configMap.nama_masjid ?? "Masjid Darul Hidayah"} —{" "}
            {configMap.alamat ?? "Titik Nol Tanah Merah, Boven Digoel"}
          </p>
          <p className="opacity-75">
            Website resmi:{" "}
            <a
              href="https://mdh.or.id"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline font-medium"
            >
              mdh.or.id
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
