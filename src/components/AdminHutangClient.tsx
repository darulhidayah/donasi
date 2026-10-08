"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { formatRupiah, formatTanggal, formatPersen, hitungProgress } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  Plus, Pencil, Trash2, Building2, CheckCircle2, Clock, X,
  AlertCircle, User, ShieldAlert, Receipt, Upload, Eye,
  ExternalLink, FileText, Check, ArrowUpRight, DollarSign,
  Maximize2, Download, MoreVertical, Wallet
} from "lucide-react";
import type { Database } from "@/lib/database.types";

type SumberHutang = Database["public"]["Tables"]["sumber_hutang"]["Row"];
type PembayaranHutang = Database["public"]["Tables"]["pembayaran_hutang"]["Row"];

export default function AdminHutangClient({
  initialList,
  initialPembayaran = [],
  totalDonasiTerkumpul = 0,
  adminNama,
}: {
  initialList: SumberHutang[];
  initialPembayaran?: PembayaranHutang[];
  totalDonasiTerkumpul?: number;
  adminNama: string;
}) {
  const [list, setList] = useState<SumberHutang[]>(initialList);
  const [pembayaranList, setPembayaranList] = useState<PembayaranHutang[]>(initialPembayaran);

  // Modal Sumber Hutang (Add / Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<SumberHutang | null>(null);
  const [editing, setEditing] = useState<SumberHutang | null>(null);

  // Modal Bayar Hutang (Cicilan / Pelunasan + Bukti Kwitansi)
  const [bayarModalOpen, setBayarModalOpen] = useState(false);
  const [selectedHutangForBayar, setSelectedHutangForBayar] = useState<SumberHutang | null>(null);
  const [fileKwitansi, setFileKwitansi] = useState<File | null>(null);
  const [previewKwitansiUrl, setPreviewKwitansiUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Modal Riwayat & Lightbox
  const [riwayatModalOpen, setRiwayatModalOpen] = useState(false);
  const [selectedHutangForRiwayat, setSelectedHutangForRiwayat] = useState<SumberHutang | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [deleteBayarConfirm, setDeleteBayarConfirm] = useState<PembayaranHutang | null>(null);

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId !== null) {
      window.addEventListener("click", handleClickOutside);
      return () => window.removeEventListener("click", handleClickOutside);
    }
  }, [openMenuId]);

  // Form Sumber Hutang
  const [form, setForm] = useState({
    nama_kreditor: "",
    nominal: 100000000,
    terbayar: 0,
    keterangan: "",
    status: "belum_lunas" as SumberHutang["status"],
  });

  // Form Bayar Hutang
  const [bayarForm, setBayarForm] = useState({
    sumber_hutang_id: 0,
    tanggal_bayar: new Date().toISOString().split("T")[0],
    nominal: 0,
    metode: "Transfer" as "Transfer" | "Tunai" | "Cek" | "Lainnya",
    no_referensi: "",
    keterangan: "",
  });

  const totalHutang = list.reduce((s, h) => s + h.nominal, 0);

  // Total Terbayar dihitung secara akurat dari riwayat pembayaran kwitansi & data kreditor
  const totalTerbayarTransaksi = pembayaranList.reduce((s, p) => s + (p.nominal || 0), 0);
  const totalTerbayarList = list.reduce((s, h) => s + (h.terbayar || 0), 0);
  const totalTerbayar = Math.max(totalTerbayarTransaksi, totalTerbayarList);
  const totalSisa = Math.max(0, totalHutang - totalTerbayar);

  // Saldo Kas Real Saat Ini = Total Donasi Terkumpul (All-Time) - Total Hutang Pernah Dibayarkan (All-Time)
  const saldoKasSaatIni = Math.max(0, totalDonasiTerkumpul - totalTerbayar);

  // ==========================================
  // SUMBER HUTANG HANDLERS
  // ==========================================
  const openAdd = () => {
    setEditing(null);
    setForm({
      nama_kreditor: "",
      nominal: 100000000,
      terbayar: 0,
      keterangan: "",
      status: "belum_lunas",
    });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (item: SumberHutang) => {
    const itemBayarList = pembayaranList.filter((p) => p.sumber_hutang_id === item.id);
    const storeBayarTotal = itemBayarList.reduce((sum, p) => sum + (p.nominal || 0), 0);
    const terbayarAkurat = Math.max(item.terbayar || 0, storeBayarTotal);

    setEditing(item);
    setForm({
      nama_kreditor: item.nama_kreditor,
      nominal: item.nominal,
      terbayar: terbayarAkurat,
      keterangan: item.keterangan ?? "",
      status: item.status,
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSaveHutang = () => {
    if (!form.nama_kreditor.trim()) {
      setError("Nama toko / pihak kreditor wajib diisi.");
      return;
    }
    if (form.nominal <= 0) {
      setError("Nominal hutang harus lebih dari 0.");
      return;
    }
    setError(null);

    const itemBayarList = editing ? pembayaranList.filter((p) => p.sumber_hutang_id === editing.id) : [];
    const storeBayarTotal = itemBayarList.reduce((sum, p) => sum + (p.nominal || 0), 0);
    const finalTerbayar = Math.max(form.terbayar, storeBayarTotal);

    let statusFinal = form.status;
    if (finalTerbayar >= form.nominal) {
      statusFinal = "lunas";
    } else if (finalTerbayar > 0) {
      statusFinal = "sebagian";
    } else {
      statusFinal = "belum_lunas";
    }

    startTransition(async () => {
      if (editing) {
        const { data, error: err } = await supabase
          .from("sumber_hutang")
          .update({
            nama_kreditor: form.nama_kreditor.trim(),
            nominal: form.nominal,
            terbayar: finalTerbayar,
            keterangan: form.keterangan || null,
            status: statusFinal,
            updated_by_name: adminNama,
          })
          .eq("id", editing.id)
          .select()
          .single();

        if (err) {
          setError(err.message);
          return;
        }
        setList((prev) => prev.map((h) => (h.id === editing.id ? (data as SumberHutang) : h)));
      } else {
        const { data, error: err } = await supabase
          .from("sumber_hutang")
          .insert({
            nama_kreditor: form.nama_kreditor.trim(),
            nominal: form.nominal,
            terbayar: form.terbayar,
            keterangan: form.keterangan || null,
            status: statusFinal,
            created_by_name: adminNama,
          })
          .select()
          .single();

        if (err) {
          setError(err.message);
          return;
        }
        setList((prev) => [data as SumberHutang, ...prev]);
      }
      setModalOpen(false);
    });
  };

  const handleDeleteHutang = (item: SumberHutang) => {
    const hasTransactions = pembayaranList.some((p) => p.sumber_hutang_id === item.id);
    if (hasTransactions) {
      alert("Tidak dapat menghapus pihak kreditor yang sudah memiliki riwayat transaksi pembayaran.");
      setDeleteConfirm(null);
      return;
    }

    startTransition(async () => {
      const { error: err } = await supabase.from("sumber_hutang").delete().eq("id", item.id);
      if (err) {
        alert("Gagal menghapus: " + err.message);
        return;
      }
      setList((prev) => prev.filter((h) => h.id !== item.id));
      setDeleteConfirm(null);
    });
  };

  // ==========================================
  // PEMBAYARAN & KWITANSI HANDLERS
  // ==========================================
  const openBayarModal = (targetItem?: SumberHutang) => {
    const item = targetItem || list[0];
    if (!item) {
      alert("Harap buat data sumber hutang terlebih dahulu.");
      return;
    }
    const sisa = Math.max(0, item.nominal - item.terbayar);
    setSelectedHutangForBayar(item);

    // Nilai default: jumlah saldo kas saat ini (real), tetapi tidak melebihi sisa hutang toko
    const defaultNominal = Math.min(saldoKasSaatIni, sisa);

    setBayarForm({
      sumber_hutang_id: item.id,
      tanggal_bayar: new Date().toISOString().split("T")[0],
      nominal: defaultNominal,
      metode: "Transfer",
      no_referensi: "",
      keterangan: "",
    });
    setFileKwitansi(null);
    setPreviewKwitansiUrl(null);
    setError(null);
    setBayarModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validasi ukuran maks 10MB
    if (file.size > 10 * 1024 * 1024) {
      setError("Ukuran file kwitansi maksimal 10MB.");
      return;
    }

    setFileKwitansi(file);
    setError(null);

    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewKwitansiUrl(url);
    } else {
      setPreviewKwitansiUrl(null);
    }
  };

  const handleSavePembayaran = async () => {
    if (!bayarForm.sumber_hutang_id) {
      setError("Pilih toko / kreditor tujuan pembayaran.");
      return;
    }
    if (bayarForm.nominal <= 0) {
      setError("Nominal pembayaran harus lebih dari 0.");
      return;
    }

    // Validasi: Setoran pembayaran hutang tidak boleh melebihi saldo kas riil saat ini
    if (bayarForm.nominal > saldoKasSaatIni) {
      setError(
        `Nominal pembayaran (${formatRupiah(bayarForm.nominal)}) tidak boleh melebihi saldo kas riil yang tersedia (${formatRupiah(saldoKasSaatIni)}). Saldo kas real saat ini adalah total donasi terkumpul dikurangi total pembayaran hutang yang sudah pernah disetorkan.`
      );
      return;
    }

    const targetHutang = list.find((h) => h.id === bayarForm.sumber_hutang_id);
    if (!targetHutang) {
      setError("Sumber hutang tidak ditemukan.");
      return;
    }

    const sisaHutang = Math.max(0, targetHutang.nominal - targetHutang.terbayar);
    if (bayarForm.nominal > sisaHutang) {
      setError(
        `Nominal pembayaran (${formatRupiah(bayarForm.nominal)}) melebihi sisa hutang ke kreditor ini (${formatRupiah(sisaHutang)}).`
      );
      return;
    }

    setError(null);
    setUploadProgress(true);

    try {
      let buktiUrl: string | null = null;

      // 1. Upload file kwitansi jika ada
      if (fileKwitansi) {
        const formData = new FormData();
        formData.append("file", fileKwitansi);
        formData.append("sumber_hutang_id", bayarForm.sumber_hutang_id.toString());

        const res = await fetch("/api/upload-kwitansi", {
          method: "POST",
          body: formData,
        });

        const uploadData = await res.json();
        if (!res.ok || uploadData.error) {
          throw new Error(uploadData.error || "Gagal mengunggah bukti kwitansi.");
        }
        buktiUrl = uploadData.url;
      }

      // 2. Simpan record ke tabel pembayaran_hutang
      const { data: newBayar, error: bayarErr } = await supabase
        .from("pembayaran_hutang")
        .insert({
          sumber_hutang_id: bayarForm.sumber_hutang_id,
          tanggal_bayar: bayarForm.tanggal_bayar,
          nominal: bayarForm.nominal,
          metode: bayarForm.metode,
          no_referensi: bayarForm.no_referensi || null,
          bukti_url: buktiUrl,
          keterangan: bayarForm.keterangan || null,
          dicatat_oleh_name: adminNama,
        })
        .select()
        .single();

      if (bayarErr) {
        throw new Error(bayarErr.message);
      }

      // 3. Update otomatis nilai terbayar & status di sumber_hutang
      const newTerbayar = targetHutang.terbayar + bayarForm.nominal;
      let newStatus: SumberHutang["status"] = "sebagian";
      if (newTerbayar >= targetHutang.nominal) {
        newStatus = "lunas";
      } else if (newTerbayar <= 0) {
        newStatus = "belum_lunas";
      }

      await supabase
        .from("sumber_hutang")
        .update({
          terbayar: newTerbayar,
          status: newStatus,
          updated_by_name: adminNama,
        })
        .eq("id", targetHutang.id);

      // 4. Update UI State lokal secara instan
      setList((prev) =>
        prev.map((h) =>
          h.id === targetHutang.id
            ? { ...h, terbayar: newTerbayar, status: newStatus, updated_by_name: adminNama }
            : h
        )
      );

      if (newBayar) {
        setPembayaranList((prev) => [newBayar as PembayaranHutang, ...prev]);
      }

      setBayarModalOpen(false);
      setSuccessMsg(
        `Pembayaran ke ${targetHutang.nama_kreditor} sebesar ${formatRupiah(
          bayarForm.nominal
        )} berhasil dicatat!`
      );
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan pembayaran.";
      setError(msg);
    } finally {
      setUploadProgress(false);
    }
  };

  const openRiwayat = (item: SumberHutang) => {
    setSelectedHutangForRiwayat(item);
    setRiwayatModalOpen(true);
  };

  const handleDeletePembayaran = async (bayar: PembayaranHutang) => {
    startTransition(async () => {
      const { error: err } = await supabase
        .from("pembayaran_hutang")
        .delete()
        .eq("id", bayar.id);

      if (err) {
        alert("Gagal menghapus pembayaran: " + err.message);
        return;
      }

      // Hitung ulang terbayar untuk sumber hutang terkait
      const targetHutang = list.find((h) => h.id === bayar.sumber_hutang_id);
      if (targetHutang) {
        const newTerbayar = Math.max(0, targetHutang.terbayar - bayar.nominal);
        let newStatus: SumberHutang["status"] = "belum_lunas";
        if (newTerbayar >= targetHutang.nominal) {
          newStatus = "lunas";
        } else if (newTerbayar > 0) {
          newStatus = "sebagian";
        }

        await supabase
          .from("sumber_hutang")
          .update({
            terbayar: newTerbayar,
            status: newStatus,
            updated_by_name: adminNama,
          })
          .eq("id", targetHutang.id);

        setList((prev) =>
          prev.map((h) =>
            h.id === targetHutang.id
              ? { ...h, terbayar: newTerbayar, status: newStatus, updated_by_name: adminNama }
              : h
          )
        );
      }

      setPembayaranList((prev) => prev.filter((p) => p.id !== bayar.id));
      setDeleteBayarConfirm(null);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Rincian Sumber Hutang & Kwitansi</h1>
          <p className="text-xs text-on-surface-variant">
            Pencatatan rincian hutang material/jasa dan realisasi pembayaran cicilan disertai upload bukti kwitansi
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => openBayarModal()}
            className="flex items-center gap-2 rounded-xl bg-primary-container px-4 py-2.5 text-xs font-semibold text-on-primary-container hover:brightness-110 transition-all shadow-soft active:scale-95 font-label"
          >
            <Receipt className="h-4 w-4" /> Catat Pembayaran / Kwitansi
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 rounded-xl border border-primary/40 bg-surface px-4 py-2.5 text-xs font-semibold text-primary-dark dark:text-primary hover:bg-primary/10 transition-all shadow-2xs active:scale-95 font-label"
          >
            <Plus className="h-4 w-4" /> Tambah Sumber Hutang
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="flex items-center justify-between rounded-xl bg-status-success/15 border border-status-success/30 p-4 text-xs font-medium text-status-success">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-status-success shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="p-1 hover:opacity-75">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Summary Cards (Sama Style dengan Dashboard Admin) */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 stagger-children">
        <StatCard
          icon={<Building2 className="h-5 w-5" />}
          watermark={<Building2 className="h-12 w-12" />}
          label="Total Kewajiban"
          value={formatRupiah(totalHutang)}
          sub={`${list.length} Pihak Kreditor / Toko`}
          theme="primary"
        />
        <StatCard
          icon={<Receipt className="h-5 w-5" />}
          watermark={<Receipt className="h-12 w-12" />}
          label="Telah Disalurkan"
          value={formatRupiah(totalTerbayar)}
          sub={`${pembayaranList.length} Transaksi Kwitansi`}
          theme="success"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          watermark={<Clock className="h-12 w-12" />}
          label="Sisa Kewajiban"
          value={formatRupiah(totalSisa)}
          sub={
            totalHutang > 0
              ? `${formatPersen(totalTerbayar, totalHutang)} Terlunasi`
              : "0%"
          }
          theme="danger"
        />
        <StatCard
          icon={<Wallet className="h-5 w-5" />}
          watermark={<Wallet className="h-12 w-12" />}
          label="Saldo Kas Standby"
          value={formatRupiah(saldoKasSaatIni)}
          sub={
            totalDonasiTerkumpul > 0
              ? `Dari ${formatRupiah(totalDonasiTerkumpul)} donasi`
              : "Kas pelunasan"
          }
          theme="gold"
        />
      </div>

      {/* Main Table: Sumber Hutang & Action Bar */}
      <div className="rounded-xl bg-surface shadow-sm ring-1 ring-black/[0.05] dark:ring-white/[0.06] overflow-hidden">
        <div className="p-4 border-b border-outline-variant/60 bg-surface-container-low/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-on-surface">Daftar Pihak Kreditor</h2>
            <p className="text-xs text-on-surface-variant">
              Klik &quot;Bayar Cicilan&quot; untuk mencatat pelunasan bertahap dan melampirkan kwitansi resmi
            </p>
          </div>
          <span className="text-xs font-medium text-on-surface-variant">
            {list.length} Sumber Terdata
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="text-left px-4 py-3.5 font-bold text-on-surface-variant">No</th>
                <th className="text-left px-4 py-3.5 font-bold text-on-surface-variant">Nama Toko / Kreditor</th>
                <th className="text-right px-4 py-3.5 font-bold text-on-surface-variant">Pagu Hutang</th>
                <th className="text-right px-4 py-3.5 font-bold text-on-surface-variant">Terbayar</th>
                <th className="text-right px-4 py-3.5 font-bold text-on-surface-variant">Sisa Hutang</th>
                <th className="text-center px-4 py-3.5 font-bold text-on-surface-variant">Progres & Status</th>
                <th className="text-center px-4 py-3.5 font-bold text-on-surface-variant">Bukti Kwitansi</th>
                <th className="text-right px-4 py-3.5 font-bold text-on-surface-variant">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-on-surface-variant">
                    Belum ada data sumber hutang. Klik tombol &quot;Tambah Sumber Hutang&quot; di atas.
                  </td>
                </tr>
              ) : (
                list.map((item, idx) => {
                  const itemBayarList = pembayaranList.filter((p) => p.sumber_hutang_id === item.id);
                  const countKwitansi = itemBayarList.filter((p) => p.bukti_url).length;
                  const totalTerbayarItem = Math.max(
                    item.terbayar || 0,
                    itemBayarList.reduce((sum, p) => sum + (p.nominal || 0), 0)
                  );
                  const sisa = Math.max(0, item.nominal - totalTerbayarItem);
                  const persenStr = formatPersen(totalTerbayarItem, item.nominal);
                  const persenNum = hitungProgress(totalTerbayarItem, item.nominal);
                  const statusFinal =
                    totalTerbayarItem >= item.nominal && item.nominal > 0
                      ? "lunas"
                      : totalTerbayarItem > 0
                      ? "sebagian"
                      : item.status;

                  return (
                    <tr key={item.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-4 py-3.5 text-on-surface-variant">{idx + 1}</td>
                      <td className="px-4 py-3.5 font-bold text-on-surface">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary shrink-0" />
                          <span className="text-base">{item.nama_kreditor}</span>
                        </div>
                        {item.keterangan && (
                          <div className="text-[11px] text-on-surface-variant font-normal mt-1 line-clamp-1">
                            {item.keterangan}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-on-surface-variant font-normal">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3 opacity-60" /> {item.created_by_name || "Admin"}
                          </span>
                          {item.updated_by_name && item.updated_by_name !== item.created_by_name && (
                            <span className="opacity-75">• Update: {item.updated_by_name}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-semibold text-on-surface tabular-nums">
                        {formatRupiah(item.nominal)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-semibold text-status-success tabular-nums">
                        {totalTerbayarItem > 0 ? formatRupiah(totalTerbayarItem) : "-"}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-status-danger tabular-nums">
                        {formatRupiah(sisa)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold capitalize",
                              statusFinal === "lunas"
                                ? "bg-status-success/15 text-status-success border border-status-success/20"
                                : statusFinal === "sebagian"
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                            )}
                          >
                            {statusFinal === "lunas" ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : statusFinal === "sebagian" ? (
                              <Clock className="h-3 w-3" />
                            ) : (
                              <ShieldAlert className="h-3 w-3" />
                            )}
                            {statusFinal.replace("_", " ")} ({persenStr})
                          </span>
                          {/* Mini Progress Bar */}
                          <div className="w-24 bg-surface-container rounded-full h-1.5 overflow-hidden">
                            <div
                              className={cn(
                                "h-full transition-all duration-300",
                                statusFinal === "lunas"
                                  ? "bg-status-success"
                                  : statusFinal === "sebagian"
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                              )}
                              style={{ width: `${Math.max(persenNum, totalTerbayarItem > 0 ? 2 : 0)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => openRiwayat(item)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
                            itemBayarList.length > 0
                              ? "bg-primary/10 text-primary-dark dark:text-primary hover:bg-primary/20"
                              : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                          )}
                          title="Lihat rincian pembayaran dan kwitansi"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                          <span>{itemBayarList.length} Kwitansi</span>
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-right relative">
                        <div className="flex items-center justify-end gap-1.5">
                          {sisa > 0 && (
                            <button
                              onClick={() => openBayarModal(item)}
                              className="inline-flex items-center gap-1 rounded-xl bg-primary-container text-on-primary-container hover:brightness-110 px-3 py-1.5 text-xs font-semibold shadow-soft transition-all active:scale-95 font-label"
                              title="Bayar cicilan ke toko ini"
                            >
                              <DollarSign className="h-3.5 w-3.5" />
                              <span className="hidden md:inline">Bayar</span>
                            </button>
                          )}

                          {/* Menu Titik Tiga (Three Dots) */}
                          <div className="relative inline-block text-left">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === item.id ? null : item.id);
                              }}
                              type="button"
                              className={cn(
                                "rounded-lg p-1.5 transition-colors",
                                openMenuId === item.id
                                  ? "bg-surface-container text-on-surface"
                                  : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                              )}
                              title="Menu Opsi Kreditor"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {openMenuId === item.id && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-full mt-1 w-48 rounded-xl bg-surface shadow-xl ring-1 ring-black/[0.08] dark:ring-white/[0.08] py-1.5 z-30"
                              >
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    openEdit(item);
                                  }}
                                  type="button"
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-on-surface hover:bg-surface-container transition-colors text-left"
                                >
                                  <Pencil className="h-3.5 w-3.5 text-on-surface-variant" />
                                  <span>Edit Sumber Hutang</span>
                                </button>

                                {itemBayarList.length > 0 ? (
                                  <div
                                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-on-surface-variant/40 cursor-not-allowed select-none border-t border-outline-variant/40"
                                    title="Tidak dapat dihapus karena sudah ada riwayat transaksi pembayaran"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">Hapus (Ada Transaksi)</span>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      setDeleteConfirm(item);
                                    }}
                                    type="button"
                                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-status-danger hover:bg-error-container hover:text-on-error-container transition-colors text-left border-t border-outline-variant/40"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span>Hapus Sumber Hutang</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {list.length > 0 && (
              <tfoot className="bg-surface-container-low border-t-2 border-outline-variant">
                <tr>
                  <td colSpan={2} className="px-4 py-3.5 font-bold text-on-surface">
                    TOTAL KESELURUHAN
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-black text-on-surface tabular-nums">
                    {formatRupiah(totalHutang)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-black text-status-success tabular-nums">
                    {formatRupiah(totalTerbayar)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-black text-status-danger tabular-nums">
                    {formatRupiah(totalSisa)}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: CATAT PEMBAYARAN KE SUMBER HUTANG DENGAN UPLOAD KWITANSI */}
      {/* ============================================================== */}
      {bayarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 dark:bg-black/80 transition-opacity"
            onClick={() => !uploadProgress && setBayarModalOpen(false)}
          />

          <div className="relative z-10 w-full max-w-lg rounded-2xl modal-panel p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-outline-variant pb-3">
              <div>
                <h2 className="text-lg font-bold text-on-surface flex items-center gap-2 font-headline">
                  <Receipt className="h-5 w-5 text-primary-dark dark:text-primary" />
                  <span>Bayar Hutang & Upload Kwitansi</span>
                </h2>
                <p className="text-[11px] text-on-surface-variant font-body">
                  Penanggung jawab: <strong className="text-primary-dark dark:text-primary">{adminNama}</strong>
                </p>
              </div>
              <button
                onClick={() => setBayarModalOpen(false)}
                disabled={uploadProgress}
                type="button"
                className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container hover:text-on-surface disabled:opacity-40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Panel Ringkasan Akumulasi & Saldo Kas Real */}
            <div className="mb-4 rounded-xl border border-outline-variant bg-surface-container-low p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-on-surface-variant flex items-center gap-1.5 font-label">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Akumulasi Donasi Terkumpul (All-Time):
                </span>
                <span className="font-mono font-bold text-on-surface tabular-nums">
                  {formatRupiah(totalDonasiTerkumpul)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-on-surface-variant flex items-center gap-1.5 font-label">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Total Setoran Hutang Sebelumnya:
                </span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                  {formatRupiah(totalTerbayar)}
                </span>
              </div>
              <div className="pt-2 border-t border-outline-variant flex items-center justify-between">
                <span className="text-xs font-bold text-on-surface flex items-center gap-1.5 font-label">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
                  Saldo Kas Riil Saat Ini (Batas Maks. Bayar):
                </span>
                <span className="font-mono font-extrabold text-sm text-primary-dark dark:text-primary tabular-nums">
                  {formatRupiah(saldoKasSaatIni)}
                </span>
              </div>
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-error-container px-3.5 py-2.5 text-xs text-on-error-container">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Pilih Toko / Kreditor */}
              <div>
                <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-1.5">
                  Toko / Pihak Kreditor *
                </label>
                <select
                  value={bayarForm.sumber_hutang_id}
                  onChange={(e) => {
                    const id = parseInt(e.target.value);
                    const selected = list.find((h) => h.id === id);
                    setSelectedHutangForBayar(selected || null);
                    const sisa = selected ? Math.max(0, selected.nominal - selected.terbayar) : 0;
                    setBayarForm((f) => ({
                      ...f,
                      sumber_hutang_id: id,
                      nominal: Math.min(saldoKasSaatIni, sisa),
                    }));
                  }}
                  className={inputCls}
                >
                  {list.map((h) => {
                    const sisa = Math.max(0, h.nominal - h.terbayar);
                    return (
                      <option
                        key={h.id}
                        value={h.id}
                        className="bg-surface text-on-surface dark:bg-[#24221e] dark:text-[#f3f1eb]"
                      >
                        {h.nama_kreditor} (Sisa Hutang: {formatRupiah(sisa)})
                      </option>
                    );
                  })}
                </select>
                {selectedHutangForBayar && (
                  <div className="mt-2 p-2.5 rounded-xl bg-surface-container-low text-xs flex justify-between">
                    <span className="text-on-surface-variant">Sisa Hutang Saat Ini:</span>
                    <span className="font-mono font-bold text-status-danger tabular-nums">
                      {formatRupiah(Math.max(0, selectedHutangForBayar.nominal - selectedHutangForBayar.terbayar))}
                    </span>
                  </div>
                )}
              </div>

              {/* Tanggal & Metode Bayar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-1.5">
                    Tanggal Pembayaran *
                  </label>
                  <input
                    type="date"
                    value={bayarForm.tanggal_bayar}
                    onChange={(e) => setBayarForm((f) => ({ ...f, tanggal_bayar: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-1.5">
                    Metode Pembayaran
                  </label>
                  <select
                    value={bayarForm.metode}
                    onChange={(e) =>
                      setBayarForm((f) => ({
                        ...f,
                        metode: e.target.value as "Transfer" | "Tunai" | "Cek" | "Lainnya",
                      }))
                    }
                    className={inputCls}
                  >
                    <option value="Transfer" className="bg-surface text-on-surface dark:bg-[#24221e] dark:text-[#f3f1eb]">Transfer Bank Kas</option>
                    <option value="Tunai" className="bg-surface text-on-surface dark:bg-[#24221e] dark:text-[#f3f1eb]">Tunai / Kas Langsung</option>
                    <option value="Cek" className="bg-surface text-on-surface dark:bg-[#24221e] dark:text-[#f3f1eb]">Cek / Giro Bank</option>
                    <option value="Lainnya" className="bg-surface text-on-surface dark:bg-[#24221e] dark:text-[#f3f1eb]">Lainnya</option>
                  </select>
                </div>
              </div>

              {/* Nominal Pembayaran */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider">
                    Nominal Pembayaran (Rp) *
                  </label>
                  <span className="text-[11px] font-medium text-on-surface-variant font-label">
                    Maks. Saldo: <strong className="text-primary-dark dark:text-primary font-mono">{formatRupiah(saldoKasSaatIni)}</strong>
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 font-mono text-sm font-semibold text-on-surface-variant">
                    Rp
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={saldoKasSaatIni}
                    value={bayarForm.nominal || ""}
                    onChange={(e) =>
                      setBayarForm((f) => ({ ...f, nominal: parseInt(e.target.value) || 0 }))
                    }
                    placeholder="0"
                    className={cn(
                      inputCls,
                      "pl-11 font-mono font-bold text-base tabular-nums",
                      bayarForm.nominal > saldoKasSaatIni && "border-rose-500 focus:ring-rose-500 text-rose-600"
                    )}
                  />
                </div>

                {/* Validasi jika input melebihi saldo kas saat ini */}
                {bayarForm.nominal > saldoKasSaatIni && (
                  <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1 font-medium">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    Nominal melebihi saldo kas riil ({formatRupiah(saldoKasSaatIni)}). Setoran hutang tidak boleh melebihi saldo kas tersedia.
                  </p>
                )}

                {/* Quick Presets */}
                {selectedHutangForBayar && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(() => {
                      const sisa = Math.max(0, selectedHutangForBayar.nominal - selectedHutangForBayar.terbayar);
                      return (
                        <>
                          {saldoKasSaatIni > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setBayarForm((f) => ({
                                  ...f,
                                  nominal: Math.min(saldoKasSaatIni, sisa),
                                }))
                              }
                              className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary-dark dark:text-primary text-[11px] font-bold transition-colors font-label"
                              title="Set nominal maksimal sesuai saldo kas riil"
                            >
                              Gunakan Saldo Kas Real ({formatRupiah(Math.min(saldoKasSaatIni, sisa))})
                            </button>
                          )}
                          {sisa > 0 && saldoKasSaatIni >= sisa && (
                            <button
                              type="button"
                              onClick={() => setBayarForm((f) => ({ ...f, nominal: sisa }))}
                              className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold transition-colors"
                            >
                              Lunasi Toko ({formatRupiah(sisa)})
                            </button>
                          )}
                          {[5000000, 10000000, 25000000, 50000000]
                            .filter((preset) => preset <= saldoKasSaatIni && preset <= sisa)
                            .map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setBayarForm((f) => ({ ...f, nominal: preset }))}
                                className="px-2 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-[11px] font-medium transition-colors"
                              >
                                {formatRupiah(preset)}
                              </button>
                            ))}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* No Referensi & Keterangan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-1.5">
                    No. Kwitansi / Ref Transfer
                  </label>
                  <input
                    value={bayarForm.no_referensi}
                    onChange={(e) => setBayarForm((f) => ({ ...f, no_referensi: e.target.value }))}
                    placeholder="Contoh: KW-2026/04/01"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-1.5">
                    Keterangan Tambahan
                  </label>
                  <input
                    value={bayarForm.keterangan}
                    onChange={(e) => setBayarForm((f) => ({ ...f, keterangan: e.target.value }))}
                    placeholder="Misal: Pelunasan nota semen sak ke-3"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Upload Bukti Kwitansi */}
              <div>
                <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-1.5">
                  Upload Bukti Kwitansi / Struk Pelunasan
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {!fileKwitansi ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-outline-variant hover:border-primary rounded-xl p-5 text-center cursor-pointer transition-colors bg-surface-container-low/50 hover:bg-surface-container-low"
                  >
                    <Upload className="h-7 w-7 text-primary mx-auto mb-2" />
                    <p className="text-xs font-semibold text-on-surface">
                      Klik atau seret file bukti kwitansi ke sini
                    </p>
                    <p className="text-[11px] text-on-surface-variant mt-1">
                      Mendukung format gambar (JPG, PNG, WebP) atau Dokumen PDF (Maks. 10MB)
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-outline-variant p-3 bg-surface-container-low flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {previewKwitansiUrl ? (
                        <img
                          src={previewKwitansiUrl}
                          alt="Pratinjau Kwitansi"
                          className="h-12 w-12 object-cover rounded-lg border border-outline-variant shrink-0"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <FileText className="h-6 w-6" />
                        </div>
                      )}
                      <div className="truncate">
                        <p className="text-xs font-semibold text-on-surface truncate">{fileKwitansi.name}</p>
                        <p className="text-[10px] text-on-surface-variant mt-0.5">
                          {(fileKwitansi.size / 1024).toFixed(1)} KB • Siap diunggah
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {previewKwitansiUrl && (
                        <button
                          type="button"
                          onClick={() => setLightboxUrl(previewKwitansiUrl)}
                          className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container"
                          title="Lihat Pratinjau"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setFileKwitansi(null);
                          setPreviewKwitansiUrl(null);
                        }}
                        className="p-1.5 rounded-lg text-status-danger hover:bg-error-container"
                        title="Hapus berkas"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {saldoKasSaatIni <= 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3.5 py-2.5 text-xs text-amber-700 dark:text-amber-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  Saat ini tidak ada saldo kas riil yang tersedia untuk disetorkan (Saldo: Rp 0). Menunggu donasi baru masuk.
                </span>
              </div>
            )}

            <div className="flex gap-3 mt-6 pt-3 border-t border-outline-variant">
              <button
                type="button"
                onClick={() => setBayarModalOpen(false)}
                disabled={uploadProgress}
                className="flex-1 rounded-xl border border-outline-variant bg-surface py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSavePembayaran}
                disabled={
                  uploadProgress ||
                  bayarForm.nominal <= 0 ||
                  bayarForm.nominal > saldoKasSaatIni ||
                  saldoKasSaatIni <= 0
                }
                className="flex-1 rounded-xl bg-primary-container text-on-primary-container py-2.5 text-sm font-semibold hover:brightness-110 disabled:opacity-50 transition-all shadow-soft flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed font-label active:scale-95"
              >
                {uploadProgress ? (
                  <>
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Mengunggah & Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Konfirmasi Pembayaran</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: RIWAYAT PEMBAYARAN & DAFTAR BUKTI KWITANSI */}
      {/* ============================================================== */}
      {riwayatModalOpen && selectedHutangForRiwayat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 dark:bg-black/80 transition-opacity"
            onClick={() => setRiwayatModalOpen(false)}
          />

          <div className="relative z-10 w-full max-w-2xl rounded-2xl modal-panel p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-outline-variant pb-3">
              <div>
                <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <span>Riwayat Kwitansi & Pembayaran</span>
                </h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Kreditor: <strong className="text-on-surface">{selectedHutangForRiwayat.nama_kreditor}</strong>
                </p>
              </div>
              <button
                onClick={() => setRiwayatModalOpen(false)}
                type="button"
                className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Ringkasan Header */}
            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-surface-container-low mb-4">
              <div>
                <p className="text-[10px] uppercase font-bold text-on-surface-variant">Pagu Hutang</p>
                <p className="font-mono text-sm font-bold text-on-surface tabular-nums">
                  {formatRupiah(selectedHutangForRiwayat.nominal)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-on-surface-variant">Telah Dibayar</p>
                <p className="font-mono text-sm font-bold text-status-success tabular-nums">
                  {formatRupiah(selectedHutangForRiwayat.terbayar)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-on-surface-variant">Sisa Hutang</p>
                <p className="font-mono text-sm font-bold text-status-danger tabular-nums">
                  {formatRupiah(Math.max(0, selectedHutangForRiwayat.nominal - selectedHutangForRiwayat.terbayar))}
                </p>
              </div>
            </div>

            {/* List Transaksi Pembayaran */}
            {(() => {
              const items = pembayaranList.filter(
                (p) => p.sumber_hutang_id === selectedHutangForRiwayat.id
              );

              if (items.length === 0) {
                return (
                  <div className="py-12 text-center text-on-surface-variant">
                    <Receipt className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">Belum ada riwayat pembayaran ke toko ini.</p>
                    <button
                      onClick={() => {
                        setRiwayatModalOpen(false);
                        openBayarModal(selectedHutangForRiwayat);
                      }}
                      className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary-container text-on-primary-container text-xs font-semibold hover:brightness-110 shadow-soft transition-all active:scale-95 font-label"
                    >
                      <Plus className="h-4 w-4" /> Catat Pembayaran Pertama
                    </button>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {items.map((p, idx) => (
                    <div
                      key={p.id}
                      className="rounded-xl border border-outline-variant bg-surface p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-lg bg-status-success/10 text-status-success flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-base text-status-success tabular-nums">
                              {formatRupiah(p.nominal)}
                            </span>
                            <span className="text-[11px] rounded-full px-2 py-0.5 bg-surface-container text-on-surface-variant font-medium">
                              {p.metode}
                            </span>
                          </div>
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            Tanggal: <strong>{formatTanggal(p.tanggal_bayar)}</strong>
                            {p.no_referensi && (
                              <span> • No. Ref: <strong className="font-mono">{p.no_referensi}</strong></span>
                            )}
                          </p>
                          {p.keterangan && (
                            <p className="text-xs text-on-surface mt-1 italic">&quot;{p.keterangan}&quot;</p>
                          )}
                          <p className="text-[10px] text-on-surface-variant/75 mt-1">
                            Dicatat oleh: {p.dicatat_oleh_name || "Admin"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {p.bukti_url ? (
                          p.bukti_url.endsWith(".pdf") ? (
                            <a
                              href={p.bukti_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 text-xs font-semibold transition-colors"
                            >
                              <FileText className="h-4 w-4" />
                              <span>Lihat PDF</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setLightboxUrl(p.bukti_url)}
                              className="group relative h-12 w-12 rounded-lg overflow-hidden border border-outline-variant hover:border-primary transition-all"
                              title="Klik untuk perbesar bukti kwitansi"
                            >
                              <img
                                src={p.bukti_url}
                                alt="Kwitansi"
                                className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                <Maximize2 className="h-4 w-4" />
                              </div>
                            </button>
                          )
                        ) : (
                          <span className="text-[11px] text-on-surface-variant/60 italic">
                            Tanpa lampiran
                          </span>
                        )}

                        <button
                          onClick={() => setDeleteBayarConfirm(p)}
                          className="rounded-lg p-1.5 text-on-surface-variant hover:bg-error-container hover:text-status-danger transition-colors ml-1"
                          title="Hapus catatan pembayaran ini"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            <div className="mt-5 pt-3 border-t border-outline-variant flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  setRiwayatModalOpen(false);
                  openBayarModal(selectedHutangForRiwayat);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary-container text-on-primary-container px-4 py-2 text-xs font-semibold hover:brightness-110 transition-all shadow-soft active:scale-95 font-label"
              >
                <Plus className="h-4 w-4" /> Tambah Pembayaran Baru
              </button>
              <button
                type="button"
                onClick={() => setRiwayatModalOpen(false)}
                className="rounded-xl border border-outline-variant bg-surface px-4 py-2 text-xs font-medium text-on-surface hover:bg-surface-container"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: LIGHTBOX PRATINJAU FOTO KWITANSI RESOLUSI PENUH */}
      {/* ============================================================== */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-xs transition-opacity"
            onClick={() => setLightboxUrl(null)}
          />
          <div className="relative z-10 max-w-3xl w-full max-h-[90vh] flex flex-col items-center">
            <div className="w-full flex items-center justify-between pb-3 text-white">
              <span className="text-sm font-semibold flex items-center gap-2">
                <Receipt className="h-4 w-4" /> Bukti Kwitansi / Struk Pembayaran
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxUrl}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="rounded-lg p-1.5 bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Unduh / Buka di Tab Baru"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  onClick={() => setLightboxUrl(null)}
                  className="rounded-lg p-1.5 bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Tutup"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="relative rounded-2xl overflow-hidden bg-black max-h-[80vh] flex items-center justify-center shadow-2xl border border-white/10">
              <img
                src={lightboxUrl}
                alt="Bukti Kwitansi Resolusi Penuh"
                className="max-h-[80vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: TAMBAH / EDIT SUMBER HUTANG */}
      {/* ============================================================== */}
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
                  {editing ? "Edit Sumber Hutang" : "Tambah Sumber Hutang"}
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
                  Nama Toko / Kreditor *
                </label>
                <input
                  value={form.nama_kreditor}
                  onChange={(e) => setForm((f) => ({ ...f, nama_kreditor: e.target.value }))}
                  placeholder="Misal: Toko Bangunan A / TB Harapan"
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-1.5">
                    Nominal Hutang (Rp) *
                  </label>
                  <input
                    value={form.nominal}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, nominal: parseInt(e.target.value) || 0 }))
                    }
                    type="number"
                    min={0}
                    step={10000000}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-1.5">
                    Telah Terbayar (Rp)
                  </label>
                  <input
                    value={form.terbayar}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, terbayar: parseInt(e.target.value) || 0 }))
                    }
                    type="number"
                    min={0}
                    step={5000000}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-1.5">
                  Status Pelunasan
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value as SumberHutang["status"] }))
                  }
                  className={inputCls}
                >
                  <option value="belum_lunas" className="bg-surface text-on-surface dark:bg-[#24221e] dark:text-[#f3f1eb]">Belum Lunas</option>
                  <option value="sebagian" className="bg-surface text-on-surface dark:bg-[#24221e] dark:text-[#f3f1eb]">Sebagian Terbayar</option>
                  <option value="lunas" className="bg-surface text-on-surface dark:bg-[#24221e] dark:text-[#f3f1eb]">Lunas Sepenuhnya</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-1.5">
                  Keterangan / Rincian Material
                </label>
                <textarea
                  value={form.keterangan}
                  onChange={(e) => setForm((f) => ({ ...f, keterangan: e.target.value }))}
                  rows={2}
                  placeholder="Misal: Pembelian semen 500 sak, besi cor, bata ringan"
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
                onClick={handleSaveHutang}
                disabled={isPending}
                className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-on-primary hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm"
              >
                {isPending ? "Menyimpan..." : "Simpan Data"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: KONFIRMASI HAPUS PEMBAYARAN HUTANG */}
      {/* ============================================================== */}
      {deleteBayarConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 dark:bg-black/80 transition-opacity"
            onClick={() => setDeleteBayarConfirm(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl modal-panel p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-on-surface mb-2">Hapus Catatan Pembayaran?</h2>
            <p className="text-sm text-on-surface-variant mb-5">
              Hapus pembayaran sebesar{" "}
              <strong className="text-status-danger font-mono font-bold tabular-nums">
                {formatRupiah(deleteBayarConfirm.nominal)}
              </strong>
              ? Langkah ini akan otomatis mengurangi nilai terbayar pada sumber hutang terkait.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteBayarConfirm(null)}
                className="flex-1 rounded-xl border border-outline-variant bg-surface py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDeletePembayaran(deleteBayarConfirm)}
                disabled={isPending}
                className="flex-1 rounded-xl bg-status-danger py-2.5 text-sm font-semibold text-white hover:bg-status-danger/90 disabled:opacity-60"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 6: KONFIRMASI HAPUS SUMBER HUTANG */}
      {/* ============================================================== */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 dark:bg-black/80 transition-opacity"
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl modal-panel p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-on-surface mb-2">Hapus Sumber Hutang?</h2>
            <p className="text-sm text-on-surface-variant mb-5">
              Hapus catatan hutang pada kreditor{" "}
              <strong className="text-on-surface">{deleteConfirm.nama_kreditor}</strong> sebesar{" "}
              <span className="font-mono font-bold text-status-danger tabular-nums">
                {formatRupiah(deleteConfirm.nominal)}
              </span>
              ? Seluruh riwayat kwitansi terkait juga akan terhapus.
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
                onClick={() => handleDeleteHutang(deleteConfirm)}
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
  "w-full rounded-xl border border-outline-variant bg-surface dark:bg-surface-container px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary transition-all";


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
    <div className="bento-card bg-white dark:bg-surface border border-outline-variant/60 overflow-hidden group hover-lift relative p-5 shadow-soft">
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
