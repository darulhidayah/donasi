"use client";

import Link from "next/link";
import { formatRupiah, hitungProgress, NAMA_BULAN } from "@/lib/utils";
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
  const totalSemuaPenerimaan = totalTerkumpul + totalSetor;
  const progress = hitungProgress(totalSemuaPenerimaan, totalHutang);
  const sudahBayar = donaturAktif.filter((d) => sudahBayarIds.has(d.id));
  const belumBayar = donaturAktif.filter((d) => !sudahBayarIds.has(d.id));

  const now = new Date();
  const labelBulanIni = `${NAMA_BULAN[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Dashboard Utama</h1>
        <p className="text-sm text-on-surface-variant">
          Ringkasan progres pelunasan hutang {config.nama_masjid ?? "Masjid Darul Hidayah"}
        </p>
      </div>

      {/* Progress Bar Hutang Terpadu */}
      <div className="rounded-xl bg-surface shadow-sm ring-1 ring-black/[0.05] dark:ring-white/[0.06] p-6 relative overflow-hidden">
        {/* Subtle top hairline emerald */}
        <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-xl bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Total Kewajiban Hutang Pembangunan
            </p>
            <p className="text-2xl md:text-3xl font-black text-on-surface mt-0.5">
              {formatRupiah(totalHutang)}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Sisa Hutang Belum Lunas
            </p>
            <p className="text-2xl md:text-3xl font-black text-status-danger mt-0.5">
              {formatRupiah(sisaHutang)}
            </p>
          </div>
        </div>

      {/* Bar */}
        <div className="w-full bg-surface-container-high rounded-full h-1.5 overflow-hidden mt-1">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #059669, #10b981)' }}
          />
        </div>

        <div className="flex justify-between items-center mt-2.5 text-xs">
          <span className="text-on-surface-variant font-medium">
            Terkumpul:{" "}
            <strong className="font-mono tabular-nums text-on-surface">{formatRupiah(totalSemuaPenerimaan)}</strong>
          </span>
          <span className="font-bold text-primary bg-primary-container px-2.5 py-0.5 rounded-full text-[11px]">
            {progress}% Tercapai
          </span>
        </div>

        {totalSetor > 0 && (
          <p className="mt-2 text-[11px] text-on-surface-variant">
            Rincian: Donatur Tetap {formatRupiah(totalTerkumpul)} + Setoran Pihak Ketiga{" "}
            {formatRupiah(totalSetor)}
          </p>
        )}
      </div>

      {/* 4 Stat Cards Semantik */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Donatur Aktif"
          value={donaturAktif.length.toString() + " Orang"}
          sub="Target minimal 50rb"
          accentClass="border-t-primary/60"
        />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4 text-status-success" />}
          label="Sudah Bayar"
          value={sudahBayar.length.toString() + " Orang"}
          sub={labelBulanIni}
          accentClass="border-t-status-success/50"
        />
        <StatCard
          icon={<XCircle className="h-4 w-4 text-status-danger" />}
          label="Belum Bayar"
          value={belumBayar.length.toString() + " Orang"}
          sub={labelBulanIni}
          accentClass="border-t-status-danger/50"
        />
        <StatCard
          icon={<Banknote className="h-4 w-4 text-primary" />}
          label="Masuk Bulan Ini"
          value={formatRupiah(totalBulanIni)}
          sub={labelBulanIni}
          accentClass="border-t-primary/60"
        />
      </div>

      {/* Rincian Sumber Hutang (Toko A, Toko B, dll) */}
      <div className="rounded-xl bg-surface shadow-sm ring-1 ring-black/[0.05] dark:ring-white/[0.06] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-base text-on-surface">Rincian Sumber Hutang ke Toko / Supplier</h2>
          </div>
          <Link
            href="/admin/hutang"
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Kelola Rincian <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {sumberHutangList.length === 0 ? (
            <p className="text-xs text-on-surface-variant col-span-3 py-4 text-center">
              Belum ada rincian toko/kreditor. Klik &quot;Kelola Rincian&quot; untuk menambahkan.
            </p>
          ) : (
            sumberHutangList.map((h) => {
              const sisa = Math.max(0, h.nominal - h.terbayar);
              return (
                <div
                  key={h.id}
                  className="rounded-lg bg-surface-container-low ring-1 ring-black/[0.04] dark:ring-white/[0.05] p-4 flex flex-col justify-between"
                >
                  <div>
                    <p className="font-bold text-sm text-on-surface truncate">{h.nama_kreditor}</p>
                    <p className="text-[11px] text-on-surface-variant mt-0.5 line-clamp-1">
                      {h.keterangan || "Material pembangunan masjid"}
                    </p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-outline-variant/60 flex items-baseline justify-between text-xs">
                    <div>
                      <p className="text-[10px] text-on-surface-variant">Pagu Hutang</p>
                      <p className="font-bold font-mono tabular-nums text-on-surface">{formatRupiah(h.nominal)}</p>
                      {h.terbayar > 0 && (
                        <p className="text-[10px] text-status-success font-mono font-semibold">
                          Terbayar: {formatRupiah(h.terbayar)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-on-surface-variant">Sisa Kewajiban</p>
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
      <div className="grid gap-3 md:grid-cols-2">
        {/* Sudah Bayar */}
        <div className="rounded-xl bg-surface shadow-sm ring-1 ring-black/[0.05] dark:ring-white/[0.06] p-5">
          <div className="flex items-center justify-between mb-4 border-b border-outline-variant/60 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-status-success" />
              <h2 className="font-bold text-on-surface text-sm">Sudah Bayar — {labelBulanIni}</h2>
            </div>
            <span className="text-xs bg-primary-container text-on-primary-container px-2.5 py-0.5 rounded-full font-bold">
              {sudahBayar.length} Donatur
            </span>
          </div>
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
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
                    className="flex items-center justify-between rounded-lg px-3 py-2 bg-surface-container-low text-xs transition-colors hover:bg-surface-container"
                  >
                    <span className="font-medium text-on-surface">{d.nama}</span>
                    <div className="text-right">
                      <span className="text-status-success font-bold font-mono tabular-nums">
                        {formatRupiah(bayar?.nominal ?? 0)}
                      </span>
                      <span className="ml-2 text-[10px] text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">
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
        <div className="rounded-xl bg-surface shadow-sm ring-1 ring-black/[0.05] dark:ring-white/[0.06] p-5">
          <div className="flex items-center justify-between mb-4 border-b border-outline-variant/60 pb-3">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-status-danger" />
              <h2 className="font-bold text-on-surface text-sm">Belum Bayar — {labelBulanIni}</h2>
            </div>
            <span className="text-xs bg-error-container text-on-error-container px-2.5 py-0.5 rounded-full font-bold">
              {belumBayar.length} Donatur
            </span>
          </div>
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {belumBayar.length === 0 ? (
              <div className="py-8 text-center text-status-success space-y-1">
                <ShieldCheck className="h-8 w-8 mx-auto opacity-80" />
                <p className="text-xs font-bold">Alhamdulillah, seluruh donatur telah lunas!</p>
              </div>
            ) : (
              belumBayar.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2 bg-surface-container-low text-xs transition-colors hover:bg-surface-container"
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
  label,
  value,
  sub,
  accentClass = "border-t-emerald-500/50",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accentClass?: string;
}) {
  return (
    <div className={`rounded-xl bg-surface shadow-sm ring-1 ring-black/[0.05] dark:ring-white/[0.06] p-4 border-t-2 ${accentClass}`}>
      <div className="mb-2.5 text-on-surface-variant">
        {icon}
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
        {label}
      </p>
      <p className="text-lg md:text-xl font-bold font-mono tabular-nums text-on-surface mt-0.5 leading-tight tracking-tight">{value}</p>
      {sub && <p className="text-[11px] text-on-surface-variant mt-1">{sub}</p>}
    </div>
  );
}
