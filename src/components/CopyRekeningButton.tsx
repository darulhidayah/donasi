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
      const cleanNumber = nomorRekening.replace(/\D/g, "");
      await navigator.clipboard.writeText(cleanNumber || nomorRekening);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
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
          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all active:scale-95 cursor-pointer",
          copied
            ? "bg-status-success text-white"
            : "bg-surface-variant text-on-surface-variant hover:bg-primary/15 hover:text-primary-dark dark:hover:text-primary border border-outline-variant/40",
          className
        )}
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 animate-in zoom-in-75 duration-200" />
            <span>Tersalin</span>
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
        "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer shadow-soft",
        copied
          ? "bg-status-success text-white shadow-soft"
          : "bg-primary-container text-on-primary-container hover:brightness-110",
        className
      )}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 animate-in zoom-in-75 duration-200" />
          <span>Nomor Rekening Tersalin!</span>
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          <span>Salin Nomor Rekening</span>
        </>
      )}
    </button>
  );
}
