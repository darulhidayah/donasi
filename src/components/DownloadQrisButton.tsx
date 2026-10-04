"use client";

import { useState } from "react";
import { Download, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DownloadQrisButtonProps {
  imageUrl?: string;
  fileName?: string;
  className?: string;
}

export default function DownloadQrisButton({
  imageUrl = "/qris.jpg",
  fileName = "QRIS-Masjid-Darul-Hidayah.jpg",
  className,
}: DownloadQrisButtonProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      setDownloading(false);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2500);
    } catch {
      // Fallback direct link download
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = fileName;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setDownloading(false);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2500);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={downloading}
      title="Download gambar QRIS untuk disimpan di galeri / pembayaran"
      className={cn(
        "inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer shadow-2xs disabled:opacity-70",
        downloaded
          ? "bg-emerald-600 text-white shadow-emerald-500/20"
          : "bg-surface border border-outline/80 hover:border-emerald-500/50 hover:bg-emerald-500/5 text-neutral-800 dark:text-neutral-200",
        className
      )}
    >
      {downloading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-emerald-600 dark:text-emerald-400" />
          <span>Mengunduh QRIS...</span>
        </>
      ) : downloaded ? (
        <>
          <Check className="h-4 w-4 text-white animate-in zoom-in-75 duration-200" />
          <span>QRIS Berhasil Diunduh!</span>
        </>
      ) : (
        <>
          <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>Unduh Gambar QRIS</span>
        </>
      )}
    </button>
  );
}
