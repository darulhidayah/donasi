"use client";

import { useState, useTransition, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { formatRupiah, formatTanggal, NAMA_BULAN, toBulanDB } from "@/lib/utils";
import { exportPembayaranToExcel, readExcelFile, getExcelValue, cleanPhoneNumber } from "@/lib/excel";
import { cn } from "@/lib/utils";
import {
  Plus, Pencil, Trash2, X, ChevronLeft, ChevronRight,
  Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle2,
  CreditCard, QrCode, Banknote, User,
} from "lucide-react";
import type { Database } from "@/lib/database.types";

type Donatur = Database["public"]["Tables"]["donatur"]["Row"];
type Pembayaran = Database["public"]["Tables"]["pembayaran"]["Row"];

const METODE_OPTIONS = ["Transfer", "QRIS", "Tunai", "Lainnya"] as const;

export default function AdminPembayaranClient({
  donaturList, initialPembayaran, bulanDefault, adminNama,
}: {
  donaturList: Donatur[];
  initialPembayaran: Pembayaran[];
  bulanDefault: string;
  adminNama: string;
}) {
  const now = new Date();
  const [bulanTahun, setBulanTahun] = useState({ tahun: now.getFullYear(), bulan: now.getMonth() + 1 });
  const [pembayaran, setPembayaran] = useState<Pembayaran[]>(initialPembayaran);
  const [loadingBulan, setLoadingBulan] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editing, setEditing] = useState<Pembayaran | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Pembayaran | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bulanDB = toBulanDB(bulanTahun.tahun, bulanTahun.bulan);
  const labelBulan = `${NAMA_BULAN[bulanTahun.bulan - 1]} ${bulanTahun.tahun}`;

  const [form, setForm] = useState({
    donatur_id: "" as string,
    nominal: 50000,
    metode: "Transfer" as Pembayaran["metode"],
    tgl_bayar: new Date().toISOString().split("T")[0],
    keterangan: "",
  });

  const loadBulan = async (tahun: number, bulan: number) => {
    setLoadingBulan(true);
    const { data } = await supabase
      .from("pembayaran")
      .select("*")
      .eq("bulan", toBulanDB(tahun, bulan))
      .order("tgl_bayar", { ascending: false });
    setPembayaran(data ?? []);
    setLoadingBulan(false);
  };

  const changeBulan = (delta: number) => {
    const d = new Date(bulanTahun.tahun, bulanTahun.bulan - 1 + delta);
    const newVal = { tahun: d.getFullYear(), bulan: d.getMonth() + 1 };
    setBulanTahun(newVal);
    loadBulan(newVal.tahun, newVal.bulan);
  };

  const openAdd = () => {
    setEditing(null);
    setForm({
      donatur_id: "",
      nominal: 50000,
      metode: "Transfer",
      tgl_bayar: new Date().toISOString().split("T")[0],
      keterangan: "",
    });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (p: Pembayaran) => {
    setEditing(p);
    setForm({
      donatur_id: String(p.donatur_id),
      nominal: p.nominal,
      metode: p.metode,
      tgl_bayar: p.tgl_bayar,
      keterangan: p.keterangan ?? "",
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.donatur_id) {
      setError("Pilih donatur terlebih dahulu.");
      return;
    }
    if (form.nominal < 50000) {
      setError("Minimal donasi Rp 50.000.");
      return;
    }
    setError(null);

    const donatur = donaturList.find((d) => d.id === parseInt(form.donatur_id));
    if (!donatur) return;

    startTransition(async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (editing) {
        const { data, error: err } = await supabase
          .from("pembayaran")
          .update({
            nominal: form.nominal,
            metode: form.metode,
            tgl_bayar: form.tgl_bayar,
            keterangan: form.keterangan || null,
            updated_by_name: adminNama,
          })
          .eq("id", editing.id)
          .select()
          .single();

        if (err) {
          setError(
            err.message.includes("duplicate") || err.message.includes("unique")
              ? "Donatur ini sudah memiliki catatan pembayaran di bulan ini."
              : err.message
          );
          return;
        }
        setPembayaran((prev) => prev.map((p) => (p.id === editing.id ? (data as Pembayaran) : p)));
      } else {
        const { data, error: err } = await supabase
          .from("pembayaran")
          .insert({
            donatur_id: parseInt(form.donatur_id),
            nama_donatur: donatur.nama,
            no_hp_donatur: donatur.no_hp,
            bulan: bulanDB,
            nominal: form.nominal,
            metode: form.metode,
            tgl_bayar: form.tgl_bayar,
            keterangan: form.keterangan || null,
            dicatat_oleh: userData.user?.id,
            nama_pencatat: adminNama,
          })
          .select()
          .single();

        if (err) {
          setError(
            err.message.includes("unique") || err.message.includes("duplicate")
              ? "Donatur ini sudah tercatat bayar di bulan ini. Anda bisa mengedit nominalnya jika ada tambahan."
              : err.message
          );
          return;
        }
        setPembayaran((prev) => [data as Pembayaran, ...prev]);
      }
      setModalOpen(false);
    });
  };

  const handleDelete = (p: Pembayaran) => {
    startTransition(async () => {
      await supabase.from("pembayaran").delete().eq("id", p.id);
      setPembayaran((prev) => prev.filter((x) => x.id !== p.id));
      setDeleteConfirm(null);
    });
  };

  // Handler Import Pembayaran Excel
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus("Membaca file Excel...");
    try {
      const rows = await readExcelFile<any>(file);
      if (!rows || rows.length === 0) {
        setError("File Excel kosong.");
        setImportStatus(null);
        return;
      }

      setImportStatus(`Mencocokkan ${rows.length} baris donatur...`);

      const payload = [];
      const { data: userData } = await supabase.auth.getUser();

      for (const r of rows) {
        const nama = getExcelValue(r, "Nama Donatur", "Nama", "Donatur", "NAMA", "nama_donatur", "Nama Lengkap");
        if (!nama) continue;

        let donatur = donaturList.find(
          (d) => d.nama.toLowerCase().trim() === nama.toLowerCase().trim()
        );

        let donaturId = donatur?.id;
        const rawNoHp = getExcelValue(
          r,
          "Nomor HP / WA",
          "Nomor HP/WA",
          "No. HP / WA",
          "No HP / WA",
          "No. HP",
          "Nomor HP",
          "No HP",
          "HP",
          "WA",
          "WhatsApp",
          "No WA",
          "No. WA",
          "Telepon",
          "No Telp",
          "Kontak",
          "no_hp",
          "nohp"
        );
        const noHp = cleanPhoneNumber(rawNoHp) || donatur?.no_hp;

        if (!donaturId) {
          const { data: newD } = await supabase
            .from("donatur")
            .insert({
              nama: nama.trim(),
              no_hp: noHp || null,
              minimal_bulanan: 50000,
              metode_default: "Transfer",
              status: "aktif",
              created_by_name: `${adminNama} (Auto Import)`,
            })
            .select()
            .single();
          if (newD) donaturId = newD.id;
        }

        if (!donaturId) continue;

        const rawNominal = getExcelValue(
          r,
          "Nilai Donasi (Rp)",
          "Nilai Donasi",
          "Nominal",
          "Minimal Donasi",
          "Jumlah",
          "Donasi"
        );
        const nominal = parseInt(rawNominal.replace(/[^0-9]/g, "")) || 50000;

        let rawMetode = getExcelValue(
          r,
          "Metode Pembayaran",
          "Keterangan Donasi",
          "Metode",
          "Cara Bayar"
        );
        let metode: Pembayaran["metode"] = "Transfer";
        let ket = "";

        if (rawMetode.includes("-")) {
          const parts = rawMetode.split("-");
          rawMetode = parts[0].trim();
          ket = parts.slice(1).join("-").trim();
        }

        if (rawMetode.toLowerCase().includes("qris")) metode = "QRIS";
        else if (rawMetode.toLowerCase().includes("tunai") || rawMetode.toLowerCase().includes("cash")) metode = "Tunai";
        else if (rawMetode.toLowerCase().includes("transfer") || rawMetode.toLowerCase().includes("bank")) metode = "Transfer";
        else if (rawMetode) metode = "Lainnya";

        const directKet = getExcelValue(r, "Keterangan", "Catatan", "Note");
        if (directKet) ket = directKet;

        payload.push({
          donatur_id: donaturId,
          nama_donatur: nama.trim(),
          no_hp_donatur: noHp || null,
          bulan: bulanDB,
          nominal: Math.max(50000, nominal),
          metode,
          keterangan: ket || null,
          tgl_bayar: new Date().toISOString().split("T")[0],
          dicatat_oleh: userData.user?.id,
          nama_pencatat: `${adminNama} (Import Excel)`,
        });
      }

      if (payload.length === 0) {
        setError("Tidak ada data donasi yang cocok dalam file Excel.");
        setImportStatus(null);
        return;
      }

      const { data, error: insertErr } = await supabase
        .from("pembayaran")
        .upsert(payload as any, { onConflict: "donatur_id,bulan" })
        .select();

      if (insertErr) {
        setError("Gagal import: " + insertErr.message);
        setImportStatus(null);
        return;
      }

      await loadBulan(bulanTahun.tahun, bulanTahun.bulan);
      setImportStatus(`Berhasil mencatat ${payload.length} setoran pembayaran!`);
      setTimeout(() => {
        setImportModalOpen(false);
        setImportStatus(null);
      }, 1500);
    } catch (err: any) {
      setError("Format file tidak didukung: " + err.message);
      setImportStatus(null);
    }
  };

  const totalBulanIni = pembayaran.reduce((s, p) => s + p.nominal, 0);
  const sudahBayarIds = new Set(pembayaran.map((p) => p.donatur_id));
  const belumBayar = donaturList.filter((d) => !sudahBayarIds.has(d.id));

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Pencatatan Pembayaran</h1>
          <p className="text-xs text-on-surface-variant">
            Total penerimaan periode {labelBulan}:{" "}
            <span className="font-mono font-bold text-primary tabular-nums">{formatRupiah(totalBulanIni)}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => exportPembayaranToExcel(pembayaran, labelBulan)}
            title="Download rincian pembayaran bulan ini ke Excel"
            className="flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface px-3 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-primary" /> Ekspor Excel
          </button>

          <button
            onClick={() => {
              setError(null);
              setImportStatus(null);
              setImportModalOpen(true);
            }}
            title="Import pembayaran massal dari Excel"
            className="flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface px-3 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors"
          >
            <Upload className="h-3.5 w-3.5 text-primary" /> Import Excel
          </button>

          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-on-primary hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" /> Input Setoran
          </button>
        </div>
      </div>

      {/* Navigasi Bulan Elegan */}
      <div className="flex items-center justify-center gap-4 py-1">
        <button
          onClick={() => changeBulan(-1)}
          className="rounded-xl border border-outline-variant bg-surface p-2 text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors shadow-xs"
          title="Bulan Sebelumnya"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="font-bold text-on-surface w-44 text-center text-sm md:text-base tracking-wide">
          {labelBulan}
        </span>
        <button
          onClick={() => changeBulan(1)}
          className="rounded-xl border border-outline-variant bg-surface p-2 text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors shadow-xs"
          title="Bulan Berikutnya"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Belum Bayar Alert Card */}
      {belumBayar.length > 0 && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-xs text-rose-700 dark:text-rose-300">
          <span className="font-bold">{belumBayar.length} donatur belum bayar: </span>
          {belumBayar.slice(0, 5).map((d) => d.nama).join(", ")}
          {belumBayar.length > 5 && ` dan ${belumBayar.length - 5} lainnya`}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl bg-surface shadow-sm ring-1 ring-black/[0.05] dark:ring-white/[0.06] overflow-hidden">
        {loadingBulan ? (
          <div className="py-16 text-center text-on-surface-variant">Memuat data bulan...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th className="text-left px-4 py-3 font-bold text-on-surface-variant">No</th>
                  <th className="text-left px-4 py-3 font-bold text-on-surface-variant">Nama Donatur</th>
                  <th className="text-left px-4 py-3 font-bold text-on-surface-variant">No. HP</th>
                  <th className="text-right px-4 py-3 font-bold text-on-surface-variant">Nilai Donasi</th>
                  <th className="text-left px-4 py-3 font-bold text-on-surface-variant">Metode</th>
                  <th className="text-left px-4 py-3 font-bold text-on-surface-variant">Tgl Bayar</th>
                  <th className="text-left px-4 py-3 font-bold text-on-surface-variant">Penanggung Jawab</th>
                  <th className="text-right px-4 py-3 font-bold text-on-surface-variant">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {pembayaran.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-on-surface-variant">
                      Belum ada catatan pembayaran di bulan {labelBulan}
                    </td>
                  </tr>
                ) : (
                  pembayaran.map((p, i) => (
                    <tr key={p.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-4 py-3 text-on-surface-variant">{i + 1}</td>
                      <td className="px-4 py-3 font-semibold text-on-surface">
                        <div>{p.nama_donatur}</div>
                        {p.keterangan && (
                          <div className="text-[11px] text-on-surface-variant line-clamp-1">
                            {p.keterangan}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant font-mono text-xs">
                        {p.no_hp_donatur ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-primary tabular-nums">
                        {formatRupiah(p.nominal)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold",
                            p.metode === "Transfer"
                              ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                              : p.metode === "QRIS"
                              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          )}
                        >
                          {p.metode === "Transfer" ? (
                            <CreditCard className="h-3 w-3" />
                          ) : p.metode === "QRIS" ? (
                            <QrCode className="h-3 w-3" />
                          ) : (
                            <Banknote className="h-3 w-3" />
                          )}
                          {p.metode}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-on-surface-variant">
                        {formatTanggal(p.tgl_bayar)}
                      </td>
                      <td className="px-4 py-3 text-xs text-on-surface-variant">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 shrink-0 opacity-60" />
                          <span>{p.nama_pencatat ?? "Admin"}</span>
                        </div>
                        {p.updated_by_name && (
                          <div className="text-[10px] text-on-surface-variant/75 mt-0.5">
                            Edit: {p.updated_by_name}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(p)}
                            className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(p)}
                            className="rounded-lg p-1.5 text-on-surface-variant hover:bg-error-container hover:text-status-danger transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {pembayaran.length > 0 && (
                <tfoot className="bg-surface-container-low border-t-2 border-outline-variant">
                  <tr>
                    <td colSpan={3} className="px-4 py-3.5 font-bold text-on-surface">
                      TOTAL PENERIMAAN {labelBulan.toUpperCase()} ({pembayaran.length} Setoran)
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-black text-primary tabular-nums">
                      {formatRupiah(totalBulanIni)}
                    </td>
                    <td colSpan={4} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* MODAL INPUT / EDIT: SOLID 100%, ANTI GELAP & ANTI BURAM */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 dark:bg-black/80 transition-opacity"
            onClick={() => setModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl modal-panel p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5 border-b border-outline-variant pb-3">
              <div>
                <h2 className="text-lg font-bold text-on-surface">
                  {editing ? "Edit Pembayaran" : `Input Pembayaran — ${labelBulan}`}
                </h2>
                <p className="text-[11px] text-on-surface-variant">
                  Penanggung jawab: <strong className="text-primary">{adminNama}</strong>
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                type="button"
                className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-error-container px-3.5 py-2.5 text-xs text-on-error-container">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-1.5">
                  Pilih Donatur Tetap *
                </label>
                <select
                  value={form.donatur_id}
                  onChange={(e) => {
                    const d = donaturList.find((x) => x.id === parseInt(e.target.value));
                    setForm((f) => ({
                      ...f,
                      donatur_id: e.target.value,
                      nominal: d?.minimal_bulanan ?? 50000,
                      metode: (d?.metode_default ?? "Transfer") as Pembayaran["metode"],
                    }));
                  }}
                  disabled={!!editing}
                  className={cn(inputCls, editing && "opacity-60")}
                >
                  <option value="">-- Pilih Donatur --</option>
                  {donaturList.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nama} {d.no_hp ? `(${d.no_hp})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-1.5">
                    Nilai Setoran (Rp) *
                  </label>
                  <input
                    value={form.nominal}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, nominal: parseInt(e.target.value) || 0 }))
                    }
                    type="number"
                    min={50000}
                    step={50000}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-1.5">
                    Metode Pembayaran
                  </label>
                  <select
                    value={form.metode}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, metode: e.target.value as Pembayaran["metode"] }))
                    }
                    className={inputCls}
                  >
                    {METODE_OPTIONS.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-1.5">
                  Tanggal Bayar / Setor
                </label>
                <input
                  value={form.tgl_bayar}
                  onChange={(e) => setForm((f) => ({ ...f, tgl_bayar: e.target.value }))}
                  type="date"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-1.5">
                  Keterangan Tambahan (Opsional)
                </label>
                <input
                  value={form.keterangan}
                  onChange={(e) => setForm((f) => ({ ...f, keterangan: e.target.value }))}
                  placeholder="Misal: transfer via rekening lain, titip tunai, dll"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-3 border-t border-outline-variant">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex-1 rounded-xl border border-outline-variant bg-surface py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-on-primary hover:bg-primary/90 disabled:opacity-60 shadow-sm"
              >
                {isPending ? "Menyimpan..." : "Simpan Pembayaran"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IMPORT EXCEL PEMBAYARAN: SOLID 100% */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 dark:bg-black/80 transition-opacity"
            onClick={() => setImportModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl modal-panel p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-on-surface">
                  Import Pembayaran ({labelBulan})
                </h2>
              </div>
              <button
                onClick={() => setImportModalOpen(false)}
                type="button"
                className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-on-surface-variant mb-4">
              Upload file Excel rincian pembayaran untuk periode <strong>{labelBulan}</strong>.
              Kolom: <strong>Nama Donatur</strong>, <strong>Nilai Donasi</strong>, dan <strong>Keterangan Donasi</strong> (QRIS / Rek. Masjid / Tunai).
            </p>

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-error-container px-3.5 py-2.5 text-xs text-on-error-container">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {importStatus && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-primary-container px-3.5 py-2.5 text-xs font-medium text-on-primary-container">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                <span>{importStatus}</span>
              </div>
            )}

            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center border-2 border-dashed border-outline-variant rounded-2xl p-6 text-center cursor-pointer hover:border-primary transition-colors bg-surface-container-low"
            >
              <Upload className="h-8 w-8 text-primary mb-2" />
              <p className="text-sm font-semibold text-on-surface">Pilih File Excel Rincian</p>
              <p className="text-[11px] text-on-surface-variant mt-1">Format .xlsx atau .xls</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                onChange={handleImportExcel}
                className="hidden"
              />
            </div>

            <div className="mt-6 pt-3 border-t border-outline-variant">
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="w-full rounded-xl border border-outline-variant bg-surface py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL: SOLID 100% */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 dark:bg-black/80 transition-opacity"
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl modal-panel p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-on-surface mb-2">Hapus Catatan Pembayaran?</h2>
            <p className="text-sm text-on-surface-variant mb-5">
              Hapus catatan setoran dari{" "}
              <strong className="text-on-surface">{deleteConfirm.nama_donatur}</strong> sebesar{" "}
              <span className="font-mono font-bold text-primary tabular-nums">{formatRupiah(deleteConfirm.nominal)}</span>?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-xl border border-outline-variant bg-surface py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirm)}
                disabled={isPending}
                className="flex-1 rounded-xl bg-status-danger py-2.5 text-sm font-semibold text-white hover:bg-status-danger/90 disabled:opacity-60"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-outline-variant bg-surface px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary transition-all";
