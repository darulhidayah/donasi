import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase";
import { formatRupiah, hitungProgress, NAMA_BULAN, cn } from "@/lib/utils";
import ThemeToggle from "@/components/ThemeToggle";
import PublicHutangTimeline from "@/components/PublicHutangTimeline";
import {
  CreditCard, LogIn, CheckCircle2,
  Building2, Copy, Check, Users, ArrowUpRight
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
    <div className="min-h-screen bg-background text-on-surface antialiased selection:bg-primary/20 selection:text-primary">
      {/* Vercel Ambient Top Glow */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_80%_40%_at_50%_-20%,rgba(16,185,129,0.12),transparent_70%)] dark:bg-[radial-gradient(ellipse_80%_40%_at_50%_-20%,rgba(16,185,129,0.18),transparent_70%)] z-0" />

      {/* Top Navbar: Opaque Vercel Header with blur (Anti-Overlap on Scroll) */}
      <header className="site-header">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container-lowest border border-outline-variant p-1 shadow-xs">
              <img
                src="/logo.png"
                alt="Logo Masjid Darul Hidayah"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <p className="font-bold text-sm text-on-surface leading-tight">
                {configMap.nama_masjid ?? "Masjid Darul Hidayah"}
              </p>
              <p className="text-xs text-on-surface-variant line-clamp-1">
                {configMap.alamat ?? "Titik Nol Tanah Merah, Boven Digoel"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/login"
              className="flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container hover:bg-surface-container-high px-3.5 py-1.5 text-xs font-semibold text-on-surface transition-all shadow-xs"
            >
              <LogIn className="h-3.5 w-3.5 text-primary" />
              <span>Portal Admin</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* 1. Hero Banner (Vercel 2026 Geist Style) */}
        <div className="rounded-3xl bg-surface border border-outline-variant p-6 md:p-8 text-on-surface shadow-xs relative overflow-hidden">
          {/* Top Hairline Accent Line */}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

          {/* Pulse Live Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Program Donasi Pelunasan Hutang</span>
          </div>

          <h1 className="text-2xl md:text-4xl font-black leading-tight tracking-tight mb-3 text-on-surface">
            Pembebasan Hutang Pembangunan Masjid
          </h1>
          <p className="text-sm md:text-base text-on-surface-variant max-w-2xl leading-relaxed">
            Bersama-sama membebaskan kewajiban hutang pembangunan rumah Allah di Titik Nol Tanah Merah.
            Donasi rutin minimal <strong className="text-on-surface">Rp 50.000/bulan</strong>, tanpa batasan
            maksimal.
          </p>

          {/* Progress Card (Vercel Minimalist High-Contrast) */}
          <div className="mt-8 bg-surface-container-low rounded-2xl p-5 md:p-6 border border-outline-variant">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-baseline gap-2 mb-3">
              <div>
                <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">
                  Total Donasi Terkumpul
                </p>
                <p className="font-mono text-2xl md:text-3xl font-black text-status-success mt-1 tabular-nums">
                  {formatRupiah(totalTerkumpul)}
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">
                  Target Pelunasan Pembangunan
                </p>
                <p className="font-mono text-lg md:text-xl font-bold text-on-surface mt-1 tabular-nums">
                  {formatRupiah(totalHutang)}
                </p>
              </div>
            </div>

            {/* Glowing Vercel Progress Bar */}
            <div className="w-full bg-surface-container-high rounded-full h-3 overflow-hidden mt-4 relative">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-1000 shadow-sm"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex justify-between items-center mt-3 text-xs">
              <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                {progress}% Terpenuhi
              </span>
              <span className="text-status-danger font-mono font-bold tabular-nums">
                Sisa Kewajiban: {formatRupiah(sisaHutang)}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <div className="rounded-2xl border border-outline-variant bg-surface p-5 text-center transition-all hover:border-primary/40">
            <p className="text-xs text-on-surface-variant font-medium">Donatur Tetap Terdaftar</p>
            <p className="font-mono text-3xl font-black text-on-surface mt-2 tabular-nums">{totalDonatur}</p>
            <p className="text-[11px] text-on-surface-variant mt-1">Orang di Grup WA</p>
          </div>
          <div className="rounded-2xl border border-outline-variant bg-surface p-5 text-center transition-all hover:border-primary/40">
            <p className="text-xs text-on-surface-variant font-medium">Minimal Donasi</p>
            <p className="font-mono text-3xl font-black text-primary mt-2 tabular-nums">50 Ribu</p>
            <p className="text-[11px] text-on-surface-variant mt-1">/ bulan (bebas tanpa batas)</p>
          </div>
          <div className="col-span-2 md:col-span-1 rounded-2xl border border-outline-variant bg-surface p-5 text-center transition-all hover:border-primary/40">
            <p className="text-xs text-on-surface-variant font-medium">Periode Berjalan</p>
            <p className="font-mono text-xl md:text-2xl font-black text-on-surface mt-2.5 truncate">{labelBulan}</p>
            <p className="text-[11px] text-on-surface-variant mt-1">Update Real-Time</p>
          </div>
        </div>

        {/* 3. FITUR UTAMA: TRANSPARANSI SUMBER HUTANG DENGAN TIMELINE & VIEW KWITANSI */}
        <PublicHutangTimeline
          sumberHutangList={sumberHutang}
          riwayatPembayaranList={riwayatHutang}
        />

        {/* 4. Saluran Pembayaran Donasi (QRIS + Bank) */}
        <div className="rounded-3xl border border-outline-variant bg-surface p-6 md:p-8 shadow-xs relative overflow-hidden">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-on-surface">Saluran Pembayaran Donasi</h2>
          </div>
          <p className="text-xs md:text-sm text-on-surface-variant mb-6">
            Saluran donasi resmi melalui rekening kas panitia atau pindai QRIS Masjid Darul Hidayah.
            Konfirmasi transfer dapat langsung dibagikan di grup WhatsApp.
          </p>

          <div className="grid md:grid-cols-2 gap-6 items-stretch">
            {/* Rekening Bank */}
            <div className="flex flex-col justify-between space-y-4">
              <div className="rounded-2xl bg-surface-container-low border border-outline-variant p-5">
                <span className="text-[11px] font-bold text-primary uppercase tracking-wider bg-primary-container px-2.5 py-0.5 rounded-md">
                  Transfer Bank Kas
                </span>
                <p className="text-xs text-on-surface-variant mt-3 font-medium">Nomor Rekening Kas:</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="font-mono text-xl md:text-2xl font-black text-on-surface tracking-wider tabular-nums">
                    {configMap.rekening_bank ?? "2156-0100-0796-535"}
                  </p>
                </div>
                <p className="text-xs font-semibold text-on-surface mt-2">
                  a.n. {configMap.nama_rekening ?? "Kas Pembangunan Masjid Darul Hidayah"}
                </p>
              </div>

              <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4 text-xs text-on-surface space-y-2">
                <p className="font-bold flex items-center gap-1.5 text-primary">
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
            <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-surface-container-low border border-outline-variant">
              <p className="text-xs font-bold text-on-surface mb-3 flex items-center gap-1.5">
                <span>Scan QRIS Resmi Masjid Darul Hidayah</span>
              </p>
              <div className="relative w-64 h-80 max-w-full rounded-2xl overflow-hidden bg-white shadow-sm border border-outline-variant flex items-center justify-center p-3">
                <img
                  src="/qris.jpg"
                  alt="QRIS Masjid Darul Hidayah"
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-[11px] text-on-surface-variant mt-3 text-center">
                Mendukung BCA, Mandiri, BRI, BNI, BSI, GoPay, OVO, Dana, ShopeePay & LinkAja
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-on-surface-variant pt-4 pb-10 space-y-1.5 border-t border-outline-variant">
          <p className="font-bold text-on-surface">
            {configMap.nama_masjid ?? "Masjid Darul Hidayah"} —{" "}
            {configMap.alamat ?? "Titik Nol Tanah Merah, Boven Digoel"}
          </p>
          <p className="text-[11px] opacity-75">
            Website Resmi:{" "}
            <a
              href="https://mdh.or.id"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline font-semibold"
            >
              mdh.or.id
            </a>{" "}
            • Aplikasi Donasi:{" "}
            <a
              href="https://donasi.mdh.or.id"
              className="text-primary hover:underline font-semibold"
            >
              donasi.mdh.or.id
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
