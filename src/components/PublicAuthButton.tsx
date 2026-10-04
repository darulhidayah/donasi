"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LogIn, LogOut, LayoutDashboard } from "lucide-react";

export default function PublicAuthButton({
  initialLoggedIn = false,
}: {
  initialLoggedIn?: boolean;
}) {
  const [isLoggedIn, setIsLoggedIn] = useState(initialLoggedIn);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Sinkronisasi status autentikasi aktif dari client
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsLoggedIn(!!session?.user);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setLoading(false);
    router.refresh();
  };

  if (isLoggedIn) {
    return (
      <div className="flex items-center gap-1.5">
        {/* Tombol Masuk Panel Admin */}
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 dark:bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-all shadow-xs"
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          <span>Panel Admin</span>
        </Link>

        {/* Tombol Keluar Langsung */}
        <button
          onClick={handleLogout}
          disabled={loading}
          type="button"
          title="Keluar Sesi Admin"
          className="inline-flex items-center gap-1 rounded-lg border border-outline-variant/70 bg-surface px-2.5 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-rose-500/10 hover:border-rose-500/40 hover:text-rose-600 dark:hover:text-rose-400 transition-all shadow-xs disabled:opacity-50"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Keluar</span>
        </button>
      </div>
    );
  }

  // Belum Login: Label Masuk minimalis (hanya ikon di layar sempit, label teks di layar sedang)
  return (
    <Link
      href="/login"
      title="Masuk Portal Admin"
      className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant/70 hover:border-emerald-500/70 bg-surface px-2.5 sm:px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all shadow-xs"
    >
      <LogIn className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
      <span className="hidden sm:inline">Masuk</span>
    </Link>
  );
}
