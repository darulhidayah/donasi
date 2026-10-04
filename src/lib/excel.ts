import * as XLSX from "xlsx";
import { formatRupiah, formatTanggal, formatBulan } from "./utils";
import type { Database } from "./database.types";

type Donatur = Database["public"]["Tables"]["donatur"]["Row"];
type Pembayaran = Database["public"]["Tables"]["pembayaran"]["Row"];

/** Ekspor Daftar Donatur ke File Excel */
export function exportDonaturToExcel(donatur: Donatur[], filename = "Data_Donatur_MDH.xlsx") {
  const data = donatur.map((d, index) => ({
    No: index + 1,
    "Nama Donatur": d.nama,
    "Nomor HP / WA": d.no_hp ?? "-",
    "Minimal Donasi (Rp)": d.minimal_bulanan,
    "Metode Pembayaran": d.metode_default,
    Status: d.status.toUpperCase(),
    "Tanggal Daftar": formatTanggal(d.tgl_daftar),
    Catatan: d.catatan ?? "-",
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Donatur");
  XLSX.writeFile(workbook, filename);
}

/** Ekspor Rincian Pembayaran Bulanan ke Excel (Sesuai Template Koordinator) */
export function exportPembayaranToExcel(
  pembayaran: Pembayaran[],
  labelBulan: string,
  filename?: string
) {
  const data = pembayaran.map((p, index) => ({
    No: index + 1,
    "Nama Donatur": p.nama_donatur,
    "No. HP": p.no_hp_donatur ?? "-",
    Bulan: formatBulan(p.bulan),
    "Nilai Donasi": p.nominal,
    "Keterangan Donasi": p.metode + (p.keterangan ? ` - ${p.keterangan}` : ""),
    "Tanggal Bayar": formatTanggal(p.tgl_bayar),
    "Dicatat Oleh": p.nama_pencatat ?? "-",
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Rincian ${labelBulan}`);
  XLSX.writeFile(workbook, filename ?? `Rincian_Pembayaran_${labelBulan.replace(/\s+/g, "_")}.xlsx`);
}

/** Ekspor Rekap Hutang & Donasi ke Excel (Sesuai Template Koordinator) */
export function exportRekapToExcel(
  rekapData: Array<{
    no: number;
    bulan: string;
    jumlahDonasi: number;
    setorPihakKetiga: number;
    totalMasuk: number;
    sisaHutang: number;
    keterangan?: string;
  }>,
  totalHutang: number,
  filename = "Rekap_Donasi_Pelunasan_Hutang_MDH.xlsx"
) {
  const data = rekapData.map((r) => ({
    No: r.no,
    Bulan: formatBulan(r.bulan),
    "Jumlah Donasi": r.jumlahDonasi,
    "Saldo Hutang Awal": totalHutang,
    "Jumlah Setor Pihak Ketiga": r.setorPihakKetiga,
    "Total Masuk": r.totalMasuk,
    "Sisa Saldo Hutang": r.sisaHutang,
    Keterangan: r.keterangan ?? "-",
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap");
  XLSX.writeFile(workbook, filename);
}

/** Download Template Excel Kosong untuk Import Donatur */
export function downloadTemplateDonaturExcel() {
  const contoh = [
    {
      "Nama Donatur": "H. Ahmad Fauzi (Contoh)",
      "Nomor HP": "081234567890",
      "Minimal Donasi": 100000,
      "Metode Pembayaran": "Transfer",
      Catatan: "Donatur tetap sejak awal",
    },
    {
      "Nama Donatur": "Ibu Siti Rahmah (Contoh)",
      "Nomor HP": "082198765432",
      "Minimal Donasi": 50000,
      "Metode Pembayaran": "QRIS",
      Catatan: "",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(contoh);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Template Donatur");
  XLSX.writeFile(workbook, "Template_Import_Donatur_MDH.xlsx");
}

/** Membaca file Excel (Array of Objects) */
export async function readExcelFile<T = Record<string, any>>(file: File): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const workbook = XLSX.read(buffer, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<T>(worksheet);
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}
