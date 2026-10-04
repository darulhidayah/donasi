"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import ThemeToggle from "./ThemeToggle";
import {
  LayoutDashboard, Users, Banknote, FileText,
  Building2, UserCog, LogOut, Menu, Globe, ExternalLink, Loader2,
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
  { href: "/admin/donatur", label: "Donatur", icon: Users },
  { href: "/admin/pembayaran", label: "Pembayaran", icon: Banknote },
  { href: "/admin/hutang", label: "Sumber Hutang", icon: Building2 },
  { href: "/admin/laporan", label: "Laporan", icon: FileText },
  { href: "/admin/users", label: "Admin", icon: UserCog, superadminOnly: true },
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
    <div className="flex h-full flex-col sidebar-panel bg-surface">
      {/* Header Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-outline-variant/60">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-surface-container-lowest border border-outline-variant p-1 shadow-xs">
            <img src="/logo.png" alt="Logo MDH" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-primary leading-tight truncate">
              {config.nama_masjid ?? "Masjid Darul Hidayah"}
            </p>
            <p className="text-[11px] text-on-surface-variant">Donasi Pelunasan Hutang</p>
          </div>
        </div>
        <ThemeToggle />
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
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
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors relative",
                active
                  ? "bg-primary-container text-on-primary-container font-semibold"
                  : isPending
                  ? "bg-surface-container text-on-surface font-medium"
                  : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer User Info & Lihat Website */}
      <div className="border-t border-outline-variant/60 p-3 bg-surface-container-low space-y-2">
        {/* Tombol Lihat Halaman Depan */}
        <Link
          href="/"
          className="flex w-full items-center justify-between rounded-xl border border-outline-variant/60 bg-surface px-3 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container hover:text-primary transition-colors shadow-2xs group"
          title="Buka website publik donasi tanpa logout"
        >
          <div className="flex items-center gap-2">
            <Globe className="h-3.5 w-3.5 text-primary group-hover:scale-110 transition-transform" />
            <span>Lihat Halaman Depan</span>
          </div>
          <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity" />
        </Link>

        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-on-primary-container shrink-0">
            {adminUser.nama.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-on-surface truncate">{adminUser.nama}</p>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">{adminUser.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant/60 bg-surface px-3 py-2 text-xs font-medium text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-colors"
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

      {/* Mobile Sidebar Overlay (Solid Anti-Transparan) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 dark:bg-black/80 transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative z-10 w-64 max-w-[80vw] h-full shadow-2xl sidebar-panel bg-surface">
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header Bar */}
        <header className="flex items-center justify-between border-b border-outline-variant/60 bg-surface px-4 py-3 md:hidden">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSidebarOpen(true)}
              type="button"
              className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container"
            >
              <Menu className="h-5 w-5" />
            </button>
            <img src="/logo.png" alt="Logo" className="h-6 w-6 object-contain shrink-0" />
            <p className="font-bold text-on-surface text-sm truncate">
              {config.nama_masjid ?? "Donasi MDH"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              title="Lihat Halaman Depan"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-outline-variant/60 bg-surface text-xs font-semibold text-on-surface hover:text-primary hover:bg-surface-container transition-colors shadow-2xs"
            >
              <Globe className="h-3.5 w-3.5 text-primary" />
              <span className="hidden xs:inline">Web</span>
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
