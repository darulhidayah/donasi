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
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
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
        <Link
          href="/admin"
          title="Panel Admin"
          aria-label="Panel Admin"
          className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-primary-container text-on-primary-container hover:brightness-110 transition-all shadow-soft active:scale-95"
        >
          <LayoutDashboard className="h-4 w-4" />
        </Link>

        <button
          onClick={handleLogout}
          disabled={loading}
          type="button"
          title="Keluar Sesi Admin"
          aria-label="Keluar"
          className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-outline-variant/60 bg-surface text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-all active:scale-95 disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/login"
      title="Masuk Portal Admin"
      aria-label="Masuk Portal Admin"
      className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-outline-variant/70 hover:border-primary/60 bg-surface text-on-surface hover:text-primary-dark dark:hover:text-primary hover:bg-surface-variant/40 transition-all active:scale-95"
    >
      <LogIn className="h-4 w-4 text-primary-dark dark:text-primary" />
    </Link>
  );
}
