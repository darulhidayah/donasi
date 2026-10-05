"use client";

import { useState } from "react";
import { formatRupiah, formatTanggal, formatPersen, hitungProgress, cn } from "@/lib/utils";
import {
  Building2, Receipt, Eye, ExternalLink, X, CheckCircle2,
  Clock, ShieldAlert, Calendar, User, FileText,
  ChevronRight
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
  const persenTerbayar = formatPersen(totalTerbayar, totalKewajiban);

  return (
    <section className="space-y-6">
      {/* 1. Header Section Transparansi */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-1">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-dark dark:text-primary uppercase tracking-wider mb-1 font-label">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary-dark dark:text-primary">
                <Building2 className="h-3.5 w-3.5" />
              </span>
              <span>Transparansi Dana Pembangunan</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold font-headline text-on-surface tracking-tight">
              Rincian Sumber Hutang ke Toko / Supplier
            </h2>
            <p className="text-xs md:text-sm text-on-surface-variant mt-1">
              Penyaluran dana donasi ke toko material dan supplier pembangunan Masjid Darul Hidayah
              disertai bukti kwitansi resmi yang dapat diakses oleh publik.
            </p>
          </div>

          <div className="flex items-baseline gap-2 text-xs text-on-surface-variant sm:text-right shrink-0">
            <span>Total Terlunasi:</span>
            <span className="font-mono text-base md:text-lg font-bold text-primary-dark dark:text-primary tabular-nums">
              {formatRupiah(totalTerbayar)}
            </span>
            <span className="text-[11px] text-on-surface-variant/70">
              ({persenTerbayar} dari {formatRupiah(totalKewajiban)})
            </span>
          </div>
        </div>

        {/* 2. Grid Kartu Toko (Bento Cards) */}
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
                  "bento-card flex flex-col justify-between hover-lift relative overflow-hidden group",
                  isSelected && "ring-2 ring-primary border-primary/50 shadow-soft"
                )}
              >
                <Building2 className="absolute right-3 top-3 h-12 w-12 opacity-15 text-primary pointer-events-none" />

                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-bold text-[15px] font-headline text-on-surface leading-snug">
                      {h.nama_kreditor}
                    </p>
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-2.5 py-0.5 rounded-full capitalize shrink-0 inline-flex items-center gap-1",
                        tokoStatus === "lunas"
                          ? "bg-status-success text-on-status-success"
                          : tokoStatus === "sebagian"
                          ? "bg-primary-container text-on-primary-container"
                          : "bg-status-danger text-on-status-danger"
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

                <div className="mt-5 pt-3.5 border-t border-outline-variant/30 space-y-2.5">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-on-surface-variant text-[11px]">Terbayar:</span>
                    <span className="font-mono font-bold text-primary-dark dark:text-primary tabular-nums">
                      {formatRupiah(tokoBayar)} ({persenStr})
                    </span>
                  </div>

                  {/* Micro Progress Bar */}
                  <div className="w-full bg-surface-container-high/40 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        tokoStatus === "lunas"
                          ? "bg-status-success"
                          : tokoStatus === "sebagian"
                          ? "bg-primary"
                          : "bg-status-danger"
                      )}
                      style={{ width: `${Math.max(persenNum, tokoBayar > 0 ? 2 : 0)}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-on-surface-variant text-[11px]">Sisa Kewajiban:</span>
                    <span className="font-mono font-semibold text-status-danger tabular-nums">
                      {formatRupiah(sisa)}
                    </span>
                  </div>

                  {/* Filter action */}
                  <div className="pt-2 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedFilter((prev) => (prev === h.id ? "all" : h.id))
                      }
                      className={cn(
                        "inline-flex items-center gap-1.5 text-[11px] font-semibold transition-all py-1 px-2.5 rounded-lg active:scale-95",
                        isSelected
                          ? "bg-primary-container text-on-primary-container shadow-2xs"
                          : "text-primary-dark dark:text-primary hover:bg-primary/10"
                      )}
                    >
                      <Receipt className="h-3.5 w-3.5" />
                      <span>{kwitansiCount > 0 ? `${kwitansiCount} Kwitansi` : "Belum Ada Kwitansi"}</span>
                      <ChevronRight className="h-3 w-3 opacity-60" />
                    </button>
                    <span className="text-[10px] text-on-surface-variant/70 font-mono">
                      Pagu: {formatRupiah(h.nominal)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Timeline Realisasi Pembayaran & Bukti Kwitansi */}
      <div className="pt-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-outline-variant/30">
          <div>
            <h3 className="text-base md:text-lg font-bold font-headline text-on-surface flex items-center gap-2 tracking-tight">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary-dark dark:text-primary">
                <Receipt className="h-4 w-4" />
              </span>
              <span>Riwayat Realisasi Pelunasan & Bukti Kwitansi</span>
            </h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Klik &quot;Lihat Kwitansi&quot; untuk memeriksa foto bukti asli kwitansi pembayaran ke toko.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedFilter("all")}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all active:scale-95",
                selectedFilter === "all"
                  ? "bg-primary-container text-on-primary-container shadow-soft"
                  : "bg-surface-variant text-on-surface-variant hover:bg-primary/10 hover:text-primary-dark dark:hover:text-primary border border-outline-variant/30"
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
                    "rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all active:scale-95",
                    selectedFilter === h.id
                      ? "bg-primary-container text-on-primary-container shadow-soft"
                      : "bg-surface-variant text-on-surface-variant hover:bg-primary/10 hover:text-primary-dark dark:hover:text-primary border border-outline-variant/30"
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
          <div className="rounded-2xl border border-dashed border-outline-variant/60 p-8 text-center bg-surface-container-low/30">
            <Receipt className="h-8 w-8 mx-auto mb-2 text-on-surface-variant opacity-40" />
            <p className="text-sm font-bold font-headline text-on-surface">Belum Ada Transaksi Pembayaran</p>
            <p className="text-xs text-on-surface-variant mt-1">
              Catatan pembayaran cicilan dan foto bukti kwitansi akan muncul di sini secara otomatis
              setelah diinput oleh pengurus.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 md:pl-7 border-l-2 border-primary/25 space-y-4 my-2">
            {filteredRiwayat.map((p) => (
              <div key={p.id} className="relative group">
                {/* Node Bullet Indicator */}
                <div className="absolute -left-[32px] md:-left-[36px] top-2 flex h-5 w-5 md:h-6 md:w-6 items-center justify-center rounded-full bg-surface-container-lowest border-2 border-primary text-primary-dark dark:text-primary shadow-xs transition-transform group-hover:scale-110">
                  <CheckCircle2 className="h-3 w-3 md:h-3.5 md:w-3.5" />
                </div>

                {/* Event Card */}
                <div className="bento-card p-4 hover-lift">
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1.5 mb-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-base font-bold text-primary-dark dark:text-primary tabular-nums tracking-tight">
                        {formatRupiah(p.nominal)}
                      </span>
                      <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-primary/10 text-primary-dark dark:text-primary border border-primary/20">
                        {p.metode}
                      </span>
                      {p.no_referensi && (
                        <span className="font-mono text-[11px] text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded-md">
                          Ref: {p.no_referensi}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-mono">
                      <Calendar className="h-3.5 w-3.5 opacity-60 text-primary" />
                      <span>{formatTanggal(p.tanggal_bayar)}</span>
                    </div>
                  </div>

                  <p className="text-xs font-medium text-on-surface">
                    Dibayarkan ke: <span className="font-bold text-primary-dark dark:text-primary">{p.nama_kreditor}</span>
                  </p>

                  {p.keterangan && (
                    <p className="text-xs text-on-surface-variant mt-1.5 italic bg-surface-container-low/50 rounded-xl p-2.5 border border-outline-variant/30">
                      &quot;{p.keterangan}&quot;
                    </p>
                  )}

                  <div className="mt-3 pt-2.5 border-t border-outline-variant/30 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                    <span className="text-[11px] text-on-surface-variant flex items-center gap-1">
                      <User className="h-3 w-3 opacity-50" /> Dicatat oleh:{" "}
                      <span className="font-semibold text-on-surface">{p.dicatat_oleh_name || "Pengurus Masjid"}</span>
                    </span>

                    {/* Tombol Lihat Kwitansi (View) */}
                    {p.bukti_url ? (
                      p.bukti_url.endsWith(".pdf") ? (
                        <a
                          href={p.bukti_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 hover:bg-primary/10 bg-surface px-3 py-1.5 text-xs font-semibold text-primary-dark dark:text-primary transition-all shadow-2xs"
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
                          className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 hover:bg-primary/10 bg-surface px-3 py-1.5 text-xs font-semibold text-primary-dark dark:text-primary transition-all shadow-2xs group/btn active:scale-95"
                        >
                          <Eye className="h-3.5 w-3.5 group-hover/btn:scale-110 transition-transform text-primary" />
                          <span>Lihat Kwitansi</span>
                        </button>
                      )
                    ) : (
                      <span className="text-[11px] text-on-surface-variant/60 italic">
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
          <div className="relative z-10 max-w-3xl w-full max-h-[92vh] flex flex-col items-center animate-fade-in-scale">
            {/* Header Modal Lightbox */}
            <div className="w-full flex items-center justify-between pb-3 text-white">
              <div>
                <p className="text-sm font-bold font-headline flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-primary-light" />
                  <span>Bukti Kwitansi: {lightboxData.kreditor}</span>
                </p>
                <p className="text-xs text-neutral-300 font-mono mt-0.5">
                  Nominal: <strong className="text-primary-light font-bold">{formatRupiah(lightboxData.nominal)}</strong> •{" "}
                  {formatTanggal(lightboxData.tanggal)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxData.url}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="rounded-xl p-2 bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Unduh / Buka di Tab Baru"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  onClick={() => setLightboxData(null)}
                  className="rounded-xl p-2 bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Tutup"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Container Foto Kwitansi */}
            <div className="relative rounded-2xl overflow-hidden bg-black max-h-[75vh] w-full flex items-center justify-center shadow-2xl border border-white/10">
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
