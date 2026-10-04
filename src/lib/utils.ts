import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format angka ke rupiah: 50000 → "Rp 50.000" */
export function formatRupiah(angka: number): string {
  return "Rp " + angka.toLocaleString("id-ID");
}

/** Format bulan dari date string: "2024-10-01" → "Oktober 2024" */
export function formatBulan(bulanStr: string): string {
  const d = new Date(bulanStr + (bulanStr.length === 7 ? "-01" : ""));
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

/** Ubah bulan ke format DB: Date → "2024-10-01" */
export function toBulanDB(tahun: number, bulan: number): string {
  return `${tahun}-${String(bulan).padStart(2, "0")}-01`;
}

/** Hitung persentase progress */
export function hitungProgress(terkumpul: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(Math.round((terkumpul / total) * 100), 100);
}

/** Format tanggal: "2024-10-15" → "15 Oktober 2024" */
export function formatTanggal(tglStr: string): string {
  const d = new Date(tglStr);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

/** Daftar bulan dalam bahasa Indonesia */
export const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];
