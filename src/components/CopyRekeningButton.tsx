"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyRekeningButtonProps {
  nomorRekening: string;
  className?: string;
  variant?: "button" | "badge";
}

export default function CopyRekeningButton({
  nomorRekening,
  className,
  variant = "button",
}: CopyRekeningButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      // Salin nomor rekening bersih (hanya angka) untuk mempermudah transfer m-banking
      const cleanNumber = nomorRekening.replace(/\D/g, "");
      await navigator.clipboard.writeText(cleanNumber || nomorRekening);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback manual jika clipboard API dibatasi di browser tertentu
      const textArea = document.createElement("textarea");
      textArea.value = nomorRekening.replace(/\D/g, "") || nomorRekening;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      } catch (e) {
        console.error("Gagal menyalin nomor rekening:", e);
      }
      document.body.removeChild(textArea);
    }
  };

  if (variant === "badge") {
    return (
      <button
        type="button"
        onClick={handleCopy}
        title="Klik untuk salin nomor rekening"
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all active:scale-95 cursor-pointer",
          copied
            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
            : "bg-surface-container hover:bg-surface-container-high text-neutral-600 dark:text-neutral-300 border border-outline/60",
          className
        )}
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 animate-in zoom-in-75 duration-200" />
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">Tersalin</span>
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5 opacity-70" />
            <span>Salin</span>
          </>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Klik untuk salin nomor rekening m-banking"
      className={cn(
        "inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer shadow-2xs",
        copied
          ? "bg-emerald-600 text-white shadow-emerald-500/20"
          : "bg-surface border border-outline/80 hover:border-emerald-500/50 hover:bg-emerald-500/5 text-neutral-800 dark:text-neutral-200",
        className
      )}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-white animate-in zoom-in-75 duration-200" />
          <span>Nomor Rekening Tersalin!</span>
        </>
      ) : (
        <>
          <Copy className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>Salin Nomor Rekening</span>
        </>
      )}
    </button>
  );
}
