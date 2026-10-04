"use client";

import { useState } from "react";
import { formatRupiah, formatTanggal, cn } from "@/lib/utils";
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
  const totalTerbayar = sumberHutangList.reduce((s, h) => s + (h.terbayar || 0), 0);
  const totalSisa = Math.max(0, totalKewajiban - totalTerbayar);
  const persenTerbayar =
    totalKewajiban > 0 ? Math.min(100, Math.round((totalTerbayar / totalKewajiban) * 100)) : 0;

  return (
    <div className="space-y-8">
      {/* 1. Header Section Transparansi (Vercel Style) */}
      <div className="rounded-3xl border border-outline-variant bg-surface p-6 md:p-8 shadow-xs relative overflow-hidden">
        {/* Hairline Top Glow Accent */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-2.5">
              <Building2 className="h-3.5 w-3.5" />
              <span>Transparansi Hutang Pembangunan</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-on-surface tracking-tight">
              Rincian Pihak Ketiga & Realisasi Pelunasan
            </h2>
            <p className="text-xs md:text-sm text-on-surface-variant mt-1 max-w-xl">
              Penyaluran dana donasi ke toko material dan supplier pembangunan Masjid Darul Hidayah
              disertai bukti kwitansi resmi yang dapat diakses oleh publik.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-surface-container-low border border-outline-variant rounded-2xl p-4 shrink-0">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                Total Terlunasi
              </p>
              <p className="font-mono text-xl font-black text-status-success tabular-nums mt-0.5">
                {formatRupiah(totalTerbayar)}
              </p>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                {persenTerbayar}% dari total {formatRupiah(totalKewajiban)}
              </p>
            </div>
          </div>
        </div>

        {/* 2. Grid Kartu Sumber Hutang (Vercel Modern Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sumberHutangList.map((h) => {
            const sisa = Math.max(0, h.nominal - h.terbayar);
            const persen = h.nominal > 0 ? Math.min(100, Math.round((h.terbayar / h.nominal) * 100)) : 0;
            const kwitansiCount = riwayatWithKreditor.filter((p) => p.sumber_hutang_id === h.id && p.bukti_url).length;

            return (
              <div
                key={h.id}
                className={cn(
                  "rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between bg-surface-container-low/40 hover:bg-surface-container-low hover:border-primary/40",
                  selectedFilter === h.id
                    ? "border-primary ring-2 ring-primary/20 bg-surface-container-low"
                    : "border-outline-variant"
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-bold text-sm text-on-surface leading-snug">{h.nama_kreditor}</p>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0 inline-flex items-center gap-1",
                        h.status === "lunas"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : h.status === "sebagian"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                      )}
                    >
                      {h.status === "lunas" ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : h.status === "sebagian" ? (
                        <Clock className="h-3 w-3" />
                      ) : (
                        <ShieldAlert className="h-3 w-3" />
                      )}
                      {h.status.replace("_", " ")}
                    </span>
                  </div>

                  <p className="text-xs text-on-surface-variant line-clamp-2">
                    {h.keterangan || "Material pembangunan struktur fisik masjid"}
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-outline-variant space-y-2.5">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-on-surface-variant text-[11px]">Terbayar:</span>
                    <span className="font-mono font-bold text-status-success tabular-nums">
                      {formatRupiah(h.terbayar)} ({persen}%)
                    </span>
                  </div>

                  {/* Vercel Glowing Micro Progress Bar */}
                  <div className="w-full bg-surface-container-high rounded-full h-1.5 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        h.status === "lunas"
                          ? "bg-emerald-500"
                          : h.status === "sebagian"
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      )}
                      style={{ width: `${persen}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-on-surface-variant text-[11px]">Sisa Kewajiban:</span>
                    <span className="font-mono font-black text-status-danger tabular-nums">
                      {formatRupiah(sisa)}
                    </span>
                  </div>

                  {/* Tombol Filter Timeline Khusus Toko ini */}
                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedFilter((prev) => (prev === h.id ? "all" : h.id))
                      }
                      className={cn(
                        "text-[11px] font-semibold flex items-center gap-1 transition-colors px-2.5 py-1 rounded-lg",
                        selectedFilter === h.id
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container hover:bg-surface-container-high text-on-surface"
                      )}
                    >
                      <span>{kwitansiCount} Kwitansi</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                    <span className="text-[10px] text-on-surface-variant font-mono">
                      Pagu: {formatRupiah(h.nominal)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Timeline Realisasi Pembayaran & Bukti Kwitansi (Vercel Geist Timeline) */}
      <div className="rounded-3xl border border-outline-variant bg-surface p-6 md:p-8 shadow-xs relative overflow-hidden">
        {/* Hairline Top Glow Accent */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-lg md:text-xl font-bold text-on-surface flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <span>Timeline Pembayaran Hutang ke Toko</span>
            </h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Riwayat kronologis pelunasan hutang yang telah disalurkan pengurus masjid
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedFilter("all")}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors",
                selectedFilter === "all"
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-low border border-outline-variant text-on-surface-variant hover:text-on-surface"
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
                    "rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors",
                    selectedFilter === h.id
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container-low border border-outline-variant text-on-surface-variant hover:text-on-surface"
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
          <div className="rounded-2xl border border-dashed border-outline-variant p-10 text-center bg-surface-container-low/30">
            <Receipt className="h-8 w-8 mx-auto mb-2 text-on-surface-variant opacity-40" />
            <p className="text-sm font-semibold text-on-surface">Belum Ada Transaksi Pembayaran</p>
            <p className="text-xs text-on-surface-variant mt-1">
              Catatan pembayaran cicilan dan foto bukti kwitansi akan muncul di sini secara otomatis
              setelah diinput oleh pengurus.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 md:pl-8 border-l-2 border-outline-variant space-y-6 my-2">
            {filteredRiwayat.map((p, idx) => (
              <div key={p.id} className="relative group">
                {/* Node Bullet Indicator */}
                <div className="absolute -left-[31px] md:-left-[39px] top-1 flex h-6 w-6 md:h-7 md:w-7 items-center justify-center rounded-full bg-surface border-2 border-emerald-500 text-emerald-500 shadow-sm transition-transform group-hover:scale-110">
                  <CheckCircle2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </div>

                {/* Event Card */}
                <div className="rounded-2xl border border-outline-variant bg-surface-container-low/50 hover:bg-surface-container-low hover:border-emerald-500/30 p-4 md:p-5 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-base md:text-lg font-black text-status-success tabular-nums">
                        {formatRupiah(p.nominal)}
                      </span>
                      <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {p.metode}
                      </span>
                      {p.no_referensi && (
                        <span className="font-mono text-xs text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-md">
                          Ref: {p.no_referensi}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-mono">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatTanggal(p.tanggal_bayar)}</span>
                    </div>
                  </div>

                  <p className="text-sm font-bold text-on-surface">
                    Dibayarkan ke: <span className="text-primary">{p.nama_kreditor}</span>
                  </p>

                  {p.keterangan && (
                    <p className="text-xs text-on-surface-variant mt-1.5 italic bg-surface/60 rounded-xl p-2 border border-outline-variant/60">
                      &quot;{p.keterangan}&quot;
                    </p>
                  )}

                  <div className="mt-3.5 pt-3 border-t border-outline-variant flex flex-wrap items-center justify-between gap-3 text-xs">
                    <span className="text-[11px] text-on-surface-variant flex items-center gap-1">
                      <User className="h-3 w-3 opacity-60" /> Dicatat oleh:{" "}
                      <strong>{p.dicatat_oleh_name || "Pengurus Masjid"}</strong>
                    </span>

                    {/* Tombol Lihat Kwitansi (View) */}
                    {p.bukti_url ? (
                      p.bukti_url.endsWith(".pdf") ? (
                        <a
                          href={p.bukti_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary-container px-3.5 py-1.5 text-xs font-bold text-on-primary-container hover:bg-primary-container/80 transition-colors shadow-xs"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>Lihat Dokumen PDF Kwitansi</span>
                          <ExternalLink className="h-3 w-3" />
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
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 text-xs font-bold transition-all shadow-xs group/btn"
                        >
                          <Eye className="h-3.5 w-3.5 group-hover/btn:scale-110 transition-transform" />
                          <span>Lihat Bukti Kwitansi</span>
                        </button>
                      )
                    ) : (
                      <span className="text-[11px] text-on-surface-variant/60 italic">
                        Tanpa lampiran file
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
                <p className="text-sm font-bold flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-emerald-400" />
                  <span>Bukti Kwitansi: {lightboxData.kreditor}</span>
                </p>
                <p className="text-xs text-neutral-300 font-mono mt-0.5">
                  Nominal: <strong className="text-emerald-400">{formatRupiah(lightboxData.nominal)}</strong> •{" "}
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
    </div>
  );
}
