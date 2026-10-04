"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatRupiah, formatBulan, NAMA_BULAN, toBulanDB, formatPersen } from "@/lib/utils";
import { exportRekapToExcel } from "@/lib/excel";
import { cn } from "@/lib/utils";
import {
  Copy, Check, ChevronLeft, ChevronRight, Download,
  X, FileSpreadsheet, QrCode, CreditCard, Banknote, Wallet,
} from "lucide-react";

interface Pembayaran {
  bulan: string; nominal: number; metode: string;
  donatur_id: number; nama_donatur: string; tgl_bayar: string;
}
interface Setor { bulan: string; jumlah: number; keterangan: string | null; }

interface Props {
  allPembayaran: Pembayaran[];
  semuaSetor: Setor[];
  config: Record<string, string>;
  bulanDefault: string;
  adminNama: string;
}

export default function AdminLaporanClient({ allPembayaran, semuaSetor, config, bulanDefault, adminNama }: Props) {
  const now = new Date();
  const [bulanTahun, setBulanTahun] = useState({ tahun: now.getFullYear(), bulan: now.getMonth() + 1 });
  const [copied, setCopied] = useState(false);
  const [setorData] = useState<Setor[]>(semuaSetor);

  const bulanDB = toBulanDB(bulanTahun.tahun, bulanTahun.bulan);
  const labelBulan = `${NAMA_BULAN[bulanTahun.bulan - 1]} ${bulanTahun.tahun}`;

  const totalHutang = parseInt(config.total_hutang ?? "800000000");

  // 1. Penerimaan Donasi Bulan Ini dari para donatur
  const pembayaranBulan = allPembayaran.filter((p) => p.bulan === bulanDB);
  const totalDonasiBulan = pembayaranBulan.reduce((s, p) => s + p.nominal, 0);

  // Breakdown saluran donasi bulan ini
  const donasiQRISBulan = pembayaranBulan
    .filter((p) => /qris/i.test(p.metode))
    .reduce((s, p) => s + p.nominal, 0);
  const countQRISBulan = pembayaranBulan.filter((p) => /qris/i.test(p.metode)).length;

  const donasiRekeningBulan = pembayaranBulan
    .filter((p) => /transfer|rek|bank/i.test(p.metode))
    .reduce((s, p) => s + p.nominal, 0);
  const countRekeningBulan = pembayaranBulan.filter((p) => /transfer|rek|bank/i.test(p.metode)).length;

  const donasiTunaiBulan = pembayaranBulan
    .filter((p) => /tunai|cash/i.test(p.metode))
    .reduce((s, p) => s + p.nominal, 0);
  const countTunaiBulan = pembayaranBulan.filter((p) => /tunai|cash/i.test(p.metode)).length;

  const donasiLainnyaBulan = pembayaranBulan
    .filter((p) => !/qris|transfer|rek|bank|tunai|cash/i.test(p.metode))
    .reduce((s, p) => s + p.nominal, 0);
  const countLainnyaBulan = pembayaranBulan.filter((p) => !/qris|transfer|rek|bank|tunai|cash/i.test(p.metode)).length;

  const totalKeseluruhanDonasiBulan =
    donasiQRISBulan + donasiRekeningBulan + donasiTunaiBulan + donasiLainnyaBulan;

  // 2. Setor Pihak Ketiga (Pengeluaran kas donasi untuk membayar toko/supplier)
  const setorBulan = setorData.find((s) => s.bulan === bulanDB);
  const totalSetorBulan = setorBulan?.jumlah ?? 0;

  // 3. Sisa Saldo Kas Donasi Bulan Ini (Donasi Masuk - Disetor ke Toko)
  const sisaSaldoKasBulan = totalDonasiBulan - totalSetorBulan;

  // 4. REKAP BULANAN (Sesuai Template Excel Koordinator)
  const bulanUnik = [
    ...new Set([...allPembayaran.map((p) => p.bulan), ...setorData.map((s) => s.bulan)]),
  ].sort();

  let saldoHutangBerjalan = totalHutang;
  const rekapBulan = bulanUnik.map((bln, idx) => {
    const listBln = allPembayaran.filter((p) => p.bulan === bln);
    const masuk = listBln.reduce((s, p) => s + p.nominal, 0);
    const qris = listBln.filter((p) => /qris/i.test(p.metode)).reduce((s, p) => s + p.nominal, 0);
    const rekening = listBln.filter((p) => /transfer|rek|bank/i.test(p.metode)).reduce((s, p) => s + p.nominal, 0);
    const tunai = listBln.filter((p) => /tunai|cash/i.test(p.metode)).reduce((s, p) => s + p.nominal, 0);
    const setor = setorData.find((s) => s.bulan === bln)?.jumlah ?? 0;
    
    const sisaKasBulan = masuk - setor;
    saldoHutangBerjalan = Math.max(0, saldoHutangBerjalan - setor);

    return {
      bulan: bln,
      no: idx + 1,
      donasiQRIS: qris,
      donasiRekening: rekening,
      donasiTunai: tunai,
      jumlahDonasi: masuk,
      setorPihakKetiga: setor,
      sisaKasBulan,
      sisaHutang: saldoHutangBerjalan,
      keterangan: setorData.find((s) => s.bulan === bln)?.keterangan ?? undefined,
    };
  });

  // 5. Akumulasi Seluruh Waktu (All-Time)
  const totalDonasiAll = allPembayaran.reduce((s, p) => s + p.nominal, 0);
  const totalQRISAll = allPembayaran.filter((p) => /qris/i.test(p.metode)).reduce((s, p) => s + p.nominal, 0);
  const totalRekeningAll = allPembayaran.filter((p) => /transfer|rek|bank/i.test(p.metode)).reduce((s, p) => s + p.nominal, 0);
  const totalTunaiAll = allPembayaran.filter((p) => /tunai|cash/i.test(p.metode)).reduce((s, p) => s + p.nominal, 0);

  const totalSetorAll = setorData.reduce((s, p) => s + p.jumlah, 0);
  const sisaSaldoKasAll = totalDonasiAll - totalSetorAll;

  // Realisasi pelunasan hutang: Uang yang telah disetorkan ke pihak ketiga (atau donasi yang sudah siap disetor)
  const totalPelunasanTerealisasi = totalSetorAll > 0 ? totalSetorAll : totalDonasiAll;
  const sisaKewajibanHutang = Math.max(0, totalHutang - totalPelunasanTerealisasi);
  const progressPersenStr = formatPersen(totalPelunasanTerealisasi, totalHutang);

  // 6. Text format siap share ke WhatsApp (Bebas dari double counting 100K)
  const generateWAText = () => {
    const lines = [
      `📋 *LAPORAN DONASI PELUNASAN HUTANG*`,
      `🕌 ${config.nama_masjid ?? "Masjid Darul Hidayah"}`,
      `📍 ${config.alamat ?? "Titik Nol Tanah Merah, Boven Digoel"}`,
      `📅 Periode: *${labelBulan}*`,
      ``,
      `💰 *Daftar Donatur Lunas (${pembayaranBulan.length} Orang):*`,
      ...pembayaranBulan.map(
        (p, i) => `${i + 1}. ${p.nama_donatur} — ${formatRupiah(p.nominal)} (${p.metode})`
      ),
      ``,
      `💳 *Jumlah Nilai Donasi (${labelBulan}):*`,
      `• Via QRIS: *${formatRupiah(donasiQRISBulan)}*`,
      `• Via Rekening Masjid: *${formatRupiah(donasiRekeningBulan)}*`,
      `• Via Tunai: *${formatRupiah(donasiTunaiBulan)}*`,
      donasiLainnyaBulan > 0 ? `• Via Lainnya: *${formatRupiah(donasiLainnyaBulan)}*` : null,
      `= *Jumlah Keseluruhan Donasi: ${formatRupiah(totalKeseluruhanDonasiBulan)}*`,
      ``,
      `📊 *Rekapitulasi Keuangan (${labelBulan}):*`,
      `• Total Donasi Terkumpul Bulan Ini: *${formatRupiah(totalDonasiBulan)}*`,
      `• Disetorkan ke Pihak Ketiga (Toko): *${formatRupiah(totalSetorBulan)}*`,
      `• Sisa Saldo Kas Donasi Bulan Ini: *${formatRupiah(sisaSaldoKasBulan)}*`,
      ``,
      `🏛️ *Akumulasi Pelunasan Hutang Pembangunan:*`,
      `• Total Akumulasi Donasi Diterima: *${formatRupiah(totalDonasiAll)}*`,
      `• Total Disetorkan ke Toko: *${formatRupiah(totalSetorAll)}*`,
      `• Sisa Saldo Kas Panitia (Standby): *${formatRupiah(sisaSaldoKasAll)}*`,
      `• Sisa Kewajiban Hutang: *${formatRupiah(sisaKewajibanHutang)}*`,
      `• Progres Pelunasan: *${progressPersenStr} Terpenuhi*`,
      ``,
      `_Laporan ini disampaikan sebagai bentuk transparansi dan amanah kepengurusan donasi._`,
      `_Jazakumullahu Khairan Katsiran atas partisipasi seluruh donatur tetap._ 🤲`,
    ]
      .filter((l) => l !== null)
      .join("\n");
    return lines;
  };

  const handleCopyWA = () => {
    navigator.clipboard.writeText(generateWAText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };


  const changeBulan = (delta: number) => {
    const d = new Date(bulanTahun.tahun, bulanTahun.bulan - 1 + delta);
    setBulanTahun({ tahun: d.getFullYear(), bulan: d.getMonth() + 1 });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Laporan Transparansi</h1>
          <p className="text-sm text-on-surface-variant">
            Rekap bulanan, format share WhatsApp, dan laporan keuangan
          </p>
        </div>

        {/* Tombol Ekspor Rekap Excel */}
        <button
          onClick={() => exportRekapToExcel(rekapBulan, totalHutang)}
          className="flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface px-3.5 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors self-start sm:self-auto"
        >
          <Download className="h-4 w-4 text-primary" /> Ekspor Rekap Excel
        </button>
      </div>

      {/* Navigasi Bulan */}
      <div className="flex items-center justify-center gap-4 py-1">
        <button
          onClick={() => changeBulan(-1)}
          className="rounded-xl border border-outline-variant bg-surface p-2 text-on-surface-variant hover:bg-surface-container"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="font-bold text-on-surface w-44 text-center text-sm md:text-base">
          {labelBulan}
        </span>
        <button
          onClick={() => changeBulan(1)}
          className="rounded-xl border border-outline-variant bg-surface p-2 text-on-surface-variant hover:bg-surface-container"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Cards Bulan Ini */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard
          label="Donatur Bayar"
          value={pembayaranBulan.length.toString() + " Orang"}
          sub={`Periode ${labelBulan}`}
        />
        <SummaryCard label="Donasi Masuk" value={formatRupiah(totalDonasiBulan)} />
        <SummaryCard
          label="Setor Pihak Ketiga"
          value={formatRupiah(totalSetorBulan)}
          sub={totalSetorBulan > 0 ? "Disalurkan ke toko" : "Belum ada setoran"}
        />
        <SummaryCard
          label="Sisa Saldo Kas"
          value={formatRupiah(sisaSaldoKasBulan)}
          highlight
          sub={sisaSaldoKasBulan === 0 ? "Tersalurkan penuh" : "Tersimpan di kas"}
        />
      </div>

      {/* Rincian Nilai Donasi Berdasarkan Saluran Pembayaran (QRIS, Rekening, Tunai) */}
      <div className="rounded-xl bg-surface shadow-sm ring-1 ring-black/[0.05] dark:ring-white/[0.06] p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-outline-variant/60">

          <div>
            <h2 className="text-base md:text-lg font-semibold text-heading flex items-center gap-2">
              <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <span>Jumlah Nilai Donasi — Periode {labelBulan}</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Rincian dana masuk per saluran pembayaran: QRIS, Rekening Masjid, dan Tunai
            </p>
          </div>
          <div className="text-left sm:text-right bg-surface-container-low px-3.5 py-1.5 rounded-xl border border-outline/40">
            <span className="text-[10px] uppercase font-semibold text-neutral-500 block">
              = Jumlah Keseluruhan Donasi
            </span>
            <span className="font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {formatRupiah(totalKeseluruhanDonasiBulan)}
            </span>
          </div>
        </div>

        {/* 3 Grid Saluran: QRIS, Rekening Kas, Tunai */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* 1. Via QRIS */}
          <div className="rounded-xl border border-outline/60 bg-surface-container-low/40 p-4 transition-all hover:border-emerald-500/50 hover:shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-heading flex items-center gap-1.5">
                <QrCode className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Via QRIS
              </span>
              <span className="text-[11px] font-mono text-neutral-500 bg-surface px-2 py-0.5 rounded-md border border-outline/40">
                {countQRISBulan} Donasi
              </span>
            </div>
            <p className="font-mono text-xl md:text-2xl font-semibold text-heading mt-2 tabular-nums">
              {formatRupiah(donasiQRISBulan)}
            </p>
            <p className="text-[11px] text-neutral-500 mt-1">
              {totalKeseluruhanDonasiBulan > 0
                ? Math.round((donasiQRISBulan / totalKeseluruhanDonasiBulan) * 100)
                : 0}
              % dari total donasi bulan ini
            </p>
          </div>

          {/* 2. Via Rekening Masjid */}
          <div className="rounded-xl border border-outline/60 bg-surface-container-low/40 p-4 transition-all hover:border-emerald-500/50 hover:shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-heading flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Via Rekening Masjid
              </span>
              <span className="text-[11px] font-mono text-neutral-500 bg-surface px-2 py-0.5 rounded-md border border-outline/40">
                {countRekeningBulan} Donasi
              </span>
            </div>
            <p className="font-mono text-xl md:text-2xl font-semibold text-heading mt-2 tabular-nums">
              {formatRupiah(donasiRekeningBulan)}
            </p>
            <p className="text-[11px] text-neutral-500 mt-1">
              {totalKeseluruhanDonasiBulan > 0
                ? Math.round((donasiRekeningBulan / totalKeseluruhanDonasiBulan) * 100)
                : 0}
              % dari total donasi bulan ini
            </p>
          </div>

          {/* 3. Via Tunai */}
          <div className="rounded-xl border border-outline/60 bg-surface-container-low/40 p-4 transition-all hover:border-emerald-500/50 hover:shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-heading flex items-center gap-1.5">
                <Banknote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Via Tunai
              </span>
              <span className="text-[11px] font-mono text-neutral-500 bg-surface px-2 py-0.5 rounded-md border border-outline/40">
                {countTunaiBulan} Donasi
              </span>
            </div>
            <p className="font-mono text-xl md:text-2xl font-semibold text-heading mt-2 tabular-nums">
              {formatRupiah(donasiTunaiBulan)}
            </p>
            <p className="text-[11px] text-neutral-500 mt-1">
              {totalKeseluruhanDonasiBulan > 0
                ? Math.round((donasiTunaiBulan / totalKeseluruhanDonasiBulan) * 100)
                : 0}
              % dari total donasi bulan ini
            </p>
          </div>
        </div>

        {donasiLainnyaBulan > 0 && (
          <div className="mt-3 pt-2 text-xs text-neutral-500 flex justify-between border-t border-outline/40">
            <span>Metode Lainnya ({countLainnyaBulan} donasi):</span>
            <span className="font-mono font-semibold">{formatRupiah(donasiLainnyaBulan)}</span>
          </div>
        )}
      </div>

      {/* Share ke WA Box */}
      <div className="rounded-2xl border border-outline-variant bg-surface p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="font-bold text-on-surface text-base">Format Share Grup WhatsApp</h2>
            <p className="text-xs text-on-surface-variant">
              Teks telah diformat rapi dan siap dikirim ke grup donatur tetap
            </p>
          </div>
          <button
            onClick={handleCopyWA}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all shadow-sm",
              copied
                ? "bg-primary-container text-on-primary-container font-bold"
                : "bg-primary text-on-primary hover:bg-primary/90"
            )}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" /> Teks Berhasil Disalin!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> Salin Teks ke Clipboard
              </>
            )}
          </button>
        </div>
        <pre className="whitespace-pre-wrap rounded-xl bg-surface-container-low border border-outline-variant p-4 text-xs text-on-surface font-mono leading-relaxed max-h-72 overflow-y-auto">
          {generateWAText()}
        </pre>
      </div>

      {/* REKAP TABEL (Sesuai Template Excel Koordinator + Rincian Saluran) */}
      <div className="rounded-2xl border border-outline-variant bg-surface overflow-hidden shadow-xs">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-outline-variant bg-surface-container-low">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            <h2 className="font-bold text-on-surface text-sm md:text-base">
              Rekapitulasi Akumulasi Pelunasan Hutang
            </h2>
          </div>
          <span className="text-xs font-bold text-primary bg-primary-container px-2.5 py-1 rounded-full">
            {progressPersenStr} Terpenuhi
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="text-left px-3 py-3 font-bold text-on-surface-variant">No</th>
                <th className="text-left px-3 py-3 font-bold text-on-surface-variant">Bulan</th>
                <th className="text-right px-3 py-3 font-bold text-on-surface-variant">Via QRIS</th>
                <th className="text-right px-3 py-3 font-bold text-on-surface-variant">Via Rek. Masjid</th>
                <th className="text-right px-3 py-3 font-bold text-on-surface-variant">Via Tunai</th>
                <th className="text-right px-3 py-3 font-bold text-on-surface-variant">Jumlah Donasi</th>
                <th className="text-right px-3 py-3 font-bold text-on-surface-variant">Setor Pihak Ketiga</th>
                <th className="text-right px-3 py-3 font-bold text-on-surface-variant">Sisa Saldo Kas</th>
                <th className="text-right px-3 py-3 font-bold text-on-surface-variant">Sisa Saldo Hutang</th>
                <th className="text-left px-3 py-3 font-bold text-on-surface-variant">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {rekapBulan.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-on-surface-variant">
                    Belum ada data rekapitulasi bulanan
                  </td>
                </tr>
              ) : (
                rekapBulan.map((r) => (
                  <tr
                    key={r.bulan}
                    className={cn(
                      "hover:bg-surface-container-low transition-colors",
                      r.bulan === bulanDB && "bg-primary-container/20 font-medium"
                    )}
                  >
                    <td className="px-3 py-3 text-on-surface-variant">{r.no}</td>
                    <td className="px-3 py-3 font-semibold text-on-surface whitespace-nowrap">{formatBulan(r.bulan)}</td>
                    <td className="px-3 py-3 text-right font-mono text-xs text-neutral-600 dark:text-neutral-300">
                      {r.donasiQRIS > 0 ? formatRupiah(r.donasiQRIS) : "-"}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs text-neutral-600 dark:text-neutral-300">
                      {r.donasiRekening > 0 ? formatRupiah(r.donasiRekening) : "-"}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs text-neutral-600 dark:text-neutral-300">
                      {r.donasiTunai > 0 ? formatRupiah(r.donasiTunai) : "-"}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-semibold text-on-surface">
                      {formatRupiah(r.jumlahDonasi)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs text-on-surface">
                      {r.setorPihakKetiga > 0 ? formatRupiah(r.setorPihakKetiga) : "-"}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatRupiah(r.sisaKasBulan)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-status-danger">
                      {formatRupiah(r.sisaHutang)}
                    </td>
                    <td className="px-3 py-3 text-xs text-on-surface-variant max-w-xs truncate">
                      {r.keterangan ?? "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-surface-container-low border-t-2 border-outline-variant font-mono">
              <tr>
                <td colSpan={2} className="px-3 py-3.5 font-bold font-sans text-on-surface">
                  TOTAL AKUMULASI
                </td>
                <td className="px-3 py-3.5 text-right font-semibold text-xs text-neutral-700 dark:text-neutral-200">
                  {formatRupiah(totalQRISAll)}
                </td>
                <td className="px-3 py-3.5 text-right font-semibold text-xs text-neutral-700 dark:text-neutral-200">
                  {formatRupiah(totalRekeningAll)}
                </td>
                <td className="px-3 py-3.5 text-right font-semibold text-xs text-neutral-700 dark:text-neutral-200">
                  {formatRupiah(totalTunaiAll)}
                </td>
                <td className="px-3 py-3.5 text-right font-bold text-on-surface">
                  {formatRupiah(totalDonasiAll)}
                </td>
                <td className="px-3 py-3.5 text-right font-bold text-on-surface">
                  {formatRupiah(totalSetorAll)}
                </td>
                <td className="px-3 py-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                  {formatRupiah(sisaSaldoKasAll)}
                </td>
                <td className="px-3 py-3.5 text-right font-bold text-status-danger">
                  {formatRupiah(sisaKewajibanHutang)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  highlight,
  action,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl p-4 shadow-sm transition-colors",
        highlight
          ? "bg-primary-container text-on-primary-container ring-1 ring-primary/20"
          : "bg-surface text-on-surface ring-1 ring-black/[0.05] dark:ring-white/[0.06]"
      )}
    >
      <div className="flex items-start justify-between">
        <p
          className={cn(
            "text-[11px] font-semibold uppercase tracking-wider",
            highlight ? "text-on-primary-container/80" : "text-on-surface-variant"
          )}
        >
          {label}
        </p>
        {action}
      </div>
      <p className="text-xl font-black font-mono tabular-nums mt-1 leading-tight tracking-tight">{value}</p>
      {sub && <p className="text-[11px] text-on-surface-variant mt-1">{sub}</p>}
    </div>
  );
}
