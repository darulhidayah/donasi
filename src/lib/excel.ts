import * as XLSX from "xlsx";
import { formatRupiah, formatTanggal, formatBulan } from "./utils";
import type { Database } from "./database.types";

type Donatur = Database["public"]["Tables"]["donatur"]["Row"];
type Pembayaran = Database["public"]["Tables"]["pembayaran"]["Row"];

/** Ekspor Daftar Donatur ke File Excel */
export function exportDonaturToExcel(donatur: Donatur[], filename = "Data_Donatur_MDH.xlsx") {
  const data = donatur.map((d) => ({
    No: d.id,
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
    donasiQRIS?: number;
    donasiRekening?: number;
    donasiTunai?: number;
    jumlahDonasi: number;
    setorPihakKetiga: number;
    sisaKasBulan: number;
    sisaHutang: number;
    keterangan?: string;
  }>,
  totalHutang: number,
  filename = "Rekap_Donasi_Pelunasan_Hutang_MDH.xlsx"
) {
  const data = rekapData.map((r) => ({
    No: r.no,
    Bulan: formatBulan(r.bulan),
    "Via QRIS (Rp)": r.donasiQRIS ?? 0,
    "Via Rekening Masjid (Rp)": r.donasiRekening ?? 0,
    "Via Tunai (Rp)": r.donasiTunai ?? 0,
    "Jumlah Donasi Terkumpul (Rp)": r.jumlahDonasi,
    "Jumlah Setor Pihak Ketiga (Rp)": r.setorPihakKetiga,
    "Sisa Saldo Kas Bulan Ini (Rp)": r.sisaKasBulan,
    "Sisa Saldo Hutang (Rp)": r.sisaHutang,
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
      No: 1,
      "Nama Donatur": "H. Ahmad Fauzi (Contoh)",
      "Nomor HP / WA": "081234567890",
      "Minimal Donasi (Rp)": 100000,
      "Metode Pembayaran": "Transfer",
      Catatan: "Donatur tetap sejak awal",
    },
    {
      No: 2,
      "Nama Donatur": "Ibu Siti Rahmah (Contoh)",
      "Nomor HP / WA": "082198765432",
      "Minimal Donasi (Rp)": 50000,
      "Metode Pembayaran": "QRIS",
      Catatan: "",
    },
    {
      No: "",
      "Nama Donatur": "Bapak Abdullah (Donatur Baru)",
      "Nomor HP / WA": "081311223344",
      "Minimal Donasi (Rp)": 150000,
      "Metode Pembayaran": "Tunai",
      Catatan: "Kosongkan No atau beri nomor baru untuk donatur baru",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(contoh);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Template Donatur");
  XLSX.writeFile(workbook, "Template_Import_Donatur_MDH.xlsx");
}


/** Download Template Excel Kosong untuk Import Pembayaran */
export function downloadTemplatePembayaranExcel() {
  const contoh = [
    {
      ID: 1,
      "Nama Donatur": "H. Ahmad Fauzi (Contoh)",
      "Nilai Donasi (Rp)": 100000,
      "Tgl Bayar": "05/10/2026",
      "Metode Pembayaran": "Transfer",
      Keterangan: "Infaq pembangunan",
    },
    {
      ID: 2,
      "Nama Donatur": "Ibu Siti Rahmah (Contoh)",
      "Nilai Donasi (Rp)": 50000,
      "Tgl Bayar": "08/10/2026",
      "Metode Pembayaran": "QRIS",
      Keterangan: "",
    },
    {
      ID: 3,
      "Nama Donatur": "Bapak Abdullah (Contoh)",
      "Nilai Donasi (Rp)": "",
      "Tgl Bayar": "",
      "Metode Pembayaran": "Tunai",
      Keterangan: "Kosongkan nominal jika belum bayar (akan otomatis diabaikan)",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(contoh);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Template Pembayaran");
  XLSX.writeFile(workbook, "Template_Import_Pembayaran_MDH.xlsx");
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

/**
 * Parsing teks yang di-copy langsung dari clipboard Microsoft Excel atau Google Sheets (format TSV)
 * Otomatis mendeteksi header atau menggunakan default kolom jika tanpa header.
 */
export function parseExcelClipboard(
  rawText: string,
  defaultColumns: string[]
): Record<string, string>[] {
  if (!rawText || !rawText.trim()) return [];

  // Pisahkan berdasarkan baris baru
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) return [];

  const splitCells = (line: string) =>
    line.split("\t").map((c) => c.trim().replace(/^["']|["']$/g, ""));

  const firstLineCells = splitCells(lines[0]);

  // Deteksi apakah baris pertama adalah judul kolom / header
  const headerKeywords = [
    "id", "no", "nama", "nilai", "nominal", "jumlah", "donasi",
    "metode", "keterangan", "catatan", "hp", "telepon", "wa"
  ];
  const looksLikeHeader = firstLineCells.some((cell) =>
    headerKeywords.some((kw) => cell.toLowerCase().includes(kw))
  );

  let headers: string[] = [];
  let dataLines: string[] = [];

  if (looksLikeHeader) {
    headers = firstLineCells;
    dataLines = lines.slice(1);
  } else {
    headers = defaultColumns;
    dataLines = lines;
  }

  const result: Record<string, string>[] = [];

  for (const line of dataLines) {
    const cells = splitCells(line);
    // Jika semua sel pada baris ini kosong, lewati
    if (cells.every((c) => !c)) continue;

    const rowObj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      rowObj[header] = cells[idx] ?? "";
    });

    // Petakan juga ke defaultColumns berdasarkan urutan kolom
    defaultColumns.forEach((col, idx) => {
      if (!rowObj[col] && cells[idx] !== undefined) {
        rowObj[col] = cells[idx];
      }
    });

    result.push(rowObj);
  }

  return result;
}

/**
 * Parsing tanggal dari input Excel/Clipboard secara fleksibel
 * Mendukung format:
 * - YYYY-MM-DD (2026-10-05)
 * - DD/MM/YYYY atau DD-MM-YYYY (05/10/2026)
 * - DD/MM/YY atau DD-MM-YY (05/10/26)
 * - Angka hari saja 1..31 (misal "5" -> otomatis memakai tahun & bulan aktif)
 * - Serial number tanggal Excel (contoh: 45200)
 */
export function parseExcelDate(val: any, fallbackDateStr: string): string {
  if (!val) return fallbackDateStr;
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().split("T")[0];
  }
  let str = String(val).trim();
  if (!str) return fallbackDateStr;

  // Jika user hanya menuliskan angka tanggal 1..31 (misal 5 atau 25)
  if (/^\d{1,2}$/.test(str)) {
    const day = parseInt(str);
    if (day >= 1 && day <= 31 && fallbackDateStr.length >= 10) {
      return fallbackDateStr.slice(0, 8) + String(day).padStart(2, "0");
    }
  }

  // Serial number Excel (biasanya 5 digit untuk tahun 2010 - 2035)
  if (/^\d{5}$/.test(str)) {
    const num = parseInt(str);
    const date = new Date(Math.round((num - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) return date.toISOString().split("T")[0];
  }

  // Format YYYY-MM-DD atau YYYY/MM/DD
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(str)) {
    const parts = str.split(/[-/]/);
    return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
  }

  // Format DD/MM/YYYY atau DD-MM-YYYY
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(str)) {
    const parts = str.split(/[-/]/);
    return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  }

  // Format DD/MM/YY atau DD-MM-YY
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2}$/.test(str)) {
    const parts = str.split(/[-/]/);
    const yr = "20" + parts[2];
    return `${yr}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return fallbackDateStr;
}


