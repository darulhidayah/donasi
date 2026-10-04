import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase";
import { formatRupiah, hitungProgress, NAMA_BULAN, cn } from "@/lib/utils";
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
              <p className="font-semibold text-sm text-on-surface leading-tight tracking-tight">
                {configMap.nama_masjid ?? "Masjid Darul Hidayah"}
              </p>
              <p className="text-[11px] text-on-surface-variant line-clamp-1">
                {configMap.alamat ?? "Titik Nol Tanah Merah, Boven Digoel"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-lg border border-outline hover:border-neutral-400 dark:hover:border-neutral-600 bg-surface px-3 py-1.5 text-xs font-medium text-on-surface transition-all shadow-xs"
            >
              <LogIn className="h-3.5 w-3.5 text-primary" />
              <span>Portal Admin</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* 1. Hero Banner (Geist Aesthetic) */}
        <div className="rounded-2xl bg-surface border border-outline/70 p-6 md:p-8 text-on-surface shadow-[0_1px_3px_rgba(0,0,0,0.02)] relative overflow-hidden">
          {/* Subtle Top Hairline Highlight */}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

          {/* Pulse Live Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Program Donasi Pelunasan Hutang</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-semibold leading-[1.25] tracking-tight mb-2 text-on-surface">
            Pelunasan Hutang Pembangunan Masjid
          </h1>
          <p className="text-sm md:text-[15px] text-on-surface-variant max-w-2xl leading-relaxed">
            Bersama-sama membebaskan kewajiban hutang pembangunan rumah Allah di Titik Nol Tanah Merah.
            Donasi rutin minimal <strong className="text-on-surface font-medium">Rp 50.000/bulan</strong>, tanpa batasan
            maksimal.
          </p>

          {/* Progress Card (Vercel Minimalist High-Contrast) */}
          <div className="mt-7 bg-surface-container-low/70 rounded-xl p-5 md:p-6 border border-outline/60">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-baseline gap-2 mb-2">
              <div>
                <p className="text-[11px] text-on-surface-variant font-medium uppercase tracking-wider">
                  Total Donasi Terkumpul
                </p>
                <p className="font-mono text-2xl md:text-3xl font-semibold text-status-success mt-1 tabular-nums tracking-tight">
                  {formatRupiah(totalTerkumpul)}
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-[11px] text-on-surface-variant font-medium uppercase tracking-wider">
                  Target Pelunasan Pembangunan
                </p>
                <p className="font-mono text-base md:text-lg font-medium text-on-surface mt-1 tabular-nums tracking-tight">
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
              <span className="font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[11px]">
                {progress}% Terpenuhi
              </span>
              <span className="text-status-danger font-mono font-medium tabular-nums text-xs">
                Sisa Kewajiban: {formatRupiah(sisaHutang)}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <div className="rounded-xl border border-outline/70 bg-surface p-4 text-center transition-all hover:border-outline">
            <p className="text-xs text-on-surface-variant font-medium">Donatur Tetap Terdaftar</p>
            <p className="font-mono text-2xl md:text-3xl font-semibold text-on-surface mt-1.5 tabular-nums tracking-tight">
              {totalDonatur}
            </p>
            <p className="text-[11px] text-on-surface-variant mt-0.5">Orang di Grup WA</p>
          </div>
          <div className="rounded-xl border border-outline/70 bg-surface p-4 text-center transition-all hover:border-outline">
            <p className="text-xs text-on-surface-variant font-medium">Minimal Donasi</p>
            <p className="font-mono text-2xl md:text-3xl font-semibold text-primary mt-1.5 tabular-nums tracking-tight">
              50 Ribu
            </p>
            <p className="text-[11px] text-on-surface-variant mt-0.5">/ bulan (bebas tanpa batas)</p>
          </div>
          <div className="col-span-2 md:col-span-1 rounded-xl border border-outline/70 bg-surface p-4 text-center transition-all hover:border-outline">
            <p className="text-xs text-on-surface-variant font-medium">Periode Berjalan</p>
            <p className="font-mono text-lg md:text-xl font-semibold text-on-surface mt-2 truncate tracking-tight">
              {labelBulan}
            </p>
            <p className="text-[11px] text-on-surface-variant mt-0.5">Update Real-Time</p>
          </div>
        </div>

        {/* 3. FITUR UTAMA: TRANSPARANSI SUMBER HUTANG DENGAN TIMELINE & VIEW KWITANSI */}
        <PublicHutangTimeline
          sumberHutangList={sumberHutang}
          riwayatPembayaranList={riwayatHutang}
        />

        {/* 4. Saluran Pembayaran Donasi (QRIS + Bank) */}
        <div className="rounded-2xl border border-outline/70 bg-surface p-6 md:p-8 shadow-[0_1px_3px_rgba(0,0,0,0.02)] relative overflow-hidden">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="h-5 w-5 text-primary" />
            <h2 className="text-lg md:text-xl font-semibold text-on-surface tracking-tight">
              Saluran Pembayaran Donasi
            </h2>
          </div>
          <p className="text-xs md:text-sm text-on-surface-variant mb-6">
            Saluran donasi resmi melalui rekening kas panitia atau pindai QRIS Masjid Darul Hidayah.
            Konfirmasi transfer dapat langsung dibagikan di grup WhatsApp.
          </p>

          <div className="grid md:grid-cols-2 gap-5 items-stretch">
            {/* Rekening Bank */}
            <div className="flex flex-col justify-between space-y-4">
              <div className="rounded-xl bg-surface-container-low/70 border border-outline/60 p-5">
                <span className="text-[10px] font-semibold text-primary uppercase tracking-wider bg-primary-container px-2 py-0.5 rounded-md">
                  Transfer Bank Kas
                </span>
                <p className="text-xs text-on-surface-variant mt-3 font-medium">Nomor Rekening Kas:</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="font-mono text-xl md:text-2xl font-semibold text-on-surface tracking-wider tabular-nums">
                    {configMap.rekening_bank ?? "2156-0100-0796-535"}
                  </p>
                </div>
                <p className="text-xs font-medium text-on-surface mt-2">
                  a.n. {configMap.nama_rekening ?? "Kas Pembangunan Masjid Darul Hidayah"}
                </p>
              </div>

              <div className="rounded-xl bg-primary/5 border border-primary/15 p-4 text-xs text-on-surface space-y-1.5">
                <p className="font-semibold flex items-center gap-1.5 text-primary">
                  <CheckCircle2 className="h-4 w-4 shrink-0" /> Panduan Donasi:
                </p>
                <p className="text-on-surface-variant">
                  1. Donasi fleksibel sesuai keikhlasan dan kemampuan (minimal Rp 50.000/bulan).
                </p>
                <p className="text-on-surface-variant">
                  2. Kirimkan bukti transfer bank atau struk scan QRIS ke grup WhatsApp donatur.
                </p>
                <p className="text-on-surface-variant">
                  3. Pengurus akan mengupdate status pelunasan donatur dan mempublikasikan laporan secara transparan.
                </p>
              </div>
            </div>

            {/* QRIS Image */}
            <div className="flex flex-col items-center justify-center p-5 rounded-xl bg-surface-container-low/70 border border-outline/60">
              <p className="text-xs font-semibold text-on-surface mb-3 flex items-center gap-1.5">
                <span>Scan QRIS Resmi Masjid Darul Hidayah</span>
              </p>
              <div className="relative w-60 h-76 max-w-full rounded-xl overflow-hidden bg-white shadow-xs border border-outline/60 flex items-center justify-center p-3">
                <img
                  src="/qris.jpg"
                  alt="QRIS Masjid Darul Hidayah"
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-[11px] text-on-surface-variant mt-2.5 text-center">
                Mendukung BCA, Mandiri, BRI, BNI, BSI, GoPay, OVO, Dana, ShopeePay & LinkAja
              </p>
            </div>
          </div>
        </div>

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
