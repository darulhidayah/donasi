import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase";
import { formatRupiah, hitungProgress, formatPersen, NAMA_BULAN, cn } from "@/lib/utils";
import ThemeToggle from "@/components/ThemeToggle";
import PublicHutangTimeline from "@/components/PublicHutangTimeline";
import {
  CreditCard, LogIn, CheckCircle2,
  Building2, Users, ArrowUpRight
} from "lucide-react";
import type { Database } from "@/lib/database.types";

type Konfigurasi = Database["public"]["Tables"]["konfigurasi"]["Row"];
type Pembayaran = Database["public"]["Tables"]["pembayaran"]["Row"];
type Setor = Database["public"]["Tables"]["setor_pihak_ketiga"]["Row"];
type Donatur = Database["public"]["Tables"]["donatur"]["Row"];
type SumberHutang = Database["public"]["Tables"]["sumber_hutang"]["Row"];
type PembayaranHutang = Database["public"]["Tables"]["pembayaran_hutang"]["Row"];

export const revalidate = 60; // refresh data setiap 60 detik

export default async function PublicHomePage() {
  const supabase = await createServerSupabase();

  const [
    { data: configRaw },
    { data: semuaPembayaranRaw },
    { data: setorPihakKetigaRaw },
    { data: donaturRaw },
    { data: sumberHutangRaw },
    { data: riwayatHutangRaw },
  ] = await Promise.all([
    supabase.from("konfigurasi").select("kunci, nilai"),
    supabase.from("pembayaran").select("nominal"),
    supabase.from("setor_pihak_ketiga").select("jumlah"),
    supabase.from("donatur").select("id").eq("status", "aktif"),
    supabase.from("sumber_hutang").select("*").order("nominal", { ascending: false }),
    supabase.from("pembayaran_hutang").select("*").order("tanggal_bayar", { ascending: false }),
  ]);

  const config = (configRaw ?? []) as Pick<Konfigurasi, "kunci" | "nilai">[];
  const configMap: Record<string, string> = {};
  config.forEach((c) => {
    configMap[c.kunci] = c.nilai;
  });

  const sumberHutang = (sumberHutangRaw ?? []) as SumberHutang[];
  const riwayatHutang = (riwayatHutangRaw ?? []) as PembayaranHutang[];

  const totalHutangDariSumber = sumberHutang.reduce((s, h) => s + h.nominal, 0);
  const totalHutang =
    totalHutangDariSumber > 0
      ? totalHutangDariSumber
      : parseInt(configMap.total_hutang ?? "800000000");

  // Total donasi murni yang dihimpun dari para donatur
  const totalTerkumpul = ((semuaPembayaranRaw ?? []) as Pick<Pembayaran, "nominal">[]).reduce(
    (s, p) => s + p.nominal,
    0
  );
  const sisaHutang = Math.max(0, totalHutang - totalTerkumpul);
  const progress = hitungProgress(totalTerkumpul, totalHutang);
  const progressStr = formatPersen(totalTerkumpul, totalHutang);
  const totalDonatur = (donaturRaw ?? []).length;

  const now = new Date();
  const labelBulan = `${NAMA_BULAN[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <div className="min-h-screen bg-background text-on-surface antialiased selection:bg-emerald-500/20 selection:text-emerald-500">
      {/* Vercel Ambient Radial Glow (Top) */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_60%_40%_at_50%_-10%,rgba(16,185,129,0.08),transparent_70%)] dark:bg-[radial-gradient(ellipse_60%_40%_at_50%_-10%,rgba(16,185,129,0.12),transparent_70%)] z-0" />

      {/* Top Navbar: Opaque Vercel Header with blur (Anti-Overlap on Scroll) */}
      <header className="site-header">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-outline/60 p-1 shadow-xs">
              <img
                src="/logo.png"
                alt="Logo Masjid Darul Hidayah"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <p className="font-semibold text-sm text-heading leading-tight tracking-tight">
                {configMap.nama_masjid ?? "Masjid Darul Hidayah"}
              </p>
              <p className="text-[11px] text-neutral-500 line-clamp-1">
                {configMap.alamat ?? "Titik Nol Tanah Merah, Boven Digoel"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-lg border border-outline/70 hover:border-emerald-500 bg-surface px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-200 transition-all shadow-xs"
            >
              <LogIn className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Portal Admin</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 py-8 space-y-10">
        {/* 1. Hero Banner: Single unified card without nested box */}
        <section className="rounded-2xl bg-surface border border-outline/70 p-6 md:p-8 text-on-surface shadow-[0_1px_3px_rgba(0,0,0,0.02)] relative overflow-hidden">
          {/* Subtle Top Hairline Highlight */}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

          {/* Pulse Live Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Program Donasi Pelunasan Hutang</span>
          </div>

          <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold leading-tight tracking-tight mb-2.5 text-heading">
            Pelunasan Hutang Pembangunan Masjid
          </h1>
          <p className="text-sm md:text-[15px] text-neutral-600 dark:text-neutral-400 max-w-2xl leading-relaxed">
            Bersama-sama membebaskan kewajiban hutang pembangunan rumah Allah di Titik Nol Tanah Merah.
            Donasi rutin minimal <strong className="text-heading font-semibold">Rp 50.000/bulan</strong>, tanpa batasan
            maksimal.
          </p>

          {/* Progress Section (Langsung menyatu dalam card tanpa box ganda) */}
          <div className="mt-8 pt-6 border-t border-outline/60">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-baseline gap-2 mb-2">
              <div>
                <p className="text-[11px] text-neutral-500 font-medium uppercase tracking-wider">
                  Total Donasi Terkumpul
                </p>
                <p className="font-mono text-2xl md:text-3xl font-semibold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums tracking-tight">
                  {formatRupiah(totalTerkumpul)}
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-[11px] text-neutral-500 font-medium uppercase tracking-wider">
                  Target Pelunasan Pembangunan
                </p>
                <p className="font-mono text-base md:text-lg font-medium text-heading mt-1 tabular-nums tracking-tight">
                  {formatRupiah(totalHutang)}
                </p>
              </div>
            </div>

            {/* Glowing Vercel Progress Bar */}
            <div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden mt-3.5 relative">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-1000 shadow-xs"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex justify-between items-center mt-2.5 text-xs">
              <span className="font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[11px]">
                {progressStr} Terpenuhi
              </span>
              <span className="text-status-danger font-mono font-medium tabular-nums text-xs">
                Sisa Kewajiban: {formatRupiah(sisaHutang)}
              </span>
            </div>
          </div>
        </section>

        {/* 2. Quick Stats Grid (3 Kartu Flat Bersih) */}
        <section className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <div className="rounded-xl border border-outline/70 bg-surface p-4 text-center transition-all hover:border-emerald-600/30">
            <p className="text-xs text-neutral-500 font-medium">Donatur Tetap Terdaftar</p>
            <p className="font-mono text-2xl md:text-3xl font-semibold text-heading mt-1.5 tabular-nums tracking-tight">
              {totalDonatur}
            </p>
            <p className="text-[11px] text-neutral-400 mt-0.5">Orang di Grup WA</p>
          </div>
          <div className="rounded-xl border border-outline/70 bg-surface p-4 text-center transition-all hover:border-emerald-600/30">
            <p className="text-xs text-neutral-500 font-medium">Minimal Donasi</p>
            <p className="font-mono text-2xl md:text-3xl font-semibold text-emerald-600 dark:text-emerald-400 mt-1.5 tabular-nums tracking-tight">
              50 Ribu
            </p>
            <p className="text-[11px] text-neutral-400 mt-0.5">/ bulan (bebas tanpa batas)</p>
          </div>
          <div className="col-span-2 md:col-span-1 rounded-xl border border-outline/70 bg-surface p-4 text-center transition-all hover:border-emerald-600/30">
            <p className="text-xs text-neutral-500 font-medium">Periode Berjalan</p>
            <p className="font-mono text-lg md:text-xl font-semibold text-heading mt-2 truncate tracking-tight">
              {labelBulan}
            </p>
            <p className="text-[11px] text-neutral-400 mt-0.5">Update Real-Time</p>
          </div>
        </section>

        {/* 3. FITUR UTAMA: TRANSPARANSI SUMBER HUTANG DENGAN TIMELINE & VIEW KWITANSI */}
        <PublicHutangTimeline
          sumberHutangList={sumberHutang}
          riwayatPembayaranList={riwayatHutang}
        />

        {/* 4. Saluran Pembayaran Donasi (QRIS + Bank) - Tanpa wrapper box ganda */}
        <section className="space-y-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">
              <CreditCard className="h-3.5 w-3.5" />
              <span>Metode Pembayaran</span>
            </div>
            <h2 className="text-xl md:text-2xl font-semibold text-heading tracking-tight">
              Saluran Pembayaran Donasi
            </h2>
            <p className="text-xs md:text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-xl">
              Saluran resmi donasi melalui transfer rekening kas panitia atau pindai QRIS Masjid Darul Hidayah.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 items-stretch">
            {/* Kartu 1: Rekening Bank Kas */}
            <div className="rounded-xl border border-outline/70 bg-surface p-6 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full inline-block">
                  Transfer Bank Kas
                </span>
                <p className="text-xs text-neutral-500 mt-4 font-medium">Nomor Rekening Kas Panitia:</p>
                <p className="font-mono text-2xl md:text-3xl font-semibold text-heading tracking-wider tabular-nums mt-1">
                  {configMap.rekening_bank ?? "2156-0100-0796-535"}
                </p>
                <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300 mt-2">
                  a.n. {configMap.nama_rekening ?? "Kas Pembangunan Masjid Darul Hidayah"}
                </p>
              </div>

              {/* Panduan langsung list minimalis tanpa dibungkus kotak kedua */}
              <div className="mt-6 pt-4 border-t border-outline/50 space-y-2 text-xs text-neutral-500">
                <p className="font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Panduan Donasi:
                </p>
                <p className="text-neutral-600 dark:text-neutral-400">
                  1. Donasi fleksibel sesuai kemampuan (minimal Rp 50.000/bulan).
                </p>
                <p className="text-neutral-600 dark:text-neutral-400">
                  2. Kirimkan foto bukti transfer ke grup WhatsApp donatur.
                </p>
                <p className="text-neutral-600 dark:text-neutral-400">
                  3. Pengurus akan mengupdate pencatatan dan mempublikasikan laporan.
                </p>
              </div>
            </div>

            {/* Kartu 2: QRIS Resmi */}
            <div className="rounded-xl border border-outline/70 bg-surface p-6 flex flex-col items-center justify-center text-center">
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full mb-3.5 inline-block">
                Scan QRIS Resmi
              </span>
              <div className="w-56 h-72 max-w-full rounded-lg overflow-hidden bg-white p-2 border border-outline/50 flex items-center justify-center shadow-xs">
                <img
                  src="/qris.jpg"
                  alt="QRIS Masjid Darul Hidayah"
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-[11px] text-neutral-500 mt-3 max-w-xs">
                Mendukung BCA, Mandiri, BRI, BNI, BSI, GoPay, OVO, Dana, ShopeePay & LinkAja
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-on-surface-variant pt-4 pb-10 space-y-1 border-t border-outline/60">
          <p className="font-medium text-on-surface">
            {configMap.nama_masjid ?? "Masjid Darul Hidayah"} —{" "}
            {configMap.alamat ?? "Titik Nol Tanah Merah, Boven Digoel"}
          </p>
          <p className="text-[11px] opacity-75">
            Website Resmi:{" "}
            <a
              href="https://mdh.or.id"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline font-medium"
            >
              mdh.or.id
            </a>{" "}
            • Aplikasi Donasi:{" "}
            <a
              href="https://donasi.mdh.or.id"
              className="text-primary hover:underline font-medium"
            >
              donasi.mdh.or.id
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
