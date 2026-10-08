"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { formatRupiah, formatTanggal, formatBulan } from "@/lib/utils";
import {
  exportDonaturToExcel,
  downloadTemplateDonaturExcel,
  readExcelFile,
  getExcelValue,
  cleanPhoneNumber,
} from "@/lib/excel";
import { cn } from "@/lib/utils";
import {
  Plus, Pencil, UserX, UserCheck, Search, X, FileSpreadsheet,
  Upload, Download, AlertCircle, CheckCircle2, User, CreditCard,
  QrCode, Banknote, ShieldAlert, Eye, Calendar, ExternalLink,
  History, Clock, Check, MoreVertical, Trash2,
  ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight
} from "lucide-react";
import type { Database } from "@/lib/database.types";

type Donatur = Database["public"]["Tables"]["donatur"]["Row"];
type Pembayaran = Database["public"]["Tables"]["pembayaran"]["Row"];

function generateBulanList(tglDaftarStr: string) {
  const d = new Date(tglDaftarStr);
  const startY = isNaN(d.getFullYear()) ? new Date().getFullYear() : d.getFullYear();
  const startM = isNaN(d.getMonth()) ? new Date().getMonth() + 1 : d.getMonth() + 1;

  const now = new Date();
  const endY = now.getFullYear();
  const endM = now.getMonth() + 1;

  const list: string[] = [];
  let y = startY;
  let m = startM;

  while (y < endY || (y === endY && m <= endM)) {
    list.push(`${y}-${String(m).padStart(2, "0")}-01`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return list;
}

const METODE_OPTIONS = ["Transfer", "QRIS", "Tunai", "Lainnya"] as const;

type DonaturSortField = "id" | "nama" | "no_hp" | "minimal_bulanan" | "metode_default" | "status";

export default function AdminDonaturClient({
  initialList,
  paidDonaturIds = [],
  adminNama,
  minimalDonasi = 50000,
}: {
  initialList: Donatur[];
  paidDonaturIds?: number[];
  adminNama: string;
  minimalDonasi?: number;
}) {
  const [list, setList] = useState<Donatur[]>(initialList);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"semua" | "aktif" | "nonaktif">("semua");
  const [sortField, setSortField] = useState<DonaturSortField>("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editing, setEditing] = useState<Donatur | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Donatur | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

  
  // State Modal Detail Riwayat Pelunasan Donatur
  const [detailDonatur, setDetailDonatur] = useState<Donatur | null>(null);
  const [detailPembayaran, setDetailPembayaran] = useState<Pembayaran[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close active dropdown menu on outside click or escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-menu-container]")) {
        setActiveMenuId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveMenuId(null);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", handleOutsideClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const openDetail = async (d: Donatur) => {
    setDetailDonatur(d);
    setLoadingDetail(true);
    const { data } = await supabase
      .from("pembayaran")
      .select("*")
      .eq("donatur_id", d.id)
      .order("bulan", { ascending: true });
    setDetailPembayaran((data ?? []) as Pembayaran[]);
    setLoadingDetail(false);
  };

  // Form state
  const [form, setForm] = useState({
    nama: "",
    no_hp: "",
    minimal_bulanan: minimalDonasi,
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

  const handleSort = (field: DonaturSortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const sorted = [...filtered].sort((a, b) => {
    let res = 0;
    if (sortField === "id") {
      res = a.id - b.id;
    } else if (sortField === "nama") {
      res = a.nama.localeCompare(b.nama, "id", { sensitivity: "base" });
    } else if (sortField === "no_hp") {
      res = (a.no_hp || "").localeCompare(b.no_hp || "");
    } else if (sortField === "minimal_bulanan") {
      res = a.minimal_bulanan - b.minimal_bulanan;
    } else if (sortField === "metode_default") {
      res = (a.metode_default || "").localeCompare(b.metode_default || "");
    } else if (sortField === "status") {
      res = a.status.localeCompare(b.status);
    }
    return sortOrder === "asc" ? res : -res;
  });

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 100;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, sorted.length);
  const paginatedList = sorted.slice(startIndex, endIndex);

  const openAdd = () => {
    setEditing(null);
    setForm({
      nama: "",
      no_hp: "",
      minimal_bulanan: minimalDonasi,
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
    if (form.minimal_bulanan < minimalDonasi) {
      setError(`Minimal donasi ${formatRupiah(minimalDonasi)}.`);
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

  const handleDeleteDonatur = () => {
    if (!deleteConfirm) return;
    const donaturId = deleteConfirm.id;

    startTransition(async () => {
      // 1. Cek validasi di tabel pembayaran apakah sudah ada donasi
      const { count } = await supabase
        .from("pembayaran")
        .select("id", { count: "exact", head: true })
        .eq("donatur_id", donaturId);

      if (count && count > 0) {
        setError(`Donatur "${deleteConfirm.nama}" tidak dapat dihapus karena sudah memiliki ${count} riwayat pembayaran donasi.`);
        setDeleteConfirm(null);
        return;
      }

      // 2. Hapus donatur
      const { error: err } = await supabase
        .from("donatur")
        .delete()
        .eq("id", donaturId);

      if (err) {
        setError("Gagal menghapus donatur: " + err.message);
        setDeleteConfirm(null);
        return;
      }

      setList((prev) => prev.filter((d) => d.id !== donaturId));
      setDeleteConfirm(null);
      setError(null);
    });
  };

  // Handler Import Excel Donatur (Smart Sync: Update jika data berubah, abaikan jika sama, tambah jika ID baru)
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

      setImportStatus(`Memeriksa ${rows.length} baris data donatur...`);

      const { data: user } = await supabase.auth.getUser();

      const toInsert: any[] = [];
      const toUpdate: Array<{ id: number; data: any }> = [];
      let skippedCount = 0;

      for (const r of rows) {
        const rawNo = getExcelValue(r, "No", "NO", "No.", "ID", "id", "No ID", "Nomor");
        const nama = getExcelValue(r, "Nama Donatur", "Nama", "Donatur", "NAMA", "nama_donatur", "Nama Lengkap");
        if (!nama) continue;

        const rawNoHp = getExcelValue(
          r,
          "Nomor HP / WA",
          "Nomor HP/WA",
          "No. HP / WA",
          "No HP / WA",
          "Nomor HP",
          "No. HP",
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
        const noHp = cleanPhoneNumber(rawNoHp);

        const rawNominal = getExcelValue(
          r,
          "Minimal Donasi (Rp)",
          "Minimal Donasi",
          "Nilai Donasi",
          "Nominal",
          "Donasi",
          "minimal_bulanan"
        );
        const minNominal = parseInt(rawNominal.replace(/[^0-9]/g, "")) || minimalDonasi;

        let rawMetode = getExcelValue(r, "Metode Pembayaran", "Metode", "Cara Bayar", "metode_default");
        let metode: Donatur["metode_default"] = "Transfer";
        if (rawMetode.toLowerCase().includes("qris")) metode = "QRIS";
        else if (rawMetode.toLowerCase().includes("tunai") || rawMetode.toLowerCase().includes("cash")) metode = "Tunai";
        else if (rawMetode.toLowerCase().includes("transfer") || rawMetode.toLowerCase().includes("bank")) metode = "Transfer";
        else if (rawMetode) metode = "Lainnya";

        const catatan = getExcelValue(r, "Catatan", "Keterangan", "Ket", "Note");

        const rawStatus = getExcelValue(r, "Status", "Status Donatur");
        const status: Donatur["status"] = rawStatus.toLowerCase().includes("nonaktif") ? "nonaktif" : "aktif";

        // Cek ID dari kolom No
        const cleanNo = rawNo ? parseInt(rawNo.replace(/[^0-9]/g, "")) : NaN;
        let existing: Donatur | undefined = undefined;

        if (!isNaN(cleanNo) && cleanNo > 0) {
          existing = list.find((d) => d.id === cleanNo);
        }

        const incomingData = {
          nama: nama.trim(),
          no_hp: noHp || null,
          minimal_bulanan: Math.max(minimalDonasi, minNominal),
          metode_default: metode,
          catatan: catatan ? catatan.trim() : null,
          status,
        };

        if (existing) {
          // Cek apakah ada perubahan data pada ID yang sudah ada
          const normStr = (s: string | null | undefined) => (s ?? "").trim();
          const isChanged =
            normStr(existing.nama).toLowerCase() !== normStr(incomingData.nama).toLowerCase() ||
            normStr(existing.no_hp) !== normStr(incomingData.no_hp) ||
            Number(existing.minimal_bulanan) !== Number(incomingData.minimal_bulanan) ||
            existing.metode_default !== incomingData.metode_default ||
            existing.status !== incomingData.status ||
            normStr(existing.catatan) !== normStr(incomingData.catatan);

          if (isChanged) {
            toUpdate.push({
              id: existing.id,
              data: {
                ...incomingData,
                updated_by_name: `${adminNama} (Import Excel)`,
              },
            });
          } else {
            // Data tidak berubah, abaikan
            skippedCount++;
          }
        } else {
          // ID baru atau belum ada di database -> Tambahkan sebagai donatur baru
          toInsert.push({
            ...incomingData,
            tgl_daftar: new Date().toISOString().split("T")[0],
            created_by: user.user?.id,
            created_by_name: `${adminNama} (Import Excel)`,
          });
        }
      }

      if (toInsert.length === 0 && toUpdate.length === 0) {
        setError(
          `Tidak ada data yang perlu disimpan (${skippedCount} data donatur diabaikan karena tidak ada perubahan).`
        );
        setImportStatus(null);
        return;
      }

      setImportStatus(
        `Menyimpan: ${toInsert.length} donatur baru, memperbarui ${toUpdate.length} data donatur...`
      );

      let updatedList = [...list];

      // 1. Eksekusi Update untuk donatur yang datanya berubah
      for (const item of toUpdate) {
        const { data: updatedDonatur, error: updateErr } = await supabase
          .from("donatur")
          .update(item.data)
          .eq("id", item.id)
          .select()
          .single();

        if (updateErr) {
          console.error("Gagal update donatur id " + item.id, updateErr);
        } else if (updatedDonatur) {
          updatedList = updatedList.map((d) => (d.id === item.id ? (updatedDonatur as Donatur) : d));
        }
      }

      // 2. Eksekusi Insert untuk donatur baru
      if (toInsert.length > 0) {
        const { data: insertedData, error: insertErr } = await supabase
          .from("donatur")
          .insert(toInsert)
          .select();

        if (insertErr) {
          setError("Gagal menambahkan donatur baru: " + insertErr.message);
          setImportStatus(null);
          return;
        }

        if (insertedData) {
          updatedList = [...(insertedData as Donatur[]), ...updatedList];
        }
      }

      // 3. Update state list donatur
      setList(updatedList);

      setImportStatus(
        `Selesai: ${toInsert.length} donatur baru ditambahkan, ${toUpdate.length} diperbarui, ${skippedCount} diabaikan (tidak berubah).`
      );

      setTimeout(() => {
        setImportModalOpen(false);
        setImportStatus(null);
      }, 2500);
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
      <div className="flex gap-3 flex-wrap items-center justify-between">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau nomor HP/WA..."
            className="w-full rounded-xl border border-outline-variant bg-surface pl-9 pr-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Tab Filter Status */}
        <div className="flex rounded-xl border border-outline-variant overflow-hidden bg-surface shadow-2xs">
          {[
            { key: "semua", label: "Semua", count: list.length },
            { key: "aktif", label: "Aktif", count: list.filter((d) => d.status === "aktif").length },
            { key: "nonaktif", label: "Nonaktif", count: list.filter((d) => d.status === "nonaktif").length },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setFilterStatus(t.key as any)}
              className={cn(
                "px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 transition-colors border-r last:border-r-0 border-outline-variant",
                filterStatus === t.key
                  ? "bg-primary text-on-primary"
                  : "bg-surface text-on-surface-variant hover:bg-surface-container"
              )}
            >
              <span>{t.label}</span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none",
                  filterStatus === t.key
                    ? "bg-on-primary/20 text-on-primary"
                    : "bg-surface-container-high text-on-surface-variant"
                )}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-surface shadow-sm ring-1 ring-black/[0.05] dark:ring-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="text-left px-4 py-3 font-bold text-on-surface-variant w-12">No</th>
                <th
                  onClick={() => handleSort("id")}
                  className="text-left px-4 py-3 font-bold text-on-surface-variant cursor-pointer hover:text-on-surface select-none transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>ID</span>
                    {sortField === "id" ? (
                      sortOrder === "asc" ? <ArrowUp className="h-3.5 w-3.5 text-primary" /> : <ArrowDown className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("nama")}
                  className="text-left px-4 py-3 font-bold text-on-surface-variant cursor-pointer hover:text-on-surface select-none transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Nama Donatur</span>
                    {sortField === "nama" ? (
                      sortOrder === "asc" ? <ArrowUp className="h-3.5 w-3.5 text-primary" /> : <ArrowDown className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("no_hp")}
                  className="text-left px-4 py-3 font-bold text-on-surface-variant cursor-pointer hover:text-on-surface select-none transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>No. HP / WA</span>
                    {sortField === "no_hp" ? (
                      sortOrder === "asc" ? <ArrowUp className="h-3.5 w-3.5 text-primary" /> : <ArrowDown className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("minimal_bulanan")}
                  className="text-right px-4 py-3 font-bold text-on-surface-variant cursor-pointer hover:text-on-surface select-none transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Min. Donasi</span>
                    {sortField === "minimal_bulanan" ? (
                      sortOrder === "asc" ? <ArrowUp className="h-3.5 w-3.5 text-primary" /> : <ArrowDown className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("metode_default")}
                  className="text-left px-4 py-3 font-bold text-on-surface-variant cursor-pointer hover:text-on-surface select-none transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Metode</span>
                    {sortField === "metode_default" ? (
                      sortOrder === "asc" ? <ArrowUp className="h-3.5 w-3.5 text-primary" /> : <ArrowDown className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("status")}
                  className="text-left px-4 py-3 font-bold text-on-surface-variant cursor-pointer hover:text-on-surface select-none transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    {sortField === "status" ? (
                      sortOrder === "asc" ? <ArrowUp className="h-3.5 w-3.5 text-primary" /> : <ArrowDown className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100" />
                    )}
                  </div>
                </th>
                <th className="text-left px-4 py-3 font-bold text-on-surface-variant">Penanggung Jawab</th>
                <th className="text-right px-4 py-3 font-bold text-on-surface-variant">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-on-surface-variant">
                    Tidak ada data donatur yang cocok dengan filter ({filterStatus})
                  </td>
                </tr>
              ) : (
                paginatedList.map((d, i) => (
                  <tr key={d.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-4 py-3 text-on-surface-variant">{startIndex + i + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-primary tabular-nums" title={`ID Donatur: #${d.id}`}>
                      #{d.id}
                    </td>
                    <td className="px-4 py-3 font-semibold text-on-surface">
                      <div>{d.nama}</div>
                      {d.catatan && (
                        <div className="text-[11px] text-on-surface-variant line-clamp-1">{d.catatan}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant font-mono text-xs">
                      {d.no_hp ? (
                        <a
                          href={`https://wa.me/${d.no_hp.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-primary-dark dark:hover:text-primary hover:underline flex items-center gap-1"
                          title="Hubungi via WhatsApp"
                        >
                          <span>{d.no_hp}</span>
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
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
                            : "bg-status-success/10 text-status-success border border-status-success/20"
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
                    {/* Toggle Switch Status Donatur */}
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleStatus(d)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full pl-1.5 pr-2.5 py-1 text-xs font-semibold transition-all border shadow-2xs hover:scale-105 active:scale-95 cursor-pointer",
                          d.status === "aktif"
                            ? "bg-status-success/10 text-status-success border-status-success/30 hover:bg-status-success/20"
                            : "bg-surface-container-high text-on-surface-variant border-outline-variant hover:bg-surface-container-highest"
                        )}
                        title={`Klik untuk switch status menjadi ${d.status === "aktif" ? "Nonaktif" : "Aktif"}`}
                      >
                        <span
                          className={cn(
                            "h-4 w-4 rounded-full flex items-center justify-center transition-colors shadow-2xs",
                            d.status === "aktif"
                              ? "bg-status-success text-white"
                              : "bg-on-surface-variant/40 text-surface"
                          )}
                        >
                          {d.status === "aktif" ? (
                            <Check className="h-2.5 w-2.5 stroke-[3]" />
                          ) : (
                            <X className="h-2.5 w-2.5 stroke-[3]" />
                          )}
                        </span>
                        <span className="capitalize">{d.status}</span>
                      </button>
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
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Tombol Detail (Bisa Diakses Langsung) */}
                        <button
                          onClick={() => openDetail(d)}
                          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors shadow-2xs cursor-pointer"
                          title="Lihat Rincian Riwayat Pelunasan Bulanan"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Detail</span>
                        </button>

                        {/* Menu Titik Tiga (Opsi: Edit & Hapus) */}
                        <div className="relative inline-block text-left" data-menu-container>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === d.id ? null : d.id);
                            }}
                            className={cn(
                              "rounded-lg p-1.5 transition-colors cursor-pointer",
                              activeMenuId === d.id
                                ? "bg-surface-container text-on-surface ring-1 ring-outline-variant"
                                : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                            )}
                            title="Opsi Lainnya"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          {activeMenuId === d.id && (
                            <div
                              className={cn(
                                "absolute right-0 w-44 rounded-xl border border-outline-variant bg-surface dark:bg-surface-container p-1 shadow-xl dark:shadow-2xl z-30 text-left animate-in fade-in zoom-in-95 duration-100",
                                i >= sorted.length - 2 && sorted.length > 2
                                  ? "bottom-full mb-1"
                                  : "top-full mt-1"
                              )}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Edit Data */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  openEdit(d);
                                }}
                                className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-high dark:hover:bg-surface-container-highest transition-colors text-left cursor-pointer"
                              >
                                <Pencil className="h-3.5 w-3.5 text-on-surface-variant" />
                                <span>Edit Data</span>
                              </button>

                              {/* Hapus Donatur */}
                              {paidDonaturIds.includes(d.id) ? (
                                <div
                                  className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-on-surface-variant/40 cursor-not-allowed text-left select-none"
                                  title="Donatur sudah memiliki riwayat pembayaran donasi sehingga tidak dapat dihapus. Anda dapat menonaktifkannya melalui tombol status."
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>Hapus (Terkunci)</span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    setDeleteConfirm(d);
                                  }}
                                  className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors text-left cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>Hapus Donatur</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

          </table>
        </div>

        {/* Pagination Bar (100 baris per halaman) */}
        {sorted.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-outline-variant bg-surface-container-low text-xs text-on-surface-variant">
            <div>
              Menampilkan <span className="font-semibold text-on-surface">{startIndex + 1}</span> -{" "}
              <span className="font-semibold text-on-surface">{endIndex}</span> dari{" "}
              <span className="font-semibold text-on-surface">{sorted.length}</span> donatur
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage === 1}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-outline-variant bg-surface hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-on-surface"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Sebelumnya</span>
                </button>

                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={cn(
                        "h-7 min-w-7 px-2 rounded-lg text-xs font-semibold transition-colors",
                        safeCurrentPage === pageNum
                          ? "bg-primary text-on-primary shadow-2xs"
                          : "hover:bg-surface-container text-on-surface-variant hover:text-on-surface"
                      )}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-outline-variant bg-surface hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-on-surface"
                >
                  <span>Berikutnya</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
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
                    min={minimalDonasi}
                    step={minimalDonasi}
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
                      <option
                        key={m}
                        className="bg-surface text-on-surface dark:bg-[#24221e] dark:text-[#f3f1eb]"
                      >
                        {m}
                      </option>
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
              Unggah file Excel (<strong>.xlsx</strong> / <strong>.xls</strong>) daftar donatur.
              <br />
              Kolom template: <strong>No</strong> (ID Donatur), <strong>Nama Donatur</strong>, <strong>Nomor HP / WA</strong>, <strong>Minimal Donasi (Rp)</strong>, <strong>Metode Pembayaran</strong>, dan <strong>Catatan</strong>.
              <br />
              <span className="text-[11px] opacity-80">
                • <strong>ID yang sudah ada:</strong> jika ada perubahan data otomatis di-<strong>update</strong>, jika sama otomatis di-<strong>abaikan</strong>.
                <br />
                • <strong>ID baru / baris tambahan:</strong> otomatis di-<strong>tambahkan</strong> sebagai donatur baru.
              </span>
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

      {/* ============================================================== */}
      {/* MODAL DETAIL DONATUR: RIWAYAT PELUNASAN PER BULAN */}
      {/* ============================================================== */}
      {detailDonatur && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 dark:bg-black/80 transition-opacity"
            onClick={() => setDetailDonatur(null)}
          />

          <div className="relative z-10 w-full max-w-2xl rounded-2xl modal-panel p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header Modal */}
            <div className="flex items-start justify-between mb-4 border-b border-outline-variant pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-on-surface">{detailDonatur.nama}</h2>
                  <button
                    type="button"
                    onClick={() => toggleStatus(detailDonatur)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full pl-1.5 pr-2.5 py-0.5 text-[11px] font-semibold transition-all border shadow-2xs",
                      detailDonatur.status === "aktif"
                        ? "bg-status-success/10 text-status-success border-status-success/30"
                        : "bg-surface-container-high text-on-surface-variant border-outline-variant"
                    )}
                    title="Klik untuk mengubah status aktif/nonaktif"
                  >
                    <span
                      className={cn(
                        "h-3.5 w-3.5 rounded-full flex items-center justify-center text-white",
                        detailDonatur.status === "aktif" ? "bg-status-success" : "bg-neutral-500"
                      )}
                    >
                      {detailDonatur.status === "aktif" ? (
                        <Check className="h-2 w-2 stroke-[3]" />
                      ) : (
                        <X className="h-2 w-2 stroke-[3]" />
                      )}
                    </span>
                    <span className="capitalize">{detailDonatur.status}</span>
                  </button>
                </div>

                <div className="flex items-center gap-3 text-xs text-on-surface-variant mt-1.5 flex-wrap">
                  {detailDonatur.no_hp && (
                    <a
                      href={`https://wa.me/${detailDonatur.no_hp.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-primary-dark dark:text-primary hover:underline font-mono"
                    >
                      <span>{detailDonatur.no_hp}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  <span>•</span>
                  <span>Bergabung: <strong>{formatTanggal(detailDonatur.tgl_daftar)}</strong></span>
                  <span>•</span>
                  <span>Metode: <strong>{detailDonatur.metode_default}</strong></span>
                </div>
              </div>

              <button
                onClick={() => setDetailDonatur(null)}
                type="button"
                className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="py-16 text-center">
                <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-on-surface-variant">Memuat riwayat pelunasan...</p>
              </div>
            ) : (
              (() => {
                const bulanList = generateBulanList(detailDonatur.tgl_daftar);
                // Urutkan dari bulan terbaru ke bulan terlama agar paling relevan di atas
                const sortedBulan = [...bulanList].reverse();
                const totalBayar = detailPembayaran.reduce((sum, p) => sum + p.nominal, 0);
                const lunasBulanCount = bulanList.filter((b) =>
                  detailPembayaran.some((p) => p.bulan === b)
                ).length;
                const tunggakanCount = Math.max(0, bulanList.length - lunasBulanCount);
                const estimasiTunggakan = tunggakanCount * detailDonatur.minimal_bulanan;

                return (
                  <div className="space-y-4">
                    {/* Ringkasan Statistik Donatur */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant">
                        <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">
                          Total Donasi Masuk
                        </p>
                        <p className="font-mono text-base font-bold text-primary tabular-nums mt-0.5">
                          {formatRupiah(totalBayar)}
                        </p>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">
                          Komitmen: {formatRupiah(detailDonatur.minimal_bulanan)}/bln
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant">
                        <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">
                          Kepatuhan Bulanan
                        </p>
                        <p className="font-mono text-base font-bold text-primary-dark dark:text-primary tabular-nums mt-0.5">
                          {lunasBulanCount} / {bulanList.length} Bulan
                        </p>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">
                          {bulanList.length > 0
                            ? Math.round((lunasBulanCount / bulanList.length) * 100)
                            : 0}% tertib pelunasan
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant">
                        <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">
                          Status Tunggakan
                        </p>
                        {tunggakanCount === 0 ? (
                          <div className="flex items-center gap-1.5 mt-1 text-status-success font-bold text-sm">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Lunas Semua Bulan</span>
                          </div>
                        ) : (
                          <>
                            <p className="font-mono text-base font-bold text-rose-600 dark:text-rose-400 tabular-nums mt-0.5">
                              {tunggakanCount} Bulan Terlewat
                            </p>
                            <p className="text-[11px] text-on-surface-variant mt-0.5">
                              Est. {formatRupiah(estimasiTunggakan)}
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Timeline Rincian Per Bulan */}
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5 font-label">
                          <History className="h-4 w-4 text-primary" />
                          <span>Rincian Pembayaran Per Bulan (Sejak Bergabung)</span>
                        </h3>
                        <span className="text-[11px] text-on-surface-variant">
                          Mulai: {formatBulan(bulanList[0] || detailDonatur.tgl_daftar)}
                        </span>
                      </div>

                      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                        {sortedBulan.map((bulan) => {
                          const pay = detailPembayaran.find((p) => p.bulan === bulan);
                          const isLunas = Boolean(pay);

                          // Teks WA Pengingat
                          const cleanHp = (detailDonatur.no_hp ?? "").replace(/[^0-9]/g, "");
                          const waText = encodeURIComponent(
                            `Assalamu'alaikum Warahmatullahi Wabarakatuh Bapak/Ibu ${detailDonatur.nama}.\n\n` +
                            `Semoga senantiasa dalam limpahan berkah dan kesehatan sekeluarga.\n\n` +
                            `Kami dari Panitia Pelunasan Hutang Pembangunan Masjid Darul Hidayah Titik Nol Tanah Merah Boven Digoel ingin menginformasikan komitmen donasi bulanan untuk periode *${formatBulan(bulan)}* sebesar *${formatRupiah(detailDonatur.minimal_bulanan)}*.\n\n` +
                            `Bapak/Ibu dapat menyalurkan melalui:\n` +
                            `• Rekening BSI / Bank Kas Masjid\n` +
                            `• QRIS Masjid Darul Hidayah\n` +
                            `• Maupun setor tunai ke pengurus DKM.\n\n` +
                            `Jazakumullahu Khairan Katsiran atas keistiqomahan Bapak/Ibu dalam memakmurkan rumah Allah.`
                          );

                          return (
                            <div
                              key={bulan}
                              className={cn(
                                "rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors",
                                isLunas
                                  ? "border-status-success/20 bg-status-success/5 hover:border-status-success/30"
                                  : "border-outline-variant bg-surface-container-low/50 hover:border-outline"
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={cn(
                                    "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                                    isLunas
                                      ? "bg-status-success/10 text-status-success"
                                      : "bg-surface-container-high text-on-surface-variant"
                                  )}
                                >
                                  {isLunas ? (
                                    <Check className="h-4 w-4 stroke-[2.5]" />
                                  ) : (
                                    <Clock className="h-4 w-4" />
                                  )}
                                </div>

                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-on-surface">
                                      {formatBulan(bulan)}
                                    </span>
                                    {isLunas ? (
                                      <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold bg-status-success/15 text-status-success">
                                        Lunas
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300">
                                        Belum Bayar
                                      </span>
                                    )}
                                  </div>

                                  {isLunas && pay ? (
                                    <div className="text-xs text-on-surface-variant mt-1 space-y-0.5">
                                      <p>
                                        Disetor pada <strong>{formatTanggal(pay.tgl_bayar)}</strong> via{" "}
                                        <span className="font-semibold text-on-surface">{pay.metode}</span>
                                      </p>
                                      {pay.keterangan && (
                                        <p className="italic text-[11px]">&quot;{pay.keterangan}&quot;</p>
                                      )}
                                      <p className="text-[10px] text-on-surface-variant/75">
                                        Pencatat: {pay.nama_pencatat || pay.dicatat_oleh || "Admin"}
                                      </p>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-on-surface-variant mt-0.5">
                                      Kewajiban komitmen:{" "}
                                      <strong className="text-on-surface font-mono">
                                        {formatRupiah(detailDonatur.minimal_bulanan)}
                                      </strong>
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-outline-variant/40">
                                {isLunas && pay ? (
                                  <span className="font-mono font-bold text-sm text-primary tabular-nums">
                                    {formatRupiah(pay.nominal)}
                                  </span>
                                ) : (
                                  <>
                                    <span className="font-mono font-semibold text-xs text-rose-600 dark:text-rose-400 tabular-nums">
                                      -
                                    </span>
                                    {cleanHp && (
                                      <a
                                        href={`https://wa.me/${cleanHp}?text=${waText}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold bg-primary/10 hover:bg-primary/20 text-primary-dark dark:text-primary transition-colors"
                                        title="Kirim pengingat donasi ramah via WhatsApp"
                                      >
                                        <span>Kirim WA</span>
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-outline-variant flex justify-end">
                      <button
                        type="button"
                        onClick={() => setDetailDonatur(null)}
                        className="rounded-xl border border-outline-variant bg-surface px-5 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors"
                      >
                        Tutup
                      </button>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS DONATUR */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 dark:bg-black/80 transition-opacity"
            onClick={() => !isPending && setDeleteConfirm(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl modal-panel p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3">
              <div className="h-10 w-10 rounded-full bg-rose-500/15 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-on-surface">Hapus Donatur?</h3>
                <p className="text-xs text-on-surface-variant">Tindakan tidak dapat dibatalkan</p>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant mb-4 leading-relaxed">
              Apakah Anda yakin ingin menghapus data donatur{" "}
              <strong className="text-on-surface">{deleteConfirm.nama}</strong>?
              Donatur ini belum pernah tercatat menyetor donasi sehingga dapat dihapus dengan aman.
            </p>

            <div className="flex gap-2.5 pt-2 border-t border-outline-variant">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-xl border border-outline-variant bg-surface py-2 text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleDeleteDonatur}
                className="flex-1 rounded-xl bg-rose-600 text-white py-2 text-xs font-semibold hover:bg-rose-700 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isPending ? (
                  <>
                    <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Ya, Hapus</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-outline-variant bg-surface dark:bg-surface-container px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary transition-all";

