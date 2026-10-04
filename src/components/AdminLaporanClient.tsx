"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatRupiah, formatBulan, NAMA_BULAN, toBulanDB } from "@/lib/utils";
import { exportRekapToExcel } from "@/lib/excel";
import { cn } from "@/lib/utils";
import {
  Copy, Check, ChevronLeft, ChevronRight, Pencil, Download,
  X, FileSpreadsheet,
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
  const [setorModal, setSetorModal] = useState(false);
  const [setorForm, setSetorForm] = useState({ jumlah: 0, keterangan: "" });
  const [setorData, setSetorData] = useState<Setor[]>(semuaSetor);
  const [saving, setSaving] = useState(false);

  const bulanDB = toBulanDB(bulanTahun.tahun, bulanTahun.bulan);
  const labelBulan = `${NAMA_BULAN[bulanTahun.bulan - 1]} ${bulanTahun.tahun}`;

  const totalHutang = parseInt(config.total_hutang ?? "800000000");

  // Filter pembayaran bulan ini
  const pembayaranBulan = allPembayaran.filter((p) => p.bulan === bulanDB);
  const totalDonasiBulan = pembayaranBulan.reduce((s, p) => s + p.nominal, 0);

  // Setor pihak ketiga bulan ini
  const setorBulan = setorData.find((s) => s.bulan === bulanDB);
  const totalSetorBulan = setorBulan?.jumlah ?? 0;
  const totalMasukBulan = totalDonasiBulan + totalSetorBulan;

  // REKAP: hitung saldo hutang kumulatif per bulan (sesuai template excel koordinator)
  const bulanUnik = [
    ...new Set([...allPembayaran.map((p) => p.bulan), ...setorData.map((s) => s.bulan)]),
  ].sort();

  let sisaHutang = totalHutang;
  const rekapBulan = bulanUnik.map((bln, idx) => {
    const masuk = allPembayaran.filter((p) => p.bulan === bln).reduce((s, p) => s + p.nominal, 0);
    const setor = setorData.find((s) => s.bulan === bln)?.jumlah ?? 0;
    const totalMasuk = masuk + setor;
    sisaHutang -= totalMasuk;
    return {
      bulan: bln,
      no: idx + 1,
      jumlahDonasi: masuk,
      setorPihakKetiga: setor,
      totalMasuk,
      sisaHutang: Math.max(0, sisaHutang),
      keterangan: setorData.find((s) => s.bulan === bln)?.keterangan ?? undefined,
    };
  });

  // Progress overall
  const totalTerkumpulAll = allPembayaran.reduce((s, p) => s + p.nominal, 0);
  const totalSetorAll = setorData.reduce((s, p) => s + p.jumlah, 0);
  const progressAll = Math.min(
    100,
    Math.round(((totalTerkumpulAll + totalSetorAll) / totalHutang) * 100)
  );

  // Text untuk share WA
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
      `📊 *Rekapitulasi Keuangan:*`,
      `• Total Donasi Terkumpul Bulan Ini: *${formatRupiah(totalDonasiBulan)}*`,
      totalSetorBulan > 0 ? `• Setor Pihak Ketiga: ${formatRupiah(totalSetorBulan)}` : null,
      `• Total Masuk Bulan Ini: *${formatRupiah(totalMasukBulan)}*`,
      `• Total Akumulasi Penerimaan: ${formatRupiah(totalTerkumpulAll + totalSetorAll)}`,
      `• Sisa Kewajiban Hutang: *${formatRupiah(
        Math.max(0, totalHutang - totalTerkumpulAll - totalSetorAll)
      )}*`,
      `• Progres Pelunasan: *${progressAll}% Lunas*`,
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

  const handleSaveSetor = async () => {
    if (setorForm.jumlah < 0) return;
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    if (setorBulan) {
      const { data } = await supabase
        .from("setor_pihak_ketiga")
        .update({
          jumlah: setorForm.jumlah,
          keterangan: setorForm.keterangan || null,
          updated_by_name: adminNama,
        })
        .eq("bulan", bulanDB)
        .select()
        .single();
      if (data) setSetorData((prev) => prev.map((s) => (s.bulan === bulanDB ? (data as Setor) : s)));
    } else {
      const { data } = await supabase
        .from("setor_pihak_ketiga")
        .insert({
          bulan: bulanDB,
          jumlah: setorForm.jumlah,
          keterangan: setorForm.keterangan || null,
          dicatat_oleh: userData.user?.id,
          created_by_name: adminNama,
        })
        .select()
        .single();
      if (data) setSetorData((prev) => [...prev, data as Setor]);
    }
    setSaving(false);
    setSetorModal(false);
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
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <SummaryCard
          label="Donatur Bayar"
          value={pembayaranBulan.length.toString() + " Orang"}
          sub={`Periode ${labelBulan}`}
        />
        <SummaryCard label="Donasi Masuk" value={formatRupiah(totalDonasiBulan)} />
        <SummaryCard
          label="Setor Pihak Ketiga"
          value={formatRupiah(totalSetorBulan)}
          action={
            <button
              onClick={() => {
                setSetorForm({
                  jumlah: setorBulan?.jumlah ?? 0,
                  keterangan: setorBulan?.keterangan ?? "",
                });
                setSetorModal(true);
              }}
              title="Input / Edit setoran pihak ketiga"
              className="rounded p-1 text-on-surface-variant hover:bg-surface-container-high transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          }
        />
        <SummaryCard label="Total Masuk" value={formatRupiah(totalMasukBulan)} highlight />
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

      {/* REKAP TABEL (Sesuai Template Excel Koordinator) */}
      <div className="rounded-2xl border border-outline-variant bg-surface overflow-hidden shadow-xs">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-outline-variant bg-surface-container-low">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            <h2 className="font-bold text-on-surface text-sm md:text-base">
              Rekapitulasi Akumulasi Pelunasan Hutang
            </h2>
          </div>
          <span className="text-xs font-bold text-primary bg-primary-container px-2.5 py-1 rounded-full">
            {progressAll}% Lunas
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="text-left px-4 py-3 font-bold text-on-surface-variant">No</th>
                <th className="text-left px-4 py-3 font-bold text-on-surface-variant">Bulan</th>
                <th className="text-right px-4 py-3 font-bold text-on-surface-variant">Jumlah Donasi</th>
                <th className="text-right px-4 py-3 font-bold text-on-surface-variant">Setor Pihak Ketiga</th>
                <th className="text-right px-4 py-3 font-bold text-on-surface-variant">Total Masuk</th>
                <th className="text-right px-4 py-3 font-bold text-on-surface-variant">Sisa Hutang</th>
                <th className="text-left px-4 py-3 font-bold text-on-surface-variant">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {rekapBulan.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-on-surface-variant">
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
                    <td className="px-4 py-3 text-on-surface-variant">{r.no}</td>
                    <td className="px-4 py-3 font-semibold text-on-surface">{formatBulan(r.bulan)}</td>
                    <td className="px-4 py-3 text-right text-on-surface">
                      {formatRupiah(r.jumlahDonasi)}
                    </td>
                    <td className="px-4 py-3 text-right text-on-surface">
                      {r.setorPihakKetiga > 0 ? formatRupiah(r.setorPihakKetiga) : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-primary">
                      {formatRupiah(r.totalMasuk)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-status-danger">
                      {formatRupiah(r.sisaHutang)}
                    </td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant max-w-xs truncate">
                      {r.keterangan ?? "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-surface-container-low border-t-2 border-outline-variant">
              <tr>
                <td colSpan={2} className="px-4 py-3.5 font-bold text-on-surface">
                  TOTAL AKUMULASI
                </td>
                <td className="px-4 py-3.5 text-right font-black text-on-surface">
                  {formatRupiah(totalTerkumpulAll)}
                </td>
                <td className="px-4 py-3.5 text-right font-black text-on-surface">
                  {formatRupiah(totalSetorAll)}
                </td>
                <td className="px-4 py-3.5 text-right font-black text-primary">
                  {formatRupiah(totalTerkumpulAll + totalSetorAll)}
                </td>
                <td className="px-4 py-3.5 text-right font-black text-status-danger">
                  {formatRupiah(Math.max(0, totalHutang - totalTerkumpulAll - totalSetorAll))}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* MODAL INPUT SETOR PIHAK KETIGA: SOLID 100%, ANTI GELAP & ANTI BURAM */}
      {setorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 dark:bg-black/80 transition-opacity"
            onClick={() => setSetorModal(false)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl modal-panel p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-outline-variant pb-3">
              <h2 className="text-lg font-bold text-on-surface">
                Setor Pihak Ketiga — {labelBulan}
              </h2>
              <button
                onClick={() => setSetorModal(false)}
                type="button"
                className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-1.5">
                  Jumlah Setoran (Rp)
                </label>
                <input
                  value={setorForm.jumlah}
                  onChange={(e) =>
                    setSetorForm((f) => ({ ...f, jumlah: parseInt(e.target.value) || 0 }))
                  }
                  type="number"
                  min={0}
                  step={100000}
                  className="w-full rounded-xl border border-outline-variant bg-surface px-3.5 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-1.5">
                  Keterangan / Sumber Dana
                </label>
                <input
                  value={setorForm.keterangan}
                  onChange={(e) => setSetorForm((f) => ({ ...f, keterangan: e.target.value }))}
                  placeholder="Misal: Bantuan donatur luar, kas masjid, dll"
                  className="w-full rounded-xl border border-outline-variant bg-surface px-3.5 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-3 border-t border-outline-variant">
              <button
                type="button"
                onClick={() => setSetorModal(false)}
                className="flex-1 rounded-xl border border-outline-variant bg-surface py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveSetor}
                disabled={saving}
                className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-on-primary hover:bg-primary/90 disabled:opacity-60 shadow-sm"
              >
                {saving ? "Menyimpan..." : "Simpan Data"}
              </button>
            </div>
          </div>
        </div>
      )}
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
        "rounded-2xl border p-4.5 shadow-xs transition-colors",
        highlight
          ? "border-primary/40 bg-primary-container text-on-primary-container"
          : "border-outline-variant bg-surface text-on-surface"
      )}
    >
      <div className="flex items-start justify-between">
        <p
          className={cn(
            "text-xs font-semibold uppercase tracking-wider",
            highlight ? "text-on-primary-container/80" : "text-on-surface-variant"
          )}
        >
          {label}
        </p>
        {action}
      </div>
      <p className="text-xl font-black mt-1 leading-tight">{value}</p>
      {sub && <p className="text-[11px] text-on-surface-variant mt-1">{sub}</p>}
    </div>
  );
}
