"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ThemeToggle from "@/components/ThemeToggle";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    const siteUrl = window.location.origin;
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${siteUrl}/auth/callback` },
    });
    if (authError) {
      setError(authError.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-on-surface relative">
      {/* Top Bar Navigation */}
      <div className="absolute top-5 right-5 flex items-center gap-2">
        <ThemeToggle />
      </div>
      <div className="absolute top-5 left-5">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant hover:text-primary-dark dark:hover:text-primary transition-all py-2 px-3.5 rounded-full border border-outline-variant/50 bg-surface-container-lowest/80 backdrop-blur-sm active:scale-95 shadow-2xs font-label"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Beranda
        </Link>
      </div>

      <div className="w-full max-w-md sm:max-w-lg animate-fade-in-scale">
        <div className="bento-card p-6 sm:p-8 relative overflow-hidden shadow-soft">
          {/* Subtle Top Hairline Highlight */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary-light to-transparent" />

          {/* Header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 mb-6">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-surface-container-lowest border border-outline-variant/60 p-2 shadow-soft">
              <img src="/logo.png" alt="Logo Masjid Darul Hidayah" className="h-full w-full object-contain" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold font-headline text-on-surface">Login Portal Admin</h1>
              <p className="mt-0.5 text-xs text-on-surface-variant font-body">
                Sistem Informasi Donasi Pelunasan Hutang
              </p>
              <p className="text-xs font-semibold text-primary-dark dark:text-primary mt-0.5 font-headline">
                Masjid Darul Hidayah Tanah Merah
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-xl bg-error-container px-4 py-3 text-xs text-on-error-container text-left">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                {error === "akses_ditolak"
                  ? "Akun Google Anda tidak terdaftar sebagai admin donasi MDH. Silakan hubungi superadmin."
                  : error}
              </span>
            </div>
          )}

          {/* Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            type="button"
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-5 py-3.5 text-sm font-semibold text-on-surface hover:border-primary/50 hover:bg-surface-container transition-all active:scale-[0.98] disabled:opacity-60 shadow-soft cursor-pointer font-label"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-white p-0.5 shadow-2xs">
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </span>
            {loading ? "Menghubungkan..." : "Masuk dengan Akun Google"}
          </button>

          <p className="mt-5 text-center text-[11px] text-on-surface-variant/80 leading-relaxed font-body">
            Akses dibatasi khusus untuk admin terdaftar Masjid Darul Hidayah.
          </p>
        </div>
      </div>
    </div>
  );
}
