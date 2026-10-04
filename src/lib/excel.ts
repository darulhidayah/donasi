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
    "Nomor HP / WA": d.no_hp ?? "",
    "Minimal Donasi (Rp)": d.minimal_bulanan,
    "Metode Pembayaran": d.metode_default,
    Status: d.status.toUpperCase(),
    "Tanggal Daftar": formatTanggal(d.tgl_daftar),
    Catatan: d.catatan ?? "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Donatur");
  XLSX.writeFile(workbook, filename);
}

/** Ekspor Rincian Pembayaran Bulanan ke Excel */
export function exportPembayaranToExcel(
  pembayaran: Pembayaran[],
  labelBulan: string,
  filename?: string
) {
  const data = pembayaran.map((p, index) => ({
    No: index + 1,
    "Nama Donatur": p.nama_donatur,
    "Nomor HP / WA": p.no_hp_donatur ?? "",
    Bulan: formatBulan(p.bulan),
    "Nilai Donasi (Rp)": p.nominal,
    "Metode Pembayaran": p.metode,
    Keterangan: p.keterangan ?? "",
    "Tanggal Bayar": formatTanggal(p.tgl_bayar),
    "Dicatat Oleh": p.nama_pencatat ?? "",
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
    Keterangan: r.keterangan ?? "",
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
      "Nomor HP / WA": "081234567890",
      "Minimal Donasi (Rp)": 100000,
      "Metode Pembayaran": "Transfer",
      Catatan: "Donatur tetap sejak awal",
    },
    {
      "Nama Donatur": "Ibu Siti Rahmah (Contoh)",
      "Nomor HP / WA": "082198765432",
      "Minimal Donasi (Rp)": 50000,
      "Metode Pembayaran": "QRIS",
      Catatan: "",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(contoh);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Template Donatur");
  XLSX.writeFile(workbook, "Template_Import_Donatur_MDH.xlsx");
}

/**
 * Membaca file Excel (Array of Objects) secara aman & presisi
 * Menggunakan type array dan raw: false agar angka nol di awal nomor telepon tidak hilang
 */
export async function readExcelFile<T = Record<string, any>>(file: File): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const data = new Uint8Array(buffer);
        const workbook = XLSX.read(data, {
          type: "array",
          cellDates: true,
          raw: false,
        });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<T>(worksheet, {
          defval: "",
          raw: false,
        });
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Mengambil nilai dari objek baris Excel secara case-insensitive & toleran terhadap spasi / simbol
 */
export function getExcelValue(row: Record<string, any>, ...aliases: string[]): string {
  if (!row || typeof row !== "object") return "";
  const clean = (s: string) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const targetAliases = aliases.map(clean);

  for (const [key, val] of Object.entries(row)) {
    if (targetAliases.includes(clean(key))) {
      if (val === null || val === undefined) return "";
      const strVal = String(val).trim();
      if (strVal === "-" || strVal.toLowerCase() === "null" || strVal.toLowerCase() === "undefined") {
        return "";
      }
      return strVal;
    }
  }
  return "";
}

/**
 * Membersihkan dan menormalisasi nomor HP / WA dari Excel
 * Menangani:
 * - Nomor diawali 8... (karena 0 hilang di Excel) -> diubah jadi 08...
 * - Nomor diawali 628... / +628... -> dinormalisasi jadi 08...
 * - Karakter non-digit dibersihkan
 */
export function cleanPhoneNumber(raw: any): string | null {
  if (!raw) return null;
  let str = String(raw).trim();
  if (!str || str === "-" || str.toLowerCase() === "null" || str.toLowerCase() === "none") {
    return null;
  }

  // Hapus karakter non-digit
  str = str.replace(/[^0-9]/g, "");
  if (!str) return null;

  // Jika Excel menghilangkan angka '0' di depan (contoh: 81234567890 -> 081234567890)
  if (str.startsWith("8") && str.length >= 9 && str.length <= 13) {
    str = "0" + str;
  } else if (str.startsWith("628")) {
    str = "0" + str.slice(2);
  }

  if (str.length < 8) return null;

  return str;
}
