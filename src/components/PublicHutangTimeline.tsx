"use client";

import { useState } from "react";
import { formatRupiah, formatTanggal, formatPersen, hitungProgress, cn } from "@/lib/utils";
import {
  Building2, Receipt, Eye, ExternalLink, X, CheckCircle2,
  Clock, ShieldAlert, ArrowUpRight, Calendar, User, FileText,
  ChevronRight, Filter
} from "lucide-react";
import type { Database } from "@/lib/database.types";

type SumberHutang = Database["public"]["Tables"]["sumber_hutang"]["Row"];
type PembayaranHutang = Database["public"]["Tables"]["pembayaran_hutang"]["Row"];

interface Props {
  sumberHutangList: SumberHutang[];
  riwayatPembayaranList: (PembayaranHutang & { nama_kreditor?: string })[];
}

export default function PublicHutangTimeline({
  sumberHutangList,
  riwayatPembayaranList,
}: Props) {
  const [selectedFilter, setSelectedFilter] = useState<number | "all">("all");
  const [lightboxData, setLightboxData] = useState<{
    url: string;
    title: string;
    kreditor: string;
    nominal: number;
    tanggal: string;
    keterangan?: string | null;
  } | null>(null);

  // Map nama kreditor jika belum ada
  const riwayatWithKreditor = riwayatPembayaranList.map((p) => {
    const target = sumberHutangList.find((h) => h.id === p.sumber_hutang_id);
    return {
      ...p,
      nama_kreditor: p.nama_kreditor || target?.nama_kreditor || "Pihak Kreditor",
    };
  });

  // Filter riwayat berdasarkan toko yang dipilih
  const filteredRiwayat =
    selectedFilter === "all"
      ? riwayatWithKreditor
      : riwayatWithKreditor.filter((p) => p.sumber_hutang_id === selectedFilter);

  const totalKewajiban = sumberHutangList.reduce((s, h) => s + h.nominal, 0);
  const totalTerbayar = sumberHutangList.reduce((s, h) => {
    const tokoBayar = riwayatWithKreditor
      .filter((p) => p.sumber_hutang_id === h.id)
      .reduce((acc, p) => acc + (p.nominal || 0), 0);
    return s + Math.max(h.terbayar || 0, tokoBayar);
  }, 0);
  const totalSisa = Math.max(0, totalKewajiban - totalTerbayar);
  const persenTerbayar = formatPersen(totalTerbayar, totalKewajiban);

  return (
    <section className="space-y-6">
      {/* 1. Header Section Transparansi (Tanpa box pembungkus luar) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-1">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">
              <Building2 className="h-3.5 w-3.5" />
              <span>Transparansi Dana Pembangunan</span>
            </div>
            <h2 className="text-xl md:text-2xl font-semibold text-heading tracking-tight">
              Rincian Sumber Hutang ke Toko / Supplier
            </h2>
            <p className="text-xs md:text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-xl">
              Penyaluran dana donasi ke toko material dan supplier pembangunan Masjid Darul Hidayah
              disertai bukti kwitansi resmi yang dapat diakses oleh publik.
            </p>
          </div>

          <div className="flex items-baseline gap-2 text-xs text-neutral-500 sm:text-right shrink-0">
            <span>Total Terlunasi:</span>
            <span className="font-mono text-base md:text-lg font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {formatRupiah(totalTerbayar)}
            </span>
            <span className="text-[11px] text-neutral-400">
              ({persenTerbayar} dari {formatRupiah(totalKewajiban)})
            </span>
          </div>
        </div>

        {/* 2. Grid Kartu Toko (Langsung level 1: Toko A, Toko B, Toko C tanpa box luar) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sumberHutangList.map((h) => {
            const hBayarList = riwayatWithKreditor.filter((p) => p.sumber_hutang_id === h.id);
            const tokoBayar = Math.max(
              h.terbayar || 0,
              hBayarList.reduce((acc, p) => acc + (p.nominal || 0), 0)
            );
            const sisa = Math.max(0, h.nominal - tokoBayar);
            const persenStr = formatPersen(tokoBayar, h.nominal);
            const persenNum = hitungProgress(tokoBayar, h.nominal);
            const tokoStatus =
              tokoBayar >= h.nominal && h.nominal > 0
                ? "lunas"
                : tokoBayar > 0
                ? "sebagian"
                : h.status;
            const kwitansiCount = hBayarList.filter((p) => p.bukti_url).length;
            const isSelected = selectedFilter === h.id;

            return (
              <div
                key={h.id}
                className={cn(
                  "rounded-xl transition-all duration-200 p-5 flex flex-col justify-between bg-surface",
                  isSelected
                    ? "ring-2 ring-emerald-500 shadow-sm"
                    : "shadow-sm ring-1 ring-black/[0.05] dark:ring-white/[0.06] hover:ring-emerald-500/40"
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-semibold text-[15px] text-heading leading-snug tracking-tight">
                      {h.nama_kreditor}
                    </p>
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize shrink-0 inline-flex items-center gap-1",
                        tokoStatus === "lunas"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : tokoStatus === "sebagian"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                      )}
                    >
                      {tokoStatus === "lunas" ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : tokoStatus === "sebagian" ? (
                        <Clock className="h-3 w-3" />
                      ) : (
                        <ShieldAlert className="h-3 w-3" />
                      )}
                      {tokoStatus.replace("_", " ")}
                    </span>
                  </div>

                  <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                    {h.keterangan || "Material pembangunan struktur fisik masjid"}
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-outline/50 space-y-2.5">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-neutral-500 text-[11px]">Terbayar:</span>
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatRupiah(tokoBayar)} ({persenStr})
                    </span>
                  </div>

                  {/* Micro Progress Bar */}
                  <div className="w-full bg-surface-container-high rounded-full h-1.5 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        tokoStatus === "lunas"
                          ? "bg-emerald-500"
                          : tokoStatus === "sebagian"
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      )}
                      style={{ width: `${Math.max(persenNum, tokoBayar > 0 ? 2 : 0)}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-neutral-500 text-[11px]">Sisa Kewajiban:</span>
                    <span className="font-mono font-semibold text-status-danger tabular-nums">
                      {formatRupiah(sisa)}
                    </span>
                  </div>

                  {/* Filter action langsung tanpa box kwitansi berlapis */}
                  <div className="pt-2 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedFilter((prev) => (prev === h.id ? "all" : h.id))
                      }
                      className={cn(
                        "inline-flex items-center gap-1.5 text-[11px] font-medium transition-colors py-1 px-2 rounded-md",
                        isSelected
                          ? "bg-emerald-600 text-white"
                          : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                      )}
                    >
                      <Receipt className="h-3 w-3" />
                      <span>{kwitansiCount > 0 ? `${kwitansiCount} Kwitansi Tersedia` : "Belum Ada Kwitansi"}</span>
                      <ChevronRight className="h-3 w-3 opacity-60" />
                    </button>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      Pagu: {formatRupiah(h.nominal)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Timeline Realisasi Pembayaran & Bukti Kwitansi (Tanpa box pembungkus luar) */}
      <div className="pt-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-outline/50">
          <div>
            <h3 className="text-base md:text-lg font-semibold text-heading flex items-center gap-2 tracking-tight">
              <Receipt className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
              <span>Riwayat Realisasi Pelunasan & Bukti Kwitansi</span>
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Klik &quot;Lihat Kwitansi&quot; untuk memeriksa foto bukti asli kwitansi pembayaran ke toko.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedFilter("all")}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors",
                selectedFilter === "all"
                  ? "bg-emerald-600 text-white"
                  : "bg-surface border border-outline/70 text-neutral-600 dark:text-neutral-300 hover:border-emerald-500"
              )}
            >
              Semua ({riwayatWithKreditor.length})
            </button>
            {sumberHutangList.map((h) => {
              const count = riwayatWithKreditor.filter((p) => p.sumber_hutang_id === h.id).length;
              if (count === 0) return null;
              return (
                <button
                  key={h.id}
                  onClick={() => setSelectedFilter(h.id)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors",
                    selectedFilter === h.id
                      ? "bg-emerald-600 text-white"
                      : "bg-surface border border-outline/70 text-neutral-600 dark:text-neutral-300 hover:border-emerald-500"
                  )}
                >
                  {h.nama_kreditor.split(" ")[0]} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Timeline Body */}
        {filteredRiwayat.length === 0 ? (
          <div className="rounded-xl border border-dashed border-outline/70 p-8 text-center bg-surface-container-low/30">
            <Receipt className="h-8 w-8 mx-auto mb-2 text-on-surface-variant opacity-40" />
            <p className="text-sm font-semibold text-on-surface">Belum Ada Transaksi Pembayaran</p>
            <p className="text-xs text-on-surface-variant mt-1">
              Catatan pembayaran cicilan dan foto bukti kwitansi akan muncul di sini secara otomatis
              setelah diinput oleh pengurus.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 md:pl-7 border-l border-outline/70 space-y-5 my-2">
            {filteredRiwayat.map((p) => (
              <div key={p.id} className="relative group">
                {/* Node Bullet Indicator */}
                <div className="absolute -left-[31px] md:-left-[35px] top-1.5 flex h-5 w-5 md:h-6 md:w-6 items-center justify-center rounded-full bg-surface border border-emerald-500/80 text-emerald-500 shadow-xs transition-transform group-hover:scale-110">
                  <CheckCircle2 className="h-3 w-3 md:h-3.5 md:w-3.5" />
                </div>

                {/* Event Card */}
                <div className="rounded-xl bg-surface shadow-sm ring-1 ring-black/[0.05] dark:ring-white/[0.06] p-4 transition-all hover:ring-emerald-500/30">
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1.5 mb-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-base font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight">
                        {formatRupiah(p.nominal)}
                      </span>
                      <span className="rounded-md px-2 py-0.5 text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                        {p.metode}
                      </span>
                      {p.no_referensi && (
                        <span className="font-mono text-[11px] text-neutral-400 bg-surface-container-low px-2 py-0.5 rounded-md">
                          Ref: {p.no_referensi}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-mono">
                      <Calendar className="h-3.5 w-3.5 opacity-60" />
                      <span>{formatTanggal(p.tanggal_bayar)}</span>
                    </div>
                  </div>

                  <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                    Dibayarkan ke: <span className="text-heading font-semibold">{p.nama_kreditor}</span>
                  </p>

                  {p.keterangan && (
                    <p className="text-xs text-neutral-500 mt-1.5 italic bg-surface-container-low/60 rounded-lg p-2 border border-outline/30">
                      &quot;{p.keterangan}&quot;
                    </p>
                  )}

                  <div className="mt-3 pt-2.5 border-t border-outline/40 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                    <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                      <User className="h-3 w-3 opacity-50" /> Dicatat oleh:{" "}
                      <span className="font-medium text-neutral-600 dark:text-neutral-300">{p.dicatat_oleh_name || "Pengurus Masjid"}</span>
                    </span>

                    {/* Tombol Lihat Kwitansi (View) */}
                    {p.bukti_url ? (
                      p.bukti_url.endsWith(".pdf") ? (
                        <a
                          href={p.bukti_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-outline/70 hover:border-emerald-500 bg-surface px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 transition-all shadow-xs"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>Dokumen PDF</span>
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setLightboxData({
                              url: p.bukti_url!,
                              title: `Kwitansi Pembayaran #${p.id}`,
                              kreditor: p.nama_kreditor || "Pihak Kreditor",
                              nominal: p.nominal,
                              tanggal: p.tanggal_bayar,
                              keterangan: p.keterangan,
                            })
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-outline/70 hover:border-emerald-500 bg-surface px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 transition-all shadow-xs group/btn"
                        >
                          <Eye className="h-3.5 w-3.5 group-hover/btn:scale-110 transition-transform" />
                          <span>Lihat Kwitansi</span>
                        </button>
                      )
                    ) : (
                      <span className="text-[11px] text-neutral-400 italic">
                        Tanpa lampiran
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Lightbox Modal Resolusi Penuh untuk Kwitansi Publik */}
      {lightboxData && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-xs transition-opacity"
            onClick={() => setLightboxData(null)}
          />
          <div className="relative z-10 max-w-3xl w-full max-h-[92vh] flex flex-col items-center">
            {/* Header Modal Lightbox */}
            <div className="w-full flex items-center justify-between pb-3 text-white">
              <div>
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-emerald-400" />
                  <span>Bukti Kwitansi: {lightboxData.kreditor}</span>
                </p>
                <p className="text-xs text-neutral-300 font-mono mt-0.5">
                  Nominal: <strong className="text-emerald-400 font-semibold">{formatRupiah(lightboxData.nominal)}</strong> •{" "}
                  {formatTanggal(lightboxData.tanggal)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxData.url}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="rounded-lg p-2 bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Unduh / Buka di Tab Baru"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  onClick={() => setLightboxData(null)}
                  className="rounded-lg p-2 bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Tutup"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Container Foto Kwitansi */}
            <div className="relative rounded-xl overflow-hidden bg-black max-h-[75vh] w-full flex items-center justify-center shadow-2xl border border-white/10">
              <img
                src={lightboxData.url}
                alt="Bukti Kwitansi Resmi"
                className="max-h-[75vh] w-auto max-w-full object-contain"
              />
            </div>

            {lightboxData.keterangan && (
              <p className="text-xs text-neutral-300 mt-2 text-center italic">
                &quot;{lightboxData.keterangan}&quot;
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
