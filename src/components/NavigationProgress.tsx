"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function ProgressContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fadeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startProgress = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);

    setVisible(true);
    setProgress(20);

    // Animasi bertahap sambil menunggu rute dimuat
    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 85;
        }
        const diff = Math.random() * 12;
        return Math.min(prev + diff, 85);
      });
    }, 200);
  };

  const completeProgress = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    setProgress(100);
    fadeTimerRef.current = setTimeout(() => {
      setVisible(false);
      fadeTimerRef.current = setTimeout(() => {
        setProgress(0);
      }, 300);
    }, 200);
  };

  // Selesaikan loading saat rute berganti
  useEffect(() => {
    completeProgress();
  }, [pathname, searchParams]);

  // Pasang interceptor global pada klik link <a> di seluruh aplikasi
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Cari elemen anchor terdekat yang diklik
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      // Abaikan target tab baru, download, atau modkey (Ctrl/Cmd)
      if (
        target.target === "_blank" ||
        target.hasAttribute("download") ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      // Abaikan hash jump pada halaman yang sama
      if (href.startsWith("#")) return;

      // Cek apakah url internal
      const currentUrl = new URL(window.location.href);
      const targetUrl = new URL(href, window.location.href);

      if (targetUrl.origin !== currentUrl.origin) return;

      // Abaikan jika menuju halaman yang sama persis
      if (
        targetUrl.pathname === currentUrl.pathname &&
        targetUrl.search === currentUrl.search
      ) {
        return;
      }

      // Pemicu instan: bar langsung bergerak saat diklik
      startProgress();
    };

    const handlePopState = () => {
      startProgress();
    };

    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener("popstate", handlePopState);
      if (timerRef.current) clearInterval(timerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, []);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
      aria-hidden="true"
    >
      {/* Loading Progress Bar */}
      <div
        className="h-[2.5px] bg-gradient-to-r from-emerald-600 via-teal-400 to-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.7)] transition-all ease-out"
        style={{
          width: `${progress}%`,
          transitionDuration: progress === 100 ? "150ms" : "250ms",
        }}
      />
      {/* Glowing tip */}
      {visible && progress < 100 && (
        <div
          className="absolute top-0 h-[2.5px] w-8 bg-white/70 shadow-[0_0_8px_white] blur-[1px] transition-all ease-out"
          style={{
            left: `calc(${progress}% - 32px)`,
            transitionDuration: "250ms",
          }}
        />
      )}
    </div>
  );
}

export default function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <ProgressContent />
    </Suspense>
  );
}
