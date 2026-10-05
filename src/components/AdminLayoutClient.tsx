"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import ThemeToggle from "./ThemeToggle";
import {
  LayoutDashboard, Users, Banknote, FileText,
  Building2, UserCog, LogOut, Menu, Globe, ExternalLink, Loader2, X
} from "lucide-react";

interface AdminUser {
  id: string; nama: string; role: string; aktif: boolean;
}

interface Props {
  children: React.ReactNode;
  adminUser: AdminUser;
  config: Record<string, string>;
}

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/donatur", label: "Data Donatur", icon: Users },
  { href: "/admin/pembayaran", label: "Setoran Donasi", icon: Banknote },
  { href: "/admin/hutang", label: "Sumber Hutang", icon: Building2 },
  { href: "/admin/laporan", label: "Laporan & Rekap", icon: FileText },
  { href: "/admin/users", label: "Kelola Admin", icon: UserCog, superadminOnly: true },
];

export default function AdminLayoutClient({ children, adminUser, config }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const visibleNav = navItems.filter(
    (item) => !item.superadminOnly || adminUser.role === "superadmin"
  );

  const Sidebar = () => (
    <div className="flex h-full flex-col sidebar-panel">
      {/* Header Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-outline-variant/30">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-surface-container-lowest border border-outline-variant/60 p-1.5 shadow-soft">
            <img src="/logo.png" alt="Logo MDH" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold font-headline text-on-surface leading-tight truncate">
              {config.nama_masjid ?? "Masjid Darul Hidayah"}
            </p>
            <p className="text-[11px] text-on-surface-variant font-body truncate">Panel Donasi &amp; Hutang</p>
          </div>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-variant/40 md:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <p className="mb-2 px-3 pt-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 font-label">
          Menu Navigasi
        </p>

        {visibleNav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href, item.exact);
          const isPending = pendingHref === item.href && !active;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                if (!active) setPendingHref(item.href);
                setSidebarOpen(false);
              }}
              className={cn(
                "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all font-label",
                active
                  ? "bg-primary-container text-on-primary-container font-semibold shadow-soft"
                  : "text-on-surface-variant hover:text-primary-dark dark:hover:text-primary hover:bg-primary/5"
              )}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute -left-1.5 top-1/2 hidden h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary md:block"
                />
              )}
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                  active
                    ? "bg-on-primary-container/10 text-on-primary-container"
                    : "bg-primary/10 text-primary-dark dark:text-primary"
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex-1 truncate">{item.label}</span>
              {isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer User Info & Lihat Website */}
      <div className="border-t border-outline-variant/30 p-3 bg-surface-container-low/40 space-y-2">
        <Link
          href="/"
          className="flex w-full items-center justify-between rounded-xl border border-outline-variant/40 bg-surface px-3 py-2 text-xs font-semibold text-on-surface hover:bg-primary/10 hover:text-primary-dark dark:hover:text-primary transition-all shadow-2xs group font-label"
          title="Buka website publik donasi tanpa logout"
        >
          <div className="flex items-center gap-2">
            <Globe className="h-3.5 w-3.5 text-primary-dark dark:text-primary group-hover:scale-110 transition-transform" />
            <span>Lihat Halaman Depan</span>
          </div>
          <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity" />
        </Link>

        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl bg-surface-container-low/60 border border-outline-variant/20">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-on-primary-container shrink-0 font-headline">
            {adminUser.nama.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-on-surface truncate">{adminUser.nama}</p>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-label font-bold">{adminUser.role}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant/40 bg-surface px-3 py-2 text-xs font-semibold text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-all active:scale-95 font-label"
        >
          <LogOut className="h-3.5 w-3.5" /> Keluar Sesi
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background text-on-surface">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 dark:bg-black/80 transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative z-10 w-64 max-w-[80vw] h-full shadow-2xl sidebar-panel">
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header Bar */}
        <header className="flex items-center justify-between border-b border-outline-variant/30 bg-surface/85 backdrop-blur-md px-4 py-3">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSidebarOpen(true)}
              type="button"
              className="p-1.5 rounded-xl text-on-surface-variant hover:bg-surface-variant/40 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="relative h-7 w-7 rounded-lg overflow-hidden bg-surface-container-lowest p-0.5 border border-outline-variant/40 shrink-0 md:hidden">
              <img src="/logo.png" alt="Logo" className="h-full w-full object-contain" />
            </div>
            <p className="font-bold font-headline text-on-surface text-sm truncate">
              {config.nama_masjid ?? "Donasi MDH"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              title="Lihat Halaman Depan"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/40 bg-surface text-xs font-semibold text-primary-dark dark:text-primary hover:bg-primary/10 transition-all shadow-2xs font-label"
            >
              <Globe className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Halaman Depan</span>
            </Link>
            <ThemeToggle />
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
