import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase, createAdminClient } from "@/lib/supabase";
import { formatRupiah, hitungProgress, formatPersen, NAMA_BULAN, cn } from "@/lib/utils";
import ThemeToggle from "@/components/ThemeToggle";
import PublicHutangTimeline from "@/components/PublicHutangTimeline";
import PublicAuthButton from "@/components/PublicAuthButton";
import CopyRekeningButton from "@/components/CopyRekeningButton";
import DownloadQrisButton from "@/components/DownloadQrisButton";
import {
  CreditCard, CheckCircle2,
  Building2, Users, Banknote, Calendar, HeartHandshake, ShieldCheck
} from "lucide-react";
import type { Database } from "@/lib/database.types";

type Konfigurasi = Database["public"]["Tables"]["konfigurasi"]["Row"];
type Pembayaran = Database["public"]["Tables"]["pembayaran"]["Row"];
type Donatur = Database["public"]["Tables"]["donatur"]["Row"];
type SumberHutang = Database["public"]["Tables"]["sumber_hutang"]["Row"];
type PembayaranHutang = Database["public"]["Tables"]["pembayaran_hutang"]["Row"];

export const revalidate = 60; // refresh data setiap 60 detik

export default async function PublicHomePage({
  searchParams,
}: {
  searchParams?: Promise<{ code?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  if (params?.code) {
    redirect(`/auth/callback?code=${params.code}`);
  }

  const supabase = await createServerSupabase();

  // 1. Ambil data ringkasan dan detail langsung dari VIEW Supabase (jika sudah ada)
  const [
    { data: viewRingkasan },
    { data: viewSumberHutang },
    { data: configRaw },
    { data: riwayatHutangRaw },
  ] = await Promise.all([
    supabase.from("view_ringkasan_donasi").select("*").maybeSingle(),
    supabase.from("view_sumber_hutang_detail").select("*"),
    supabase.from("konfigurasi").select("kunci, nilai"),
    supabase.from("pembayaran_hutang").select("*").order("tanggal_bayar", { ascending: false }),
  ]);

  let totalHutang = viewRingkasan?.total_hutang ?? 0;
  let totalTerkumpul = viewRingkasan?.total_donasi_terkumpul ?? 0;
  let sisaHutang = viewRingkasan?.sisa_hutang ?? 0;
  let totalDonatur = viewRingkasan?.total_donatur_aktif ?? 0;
  let progress = viewRingkasan?.persentase_tercapai ?? 0;
  let progressStr = formatPersen(totalTerkumpul, totalHutang);
  let sumberHutang = (viewSumberHutang ?? []) as SumberHutang[];
  let riwayatHutang = (riwayatHutangRaw ?? []) as PembayaranHutang[];

  const configMap: Record<string, string> = {};
  (configRaw ?? []).forEach((c) => {
    configMap[c.kunci] = c.nilai;
  });

  // Fallback server-side: jika VIEW belum dieksekusi di Supabase atau konfigurasi kosong karena RLS anon,
  // ambil data server-side via createAdminClient() agar pengunjung tamu selalu melihat angka real-time yang akurat
  if (!viewRingkasan || !configRaw || configRaw.length === 0 || sumberHutang.length === 0) {
    try {
      const adminSb = createAdminClient();
      const [
        { data: adminConfig },
        { data: adminPembayaran },
        { data: adminDonatur },
        { data: adminSumberHutang },
        { data: adminRiwayatHutang },
      ] = await Promise.all([
        configRaw && configRaw.length > 0 ? Promise.resolve({ data: null }) : adminSb.from("konfigurasi").select("kunci, nilai"),
        !viewRingkasan ? adminSb.from("pembayaran").select("nominal") : Promise.resolve({ data: null }),
        !viewRingkasan ? adminSb.from("donatur").select("id").eq("status", "aktif") : Promise.resolve({ data: null }),
        sumberHutang.length === 0 ? adminSb.from("sumber_hutang").select("*").order("nominal", { ascending: false }) : Promise.resolve({ data: null }),
        riwayatHutang.length === 0 ? adminSb.from("pembayaran_hutang").select("*").order("tanggal_bayar", { ascending: false }) : Promise.resolve({ data: null }),
      ]);

      if (adminConfig) {
        adminConfig.forEach((c) => { configMap[c.kunci] = c.nilai; });
      }
      if (adminRiwayatHutang) {
        riwayatHutang = adminRiwayatHutang as PembayaranHutang[];
      }
      if (adminSumberHutang) {
        sumberHutang = (adminSumberHutang as SumberHutang[]).map((h) => {
          const totalBayarToko = riwayatHutang
            .filter((p) => p.sumber_hutang_id === h.id)
            .reduce((sum, p) => sum + (p.nominal || 0), 0);
          const terbayarFinal = Math.max(h.terbayar || 0, totalBayarToko);
          let status = h.status;
          if (terbayarFinal >= h.nominal && h.nominal > 0) status = "lunas";
          else if (terbayarFinal > 0) status = "sebagian";
          return { ...h, terbayar: terbayarFinal, status };
        });
      }

      if (!viewRingkasan) {
        const totalHutangDariSumber = sumberHutang.reduce((s, h) => s + h.nominal, 0);
        totalHutang = totalHutangDariSumber > 0 ? totalHutangDariSumber : parseInt(configMap.total_hutang ?? "800000000");
        totalTerkumpul = ((adminPembayaran ?? []) as Pick<Pembayaran, "nominal">[]).reduce((s, p) => s + p.nominal, 0);
        sisaHutang = Math.max(0, totalHutang - totalTerkumpul);
        totalDonatur = (adminDonatur ?? []).length;
      }
    } catch (e) {
      console.error("Gagal fallback server aggregate:", e);
    }
  }

  // Sinkronkan kalkulasi progres visual
  progress = hitungProgress(totalTerkumpul, totalHutang);
  progressStr = formatPersen(totalTerkumpul, totalHutang);

  // Periksa apakah admin sedang dalam status login
  const { data: { user } } = await supabase.auth.getUser();
  let isAdminLoggedIn = false;
  if (user?.email) {
    const { data: adminRaw } = await supabase
      .from("admin_users")
      .select("id, aktif")
      .eq("email", user.email)
      .single();
    if (adminRaw?.aktif) {
      isAdminLoggedIn = true;
    }
  }

  const now = new Date();
  const labelBulan = `${NAMA_BULAN[now.getMonth()]} ${now.getFullYear()}`;

  const nominalMinimal = parseInt(configMap.minimal_donasi ?? "50000", 10) || 50000;
  const formattedMinimal = formatRupiah(nominalMinimal);

  return (
    <div className="min-h-screen bg-background text-on-surface antialiased">
      {/* Top Navbar */}
      <header className="site-header">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-container-lowest border border-outline-variant/50 p-1.5 shadow-soft">
              <img
                src="/logo.png"
                alt="Logo Masjid Darul Hidayah"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <p className="font-bold font-headline text-sm text-on-surface leading-tight tracking-tight">
                {configMap.nama_masjid ?? "Masjid Darul Hidayah"}
              </p>
              <p className="text-[11px] text-on-surface-variant line-clamp-1 font-body">
                {configMap.alamat ?? "Titik Nol Tanah Merah, Boven Digoel"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <PublicAuthButton initialLoggedIn={isAdminLoggedIn} />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* 1. Hero Aurora Panel */}
        <section className="aurora-panel p-6 md:p-8 animate-fade-in-scale">
          {/* Subtle Top Hairline Highlight */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary-light to-transparent" />

          {/* Pulse Live Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary-dark dark:text-primary mb-4 font-label">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-light opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span>Program Donasi Pelunasan Hutang</span>
          </div>

          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold font-headline leading-tight tracking-tight mb-3 text-on-surface">
            Pelunasan Hutang Pembangunan Masjid
          </h1>
          <p className="text-sm md:text-base text-on-surface-variant leading-relaxed font-body">
            Bersama-sama membebaskan kewajiban hutang pembangunan rumah Allah di {configMap.alamat ?? "Titik Nol Tanah Merah, Boven Digoel"}.
            Donasi rutin minimal <strong className="text-primary-dark dark:text-primary font-bold">{formattedMinimal}/bulan</strong>, tanpa batasan maksimal.
          </p>

          {/* Progress Section */}
          <div className="mt-8 pt-6 border-t border-outline-variant/30">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-baseline gap-2 mb-2">
              <div>
                <p className="text-[11px] text-on-surface-variant font-semibold uppercase tracking-wider font-label">
                  Total Donasi Terkumpul
                </p>
                <p className="font-headline text-2xl md:text-3xl font-bold text-primary-dark dark:text-primary mt-1 tabular-nums tracking-tight">
                  {formatRupiah(totalTerkumpul)}
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-[11px] text-on-surface-variant font-semibold uppercase tracking-wider font-label">
                  Target Pelunasan Pembangunan
                </p>
                <p className="font-headline text-base md:text-lg font-bold text-on-surface mt-1 tabular-nums tracking-tight">
                  {formatRupiah(totalHutang)}
                </p>
              </div>
            </div>

            {/* Aurora Gold Progress Bar */}
            <div className="w-full bg-surface-container-high/40 rounded-full h-2.5 overflow-hidden mt-3 relative">
              <div
                className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-primary to-primary-light shadow-2xs"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex justify-between items-center mt-3 text-xs">
              <span className="font-semibold text-on-primary-container bg-primary-container px-3 py-0.5 rounded-full text-[11px] shadow-2xs font-label">
                {progressStr} Terpenuhi
              </span>
              <span className="text-status-danger font-mono font-semibold tabular-nums text-xs">
                Sisa Kewajiban: {formatRupiah(sisaHutang)}
              </span>
            </div>
          </div>
        </section>

        {/* 2. Quick Stats Grid (Bento Cards) */}
        <section className="grid grid-cols-2 md:grid-cols-3 gap-4 stagger-children">
          <div className="bento-card text-center hover-lift relative overflow-hidden group">
            <Users className="absolute right-3 top-3 h-12 w-12 opacity-15 text-primary pointer-events-none" />
            <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary-dark dark:text-primary mb-2">
              <Users className="h-5 w-5" />
            </span>
            <p className="text-xs text-on-surface-variant font-medium font-label">Donatur Tetap Terdaftar</p>
            <p className="font-headline text-2xl md:text-3xl font-bold text-on-surface mt-1.5 tabular-nums tracking-tight">
              {totalDonatur}
            </p>
            <p className="text-[11px] text-on-surface-variant/70 mt-0.5">Orang di Grup WA</p>
          </div>

          <div className="bento-card text-center hover-lift relative overflow-hidden group">
            <Banknote className="absolute right-3 top-3 h-12 w-12 opacity-15 text-primary-light pointer-events-none" />
            <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-primary-light/10 text-primary-dark dark:text-primary mb-2">
              <Banknote className="h-5 w-5" />
            </span>
            <p className="text-xs text-on-surface-variant font-medium font-label">Minimal Donasi</p>
            <p className="font-headline text-2xl md:text-3xl font-bold text-primary-dark dark:text-primary mt-1.5 tabular-nums tracking-tight">
              {formattedMinimal}
            </p>
            <p className="text-[11px] text-on-surface-variant/70 mt-0.5">/ bulan (bebas tanpa batas)</p>
          </div>

          <div className="col-span-2 md:col-span-1 bento-card text-center hover-lift relative overflow-hidden group">
            <Calendar className="absolute right-3 top-3 h-12 w-12 opacity-15 text-tertiary pointer-events-none" />
            <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-tertiary/10 text-tertiary mb-2">
              <Calendar className="h-5 w-5" />
            </span>
            <p className="text-xs text-on-surface-variant font-medium font-label">Periode Berjalan</p>
            <p className="font-headline text-lg md:text-xl font-bold text-on-surface mt-2 truncate tracking-tight">
              {labelBulan}
            </p>
            <p className="text-[11px] text-on-surface-variant/70 mt-0.5">Update Real-Time</p>
          </div>
        </section>

        {/* 3. FITUR UTAMA: TRANSPARANSI SUMBER HUTANG DENGAN TIMELINE & VIEW KWITANSI */}
        <PublicHutangTimeline
          sumberHutangList={sumberHutang}
          riwayatPembayaranList={riwayatHutang}
        />

        {/* 4. Saluran Pembayaran Donasi (QRIS + Bank) */}
        <section className="space-y-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-dark dark:text-primary uppercase tracking-wider mb-1 font-label">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary-dark dark:text-primary">
                <CreditCard className="h-3.5 w-3.5" />
              </span>
              <span>Metode Pembayaran</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold font-headline text-on-surface tracking-tight">
              Saluran Pembayaran Donasi
            </h2>
            <p className="text-xs md:text-sm text-on-surface-variant mt-1 font-body">
              Saluran resmi donasi melalui transfer rekening kas panitia atau pindai QRIS Masjid Darul Hidayah.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 items-stretch">
            {/* Kartu 1: Rekening Bank Kas */}
            <div className="bento-card p-6 flex flex-col justify-between hover-lift">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-on-primary-container bg-primary-container px-3 py-0.5 rounded-full inline-block shadow-2xs font-label">
                    Transfer Bank Kas
                  </span>
                  <CopyRekeningButton
                    nomorRekening={configMap.rekening_bank ?? "2156-0100-0796-535"}
                    variant="badge"
                  />
                </div>

                <p className="text-xs text-on-surface-variant mt-5 font-medium font-label">Nomor Rekening Kas Panitia:</p>
                <p className="font-headline text-2xl md:text-3xl font-bold text-primary-dark dark:text-primary tracking-wider tabular-nums mt-1 select-all">
                  {configMap.rekening_bank ?? "2156-0100-0796-535"}
                </p>
                <p className="text-xs font-semibold text-on-surface mt-2">
                  a.n. {configMap.nama_rekening ?? "Kas Pembangunan Masjid Darul Hidayah"}
                </p>

                <div className="mt-5">
                  <CopyRekeningButton
                    nomorRekening={configMap.rekening_bank ?? "2156-0100-0796-535"}
                    variant="button"
                    className="w-full sm:w-auto"
                  />
                </div>
              </div>

              {/* Panduan */}
              <div className="mt-6 pt-4 border-t border-outline-variant/30 space-y-2 text-xs text-on-surface-variant font-body">
                <p className="font-semibold text-primary-dark dark:text-primary flex items-center gap-1.5 font-label">
                  <CheckCircle2 className="h-4 w-4" /> Panduan Donasi:
                </p>
                <p>1. Donasi fleksibel sesuai kemampuan (minimal {formattedMinimal}/bulan).</p>
                <p>2. Kirimkan foto bukti transfer ke grup WhatsApp donatur.</p>
                <p>3. Pengurus akan mengupdate pencatatan dan mempublikasikan laporan.</p>
              </div>
            </div>

            {/* Kartu 2: QRIS Resmi */}
            <div className="bento-card p-6 flex flex-col items-center justify-between text-center hover-lift">
              <div className="flex flex-col items-center w-full">
                <span className="text-[11px] font-semibold text-on-primary-container bg-primary-container px-3 py-0.5 rounded-full mb-4 inline-block shadow-2xs font-label">
                  Scan QRIS Resmi
                </span>
                <div className="w-56 h-72 max-w-full rounded-2xl overflow-hidden bg-white p-2.5 border border-outline-variant/50 flex items-center justify-center shadow-soft">
                  <img
                    src="/qris.jpg"
                    alt="QRIS Masjid Darul Hidayah"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="mt-4 w-full flex justify-center">
                  <DownloadQrisButton
                    imageUrl="/qris.jpg"
                    fileName="QRIS-Masjid-Darul-Hidayah.jpg"
                    className="w-full sm:w-auto"
                  />
                </div>
              </div>
              <p className="text-[11px] text-on-surface-variant/80 mt-4 font-body">
                Mendukung BCA, Mandiri, BRI, BNI, BSI, GoPay, OVO, Dana, ShopeePay & LinkAja
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-on-surface-variant pt-6 pb-12 space-y-1.5 border-t border-outline-variant/30">
          <p className="font-bold font-headline text-on-surface">
            {configMap.nama_masjid ?? "Masjid Darul Hidayah"} —{" "}
            {configMap.alamat ?? "Titik Nol Tanah Merah, Boven Digoel"}
          </p>
          <p className="text-[11px] opacity-80 font-body">
            Website Resmi:{" "}
            <a
              href={configMap.website ?? "https://mdh.or.id"}
              target="_blank"
              rel="noreferrer"
              className="text-primary-dark dark:text-primary font-semibold hover:underline"
            >
              {configMap.website ? configMap.website.replace(/^https?:\/\//, "") : "mdh.or.id"}
            </a>{" "}
            • Aplikasi Donasi:{" "}
            <a
              href="https://donasi.mdh.or.id"
              className="text-primary-dark dark:text-primary font-semibold hover:underline"
            >
              donasi.mdh.or.id
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
