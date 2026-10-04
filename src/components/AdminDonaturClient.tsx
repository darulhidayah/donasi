"use client";

import { useState, useTransition, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { formatRupiah, formatTanggal } from "@/lib/utils";
import { exportDonaturToExcel, downloadTemplateDonaturExcel, readExcelFile } from "@/lib/excel";
import { cn } from "@/lib/utils";
import {
  Plus, Pencil, UserX, UserCheck, Search, X, FileSpreadsheet,
  Upload, Download, AlertCircle, CheckCircle2, User, CreditCard,
  QrCode, Banknote, ShieldAlert,
} from "lucide-react";
import type { Database } from "@/lib/database.types";

type Donatur = Database["public"]["Tables"]["donatur"]["Row"];

const METODE_OPTIONS = ["Transfer", "QRIS", "Tunai", "Lainnya"] as const;

export default function AdminDonaturClient({
  initialList,
  adminNama,
}: {
  initialList: Donatur[];
  adminNama: string;
}) {
  const [list, setList] = useState<Donatur[]>(initialList);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"semua" | "aktif" | "nonaktif">("aktif");
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editing, setEditing] = useState<Donatur | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [form, setForm] = useState({
    nama: "",
    no_hp: "",
    minimal_bulanan: 50000,
    metode_default: "Transfer" as Donatur["metode_default"],
    catatan: "",
    tgl_daftar: new Date().toISOString().split("T")[0],
  });

  const filtered = list.filter((d) => {
    const matchSearch =
      d.nama.toLowerCase().includes(search.toLowerCase()) ||
      (d.no_hp ?? "").includes(search);
    const matchStatus = filterStatus === "semua" || d.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const openAdd = () => {
    setEditing(null);
    setForm({
      nama: "",
      no_hp: "",
      minimal_bulanan: 50000,
      metode_default: "Transfer",
      catatan: "",
      tgl_daftar: new Date().toISOString().split("T")[0],
    });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (d: Donatur) => {
    setEditing(d);
    setForm({
      nama: d.nama,
      no_hp: d.no_hp ?? "",
      minimal_bulanan: d.minimal_bulanan,
      metode_default: d.metode_default,
      catatan: d.catatan ?? "",
      tgl_daftar: d.tgl_daftar,
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.nama.trim()) {
      setError("Nama donatur wajib diisi.");
      return;
    }
    if (form.minimal_bulanan < 50000) {
      setError("Minimal donasi Rp 50.000.");
      return;
    }
    setError(null);

    startTransition(async () => {
      const { data: user } = await supabase.auth.getUser();
      if (editing) {
        const { data, error: err } = await supabase
          .from("donatur")
          .update({
            nama: form.nama.trim(),
            no_hp: form.no_hp || null,
            minimal_bulanan: form.minimal_bulanan,
            metode_default: form.metode_default,
            catatan: form.catatan || null,
            updated_by_name: adminNama,
          })
          .eq("id", editing.id)
          .select()
          .single();

        if (err) {
          setError(err.message);
          return;
        }
        setList((prev) => prev.map((d) => (d.id === editing.id ? (data as Donatur) : d)));
      } else {
        const { data, error: err } = await supabase
          .from("donatur")
          .insert({
            nama: form.nama.trim(),
            no_hp: form.no_hp || null,
            minimal_bulanan: form.minimal_bulanan,
            metode_default: form.metode_default,
            catatan: form.catatan || null,
            tgl_daftar: form.tgl_daftar,
            created_by: user.user?.id,
            created_by_name: adminNama,
          })
          .select()
          .single();

        if (err) {
          setError(err.message);
          return;
        }
        setList((prev) => [data as Donatur, ...prev]);
      }
      setModalOpen(false);
    });
  };

  const toggleStatus = (d: Donatur) => {
    const newStatus = d.status === "aktif" ? "nonaktif" : "aktif";
    startTransition(async () => {
      await supabase
        .from("donatur")
        .update({ status: newStatus, updated_by_name: adminNama })
        .eq("id", d.id);
      setList((prev) =>
        prev.map((x) =>
          x.id === d.id ? { ...x, status: newStatus, updated_by_name: adminNama } : x
        )
      );
    });
  };

  // Handler Import Excel
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus("Membaca file Excel...");
    try {
      const rows = await readExcelFile<any>(file);
      if (!rows || rows.length === 0) {
        setError("File Excel kosong atau format tidak sesuai.");
        setImportStatus(null);
        return;
      }

      setImportStatus(`Memproses ${rows.length} data donatur...`);

      const payload = rows
        .map((r) => {
          const nama = r["Nama Donatur"] || r["nama"] || r["Nama"] || r["NAMA"];
          if (!nama) return null;
          const noHp = String(r["Nomor HP"] || r["No. HP"] || r["no_hp"] || r["WA"] || "").trim();
          const minNominal = parseInt(r["Minimal Donasi"] || r["Nominal"] || r["minimal_bulanan"] || "50000") || 50000;
          let metode = String(r["Metode Pembayaran"] || r["Metode"] || "Transfer").trim();
          if (!["Transfer", "QRIS", "Tunai", "Lainnya"].includes(metode)) {
            metode = "Transfer";
          }
          const catatan = r["Catatan"] || r["Keterangan"] || null;

          return {
            nama: String(nama).trim(),
            no_hp: noHp || null,
            minimal_bulanan: Math.max(50000, minNominal),
            metode_default: metode as Donatur["metode_default"],
            catatan: catatan ? String(catatan).trim() : null,
            status: "aktif" as const,
            created_by_name: `${adminNama} (Import Excel)`,
          };
        })
        .filter(Boolean);

      if (payload.length === 0) {
        setError("Tidak ada baris donatur yang valid dengan kolom 'Nama Donatur'.");
        setImportStatus(null);
        return;
      }

      const { data, error: insertErr } = await supabase
        .from("donatur")
        .insert(payload as any)
        .select();

      if (insertErr) {
        setError("Gagal import: " + insertErr.message);
        setImportStatus(null);
        return;
      }

      setList((prev) => [...(data as Donatur[]), ...prev]);
      setImportStatus(`Berhasil mengimpor ${data.length} data donatur!`);
      setTimeout(() => {
        setImportModalOpen(false);
        setImportStatus(null);
      }, 1500);
    } catch (err: any) {
      setError("Format file tidak didukung: " + err.message);
      setImportStatus(null);
    }
  };

  const aktifCount = list.filter((d) => d.status === "aktif").length;

  return (
    <div className="space-y-4">
      {/* Top Header & Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Data Donatur</h1>
          <p className="text-xs text-on-surface-variant">
            {aktifCount} donatur aktif dari total {list.length} terdaftar
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => exportDonaturToExcel(list)}
            title="Download seluruh data donatur ke file Excel"
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
            title="Import data donatur massal dari file Excel"
            className="flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface px-3 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors"
          >
            <Upload className="h-3.5 w-3.5 text-primary" /> Import Excel
          </button>

          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-on-primary hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" /> Tambah Donatur
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau nomor HP/WA..."
            className="w-full rounded-xl border border-outline-variant bg-surface pl-9 pr-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex rounded-xl border border-outline-variant overflow-hidden bg-surface">
          {(["aktif", "nonaktif", "semua"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                "px-3.5 py-2.5 text-xs font-semibold capitalize transition-colors",
                filterStatus === s
                  ? "bg-primary text-on-primary"
                  : "bg-surface text-on-surface-variant hover:bg-surface-container"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-outline-variant bg-surface overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="text-left px-4 py-3 font-bold text-on-surface-variant">No</th>
                <th className="text-left px-4 py-3 font-bold text-on-surface-variant">Nama Donatur</th>
                <th className="text-left px-4 py-3 font-bold text-on-surface-variant">No. HP / WA</th>
                <th className="text-right px-4 py-3 font-bold text-on-surface-variant">Min. Donasi</th>
                <th className="text-left px-4 py-3 font-bold text-on-surface-variant">Metode</th>
                <th className="text-left px-4 py-3 font-bold text-on-surface-variant">Status</th>
                <th className="text-left px-4 py-3 font-bold text-on-surface-variant">Penanggung Jawab</th>
                <th className="text-right px-4 py-3 font-bold text-on-surface-variant">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-on-surface-variant">
                    Tidak ada data donatur yang cocok
                  </td>
                </tr>
              ) : (
                filtered.map((d, i) => (
                  <tr key={d.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-4 py-3 text-on-surface-variant">{i + 1}</td>
                    <td className="px-4 py-3 font-semibold text-on-surface">
                      <div>{d.nama}</div>
                      {d.catatan && (
                        <div className="text-[11px] text-on-surface-variant line-clamp-1">{d.catatan}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant font-mono text-xs">{d.no_hp ?? "-"}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-primary tabular-nums">
                      {formatRupiah(d.minimal_bulanan)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold",
                          d.metode_default === "Transfer"
                            ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                            : d.metode_default === "QRIS"
                            ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        )}
                      >
                        {d.metode_default === "Transfer" ? (
                          <CreditCard className="h-3 w-3" />
                        ) : d.metode_default === "QRIS" ? (
                          <QrCode className="h-3 w-3" />
                        ) : (
                          <Banknote className="h-3 w-3" />
                        )}
                        {d.metode_default}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold",
                          d.status === "aktif"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                        )}
                      >
                        {d.status === "aktif" ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <ShieldAlert className="h-3 w-3" />
                        )}
                        {d.status === "aktif" ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 shrink-0 opacity-60" />
                        <span>{d.created_by_name || "Admin"}</span>
                      </div>
                      {d.updated_by_name && (
                        <div className="text-[10px] text-on-surface-variant/75 mt-0.5">
                          Edit: {d.updated_by_name}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(d)}
                          className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => toggleStatus(d)}
                          className={cn(
                            "rounded-lg p-1.5 transition-colors",
                            d.status === "aktif"
                              ? "text-status-warning hover:bg-surface-container"
                              : "text-status-success hover:bg-surface-container"
                          )}
                          title={d.status === "aktif" ? "Nonaktifkan" : "Aktifkan"}
                        >
                          {d.status === "aktif" ? (
                            <UserX className="h-4 w-4" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL INPUT / EDIT DONATUR: SOLID 100%, ANTI GELAP & ANTI BURAM */}
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
                  {editing ? "Edit Data Donatur" : "Tambah Donatur Tetap"}
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
                  Nama Lengkap Donatur *
                </label>
                <input
                  value={form.nama}
                  onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
                  placeholder="Nama donatur"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-1.5">
                  Nomor HP / WhatsApp
                </label>
                <input
                  value={form.no_hp}
                  onChange={(e) => setForm((f) => ({ ...f, no_hp: e.target.value }))}
                  placeholder="08xxxxxxxxxx"
                  type="tel"
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-1.5">
                    Minimal Donasi (Rp) *
                  </label>
                  <input
                    value={form.minimal_bulanan}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, minimal_bulanan: parseInt(e.target.value) || 0 }))
                    }
                    type="number"
                    min={50000}
                    step={50000}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-1.5">
                    Metode Default
                  </label>
                  <select
                    value={form.metode_default}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        metode_default: e.target.value as Donatur["metode_default"],
                      }))
                    }
                    className={inputCls}
                  >
                    {METODE_OPTIONS.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              {!editing && (
                <div>
                  <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-1.5">
                    Tanggal Bergabung
                  </label>
                  <input
                    value={form.tgl_daftar}
                    onChange={(e) => setForm((f) => ({ ...f, tgl_daftar: e.target.value }))}
                    type="date"
                    className={inputCls}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-1.5">
                  Catatan (Opsional)
                </label>
                <textarea
                  value={form.catatan}
                  onChange={(e) => setForm((f) => ({ ...f, catatan: e.target.value }))}
                  rows={2}
                  placeholder="Keterangan tambahan..."
                  className={cn(inputCls, "resize-none")}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-3 border-t border-outline-variant">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex-1 rounded-xl border border-outline-variant bg-surface py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-on-primary hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm"
              >
                {isPending ? "Menyimpan..." : "Simpan Data"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IMPORT EXCEL: SOLID 100%, ANTI GELAP & ANTI BURAM */}
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
                <h2 className="text-lg font-bold text-on-surface">Import Data Donatur</h2>
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
              Unggah file Excel (<strong>.xlsx</strong> / <strong>.xls</strong>) daftar donatur yang sudah dibuat oleh koordinator. Kolom utama: <strong>Nama Donatur</strong>, <strong>Nomor HP</strong>, <strong>Minimal Donasi</strong>, <strong>Metode</strong>.
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

            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center border-2 border-dashed border-outline-variant rounded-2xl p-6 text-center cursor-pointer hover:border-primary transition-colors bg-surface-container-low"
              >
                <Upload className="h-8 w-8 text-primary mb-2" />
                <p className="text-sm font-semibold text-on-surface">Pilih File Excel Donatur</p>
                <p className="text-[11px] text-on-surface-variant mt-1">
                  Format .xlsx atau .xls dari komputer / HP Anda
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleImportExcel}
                  className="hidden"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl bg-surface-container p-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-on-surface">Belum punya formatnya?</p>
                  <p className="text-[11px] text-on-surface-variant">
                    Unduh file template Excel resmi
                  </p>
                </div>
                <button
                  type="button"
                  onClick={downloadTemplateDonaturExcel}
                  className="flex items-center gap-1 rounded-lg border border-outline-variant bg-surface px-2.5 py-1 text-xs font-semibold text-primary hover:bg-surface-container-high transition-colors"
                >
                  <Download className="h-3 w-3" /> Unduh
                </button>
              </div>
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
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-outline-variant bg-surface px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary transition-all";
