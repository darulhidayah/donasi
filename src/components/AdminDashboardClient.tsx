"use client";

import Link from "next/link";
import { formatRupiah, hitungProgress, formatPersen, NAMA_BULAN } from "@/lib/utils";
import {
  CheckCircle2, XCircle, Users, Banknote, Building2,
  ArrowRight, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/database.types";

type SumberHutang = Database["public"]["Tables"]["sumber_hutang"]["Row"];

interface Props {
  totalHutang: number;
  totalTerkumpul: number;
  totalSetor: number;
  sisaHutang: number;
  totalBulanIni: number;
  donaturAktif: Array<{ id: number; nama: string; no_hp: string | null; minimal_bulanan: number }>;
  pembayaranBulanIni: Array<{
    id: number;
    donatur_id: number;
    nama_donatur: string;
    nominal: number;
    metode: string;
    tgl_bayar: string;
  }>;
  sudahBayarIds: Set<number>;
  bulanIni: string;
  config: Record<string, string>;
  sumberHutangList: SumberHutang[];
}

export default function AdminDashboardClient({
  totalHutang,
  totalTerkumpul,
  totalSetor,
  sisaHutang,
  totalBulanIni,
  donaturAktif,
  pembayaranBulanIni,
  sudahBayarIds,
  config,
  sumberHutangList,
}: Props) {
  const progress = hitungProgress(totalTerkumpul, totalHutang);
  const progressStr = formatPersen(totalTerkumpul, totalHutang);
  const sudahBayar = donaturAktif.filter((d) => sudahBayarIds.has(d.id));
  const belumBayar = donaturAktif.filter((d) => !sudahBayarIds.has(d.id));

  const now = new Date();
  const labelBulanIni = `${NAMA_BULAN[now.getMonth()]} ${now.getFullYear()}`;

  const nominalMinimal = parseInt(config.minimal_donasi || "50000", 10) || 50000;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold font-headline text-on-surface">Dasbor Admin</h1>
        <p className="mt-1 text-sm text-on-surface-variant font-body">
          Ringkasan progres pelunasan hutang {config.nama_masjid ?? "Masjid Darul Hidayah"}
        </p>
      </div>

      {/* Progress Bar Hutang Terpadu (Aurora Panel) */}
      <div className="aurora-panel p-6 relative overflow-hidden animate-fade-in-scale">
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary-light to-transparent" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant font-label">
              Total Kewajiban Hutang Pembangunan
            </p>
            <p className="font-headline text-2xl md:text-3xl font-bold text-on-surface mt-1">
              {formatRupiah(totalHutang)}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant font-label">
              Sisa Hutang Belum Lunas
            </p>
            <p className="font-headline text-2xl md:text-3xl font-bold text-status-danger mt-1">
              {formatRupiah(sisaHutang)}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-surface-container-high/40 rounded-full h-2 overflow-hidden mt-1">
          <div
            className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-primary to-primary-light"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex justify-between items-center mt-3 text-xs">
          <span className="text-on-surface-variant font-medium">
            Total Donasi Dihimpun:{" "}
            <strong className="font-mono tabular-nums text-on-surface font-bold">{formatRupiah(totalTerkumpul)}</strong>
          </span>
          <span className="font-bold text-on-primary-container bg-primary-container px-3 py-0.5 rounded-full text-[11px] shadow-2xs font-label">
            {progressStr} Tercapai
          </span>
        </div>

        {totalSetor > 0 && (
          <p className="mt-3 pt-3 border-t border-outline-variant/30 text-xs text-on-surface-variant">
            Realisasi Penyaluran: <strong className="font-mono text-status-success font-bold">{formatRupiah(totalSetor)}</strong> telah disetorkan ke toko kreditor
            {totalTerkumpul > totalSetor && (
              <span> • Sisa Saldo Kas: <strong className="font-mono text-primary-dark dark:text-primary font-bold">{formatRupiah(totalTerkumpul - totalSetor)}</strong></span>
            )}
          </p>
        )}
      </div>

      {/* 4 Stat Cards Bento Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 stagger-children">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          watermark={<Users className="h-12 w-12" />}
          label="Donatur Aktif"
          value={donaturAktif.length.toString() + " Orang"}
          sub={`Target min. ${formatRupiah(nominalMinimal)}`}
          theme="primary"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          watermark={<CheckCircle2 className="h-12 w-12" />}
          label="Sudah Bayar"
          value={sudahBayar.length.toString() + " Orang"}
          sub={labelBulanIni}
          theme="success"
        />
        <StatCard
          icon={<XCircle className="h-5 w-5" />}
          watermark={<XCircle className="h-12 w-12" />}
          label="Belum Bayar"
          value={belumBayar.length.toString() + " Orang"}
          sub={labelBulanIni}
          theme="danger"
        />
        <StatCard
          icon={<Banknote className="h-5 w-5" />}
          watermark={<Banknote className="h-12 w-12" />}
          label="Masuk Bulan Ini"
          value={formatRupiah(totalBulanIni)}
          sub={labelBulanIni}
          theme="gold"
        />
      </div>

      {/* Rincian Sumber Hutang (Toko A, Toko B, dll) */}
      <div className="bento-card p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary-dark dark:text-primary">
              <Building2 className="h-4.5 w-4.5" />
            </span>
            <h2 className="font-bold font-headline text-base text-on-surface">Rincian Sumber Hutang ke Toko / Supplier</h2>
          </div>
          <Link
            href="/admin/hutang"
            className="flex items-center gap-1 text-xs font-semibold text-primary-dark dark:text-primary hover:underline font-label"
          >
            Kelola Rincian <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {sumberHutangList.length === 0 ? (
            <p className="text-xs text-on-surface-variant col-span-3 py-6 text-center">
              Belum ada rincian toko/kreditor. Klik &quot;Kelola Rincian&quot; untuk menambahkan.
            </p>
          ) : (
            sumberHutangList.map((h) => {
              const sisa = Math.max(0, h.nominal - h.terbayar);
              return (
                <div
                  key={h.id}
                  className="rounded-xl bg-surface-container-low/70 border border-outline-variant/30 p-4 flex flex-col justify-between transition-all hover:bg-surface-container"
                >
                  <div>
                    <p className="font-bold font-headline text-sm text-on-surface truncate">{h.nama_kreditor}</p>
                    <p className="text-[11px] text-on-surface-variant mt-0.5 line-clamp-1">
                      {h.keterangan || "Material pembangunan masjid"}
                    </p>
                  </div>
                  <div className="mt-3.5 pt-2.5 border-t border-outline-variant/30 flex items-baseline justify-between text-xs">
                    <div>
                      <p className="text-[10px] text-on-surface-variant font-label">Pagu Hutang</p>
                      <p className="font-bold font-mono tabular-nums text-on-surface">{formatRupiah(h.nominal)}</p>
                      {h.terbayar > 0 && (
                        <p className="text-[10px] text-status-success font-mono font-semibold">
                          Terbayar: {formatRupiah(h.terbayar)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-on-surface-variant font-label">Sisa Kewajiban</p>
                      <p className="font-bold font-mono tabular-nums text-status-danger">{formatRupiah(sisa)}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Status Pembayaran Bulan Ini: Sudah vs Belum */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Sudah Bayar */}
        <div className="bento-card p-5">
          <div className="flex items-center justify-between mb-4 border-b border-outline-variant/30 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4.5 w-4.5 text-status-success" />
              <h2 className="font-bold font-headline text-on-surface text-sm">Sudah Bayar — {labelBulanIni}</h2>
            </div>
            <span className="text-xs bg-status-success text-on-status-success px-2.5 py-0.5 rounded-full font-bold font-label">
              {sudahBayar.length} Donatur
            </span>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {sudahBayar.length === 0 ? (
              <p className="text-xs text-on-surface-variant text-center py-8">
                Belum ada setoran tercatat untuk bulan ini
              </p>
            ) : (
              sudahBayar.map((d) => {
                const bayar = pembayaranBulanIni.find((p) => p.donatur_id === d.id);
                return (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-xl px-3.5 py-2.5 bg-surface-container-low/70 border border-outline-variant/20 text-xs transition-colors hover:bg-surface-container"
                  >
                    <span className="font-semibold text-on-surface">{d.nama}</span>
                    <div className="text-right flex items-center gap-2">
                      <span className="text-status-success font-bold font-mono tabular-nums">
                        {formatRupiah(bayar?.nominal ?? 0)}
                      </span>
                      <span className="text-[10px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-md font-mono">
                        {bayar?.metode}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Belum Bayar */}
        <div className="bento-card p-5">
          <div className="flex items-center justify-between mb-4 border-b border-outline-variant/30 pb-3">
            <div className="flex items-center gap-2">
              <XCircle className="h-4.5 w-4.5 text-status-danger" />
              <h2 className="font-bold font-headline text-on-surface text-sm">Belum Bayar — {labelBulanIni}</h2>
            </div>
            <span className="text-xs bg-error-container text-on-error-container px-2.5 py-0.5 rounded-full font-bold font-label">
              {belumBayar.length} Donatur
            </span>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {belumBayar.length === 0 ? (
              <div className="py-8 text-center text-status-success space-y-1">
                <ShieldCheck className="h-8 w-8 mx-auto opacity-80" />
                <p className="text-xs font-bold font-headline">Alhamdulillah, seluruh donatur telah lunas!</p>
              </div>
            ) : (
              belumBayar.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-xl px-3.5 py-2.5 bg-surface-container-low/70 border border-outline-variant/20 text-xs transition-colors hover:bg-surface-container"
                >
                  <span className="font-medium text-on-surface">{d.nama}</span>
                  <span className="text-on-surface-variant font-mono tabular-nums text-[11px]">
                    Min. {formatRupiah(d.minimal_bulanan)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  watermark,
  label,
  value,
  sub,
  theme = "primary",
}: {
  icon: React.ReactNode;
  watermark?: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  theme?: "primary" | "success" | "danger" | "gold";
}) {
  const chipClass =
    theme === "success"
      ? "bg-status-success/10 text-status-success"
      : theme === "danger"
      ? "bg-status-danger/10 text-status-danger"
      : theme === "gold"
      ? "bg-primary-container text-on-primary-container"
      : "bg-primary/10 text-primary-dark dark:text-primary";

  const watermarkClass =
    theme === "success"
      ? "text-status-success"
      : theme === "danger"
      ? "text-status-danger"
      : theme === "gold"
      ? "text-primary-light"
      : "text-primary";

  return (
    <div className="bento-card overflow-hidden group hover-lift relative p-5">
      {watermark && (
        <div className={`absolute right-3 top-3 opacity-15 pointer-events-none ${watermarkClass}`}>
          {watermark}
        </div>
      )}
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl mb-3 shadow-2xs ${chipClass}`}>
        {icon}
      </span>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant font-label">
        {label}
      </p>
      <p className="font-headline text-lg md:text-xl font-bold text-on-surface mt-1 tabular-nums leading-tight tracking-tight truncate">
        {value}
      </p>
      {sub && <p className="text-[11px] text-on-surface-variant/70 mt-1">{sub}</p>}
    </div>
  );
}
