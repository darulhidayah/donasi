"use client";

import { useState, useTransition } from "react";
import { supabase } from "@/lib/supabase";
import { formatTanggal } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Plus, Pencil, X, UserCheck, UserX, Shield, ShieldCheck, AlertCircle } from "lucide-react";
import type { Database } from "@/lib/database.types";

type AdminUser = Database["public"]["Tables"]["admin_users"]["Row"];

export default function AdminUsersClient({
  initialList,
  maxAdmin = 3,
}: {
  initialList: AdminUser[];
  maxAdmin?: number;
}) {
  const [list, setList] = useState<AdminUser[]>(initialList);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", nama: "", role: "admin" as "superadmin" | "admin" });

  const MAX_ADMIN = maxAdmin;
  const aktifCount = list.filter((u) => u.aktif).length;
  const canAdd = aktifCount < MAX_ADMIN;

  const openAdd = () => {
    if (!canAdd) { setError(`Maksimal ${MAX_ADMIN} admin aktif.`); return; }
    setEditing(null);
    setForm({ email: "", nama: "", role: "admin" });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (u: AdminUser) => {
    setEditing(u);
    setForm({ email: u.email, nama: u.nama, role: u.role });
    setError(null);
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.email.trim() || !form.nama.trim()) { setError("Email dan nama wajib diisi."); return; }
    if (!form.email.includes("@")) { setError("Format email tidak valid."); return; }
    setError(null);

    startTransition(async () => {
      if (editing) {
        const { error: err } = await supabase
          .from("admin_users")
          .update({ nama: form.nama.trim(), role: form.role })
          .eq("id", editing.id);
        if (err) { setError(err.message); return; }
        setList((prev) => prev.map((u) => u.id === editing.id ? { ...u, nama: form.nama.trim(), role: form.role } : u));
      } else {
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email.trim(), nama: form.nama.trim(), role: form.role }),
        });
        const json = await res.json();
        if (!res.ok) { setError(json.error ?? "Gagal menambah admin."); return; }
        setList((prev) => [json.data as AdminUser, ...prev]);
      }
      setModalOpen(false);
    });
  };

  const toggleAktif = (u: AdminUser) => {
    if (u.aktif && aktifCount <= 1) { setError("Harus ada minimal 1 admin aktif."); return; }
    const newAktif = !u.aktif;
    startTransition(async () => {
      await supabase.from("admin_users").update({ aktif: newAktif }).eq("id", u.id);
      setList((prev) => prev.map((x) => x.id === u.id ? { ...x, aktif: newAktif } : x));
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold font-headline text-on-surface">Manajemen Admin</h1>
          <p className="text-sm text-on-surface-variant font-body">{aktifCount}/{MAX_ADMIN} admin aktif</p>
        </div>
        <button
          onClick={openAdd}
          disabled={!canAdd}
          className="flex items-center gap-2 rounded-xl bg-primary-container px-4 py-2.5 text-xs font-semibold text-on-primary-container hover:brightness-110 disabled:opacity-50 transition-all shadow-soft active:scale-95 font-label"
        >
          <Plus className="h-4 w-4" /> Tambah Admin
        </button>
      </div>

      {error && !modalOpen && (
        <div className="flex items-center gap-2 rounded-xl bg-error-container px-4 py-3 text-sm text-on-error-container">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      {/* Info Card */}
      <div className="rounded-xl bg-primary/10 border border-primary/20 px-4 py-3 text-sm text-on-surface">
        <p className="font-bold text-xs mb-1 text-primary-dark dark:text-primary font-label">💡 Informasi Hak Akses Admin (Maksimal {MAX_ADMIN} Orang):</p>
        <p className="text-xs text-on-surface-variant font-body">
          Admin yang ditambahkan di bawah ini dapat langsung masuk ke aplikasi menggunakan tombol <strong>Masuk dengan Google</strong> dengan akun email tersebut.
        </p>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-outline-variant bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-on-surface-variant">Nama</th>
                <th className="text-left px-4 py-3 font-semibold text-on-surface-variant">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-on-surface-variant">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-on-surface-variant">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-on-surface-variant">Terakhir Aktif</th>
                <th className="text-right px-4 py-3 font-semibold text-on-surface-variant">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {list.map((u) => (
                <tr key={u.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-4 py-3 font-medium text-on-surface">{u.nama}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={cn("flex items-center gap-1 w-fit rounded-full px-2 py-0.5 text-xs font-medium",
                      u.role === "superadmin" ? "bg-primary-container text-on-primary-container" : "bg-surface-container text-on-surface-variant"
                    )}>
                      {u.role === "superadmin" ? <ShieldCheck className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", u.aktif ? "bg-primary-container text-on-primary-container" : "bg-surface-container-high text-on-surface-variant")}>
                      {u.aktif ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs">
                    {u.last_active_at ? formatTanggal(u.last_active_at.split("T")[0]) : "Belum pernah"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(u)} className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-on-surface" title="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => toggleAktif(u)} className={cn("rounded-lg p-1.5 transition-colors", u.aktif ? "text-status-warning hover:bg-surface-container" : "text-status-success hover:bg-surface-container")} title={u.aktif ? "Nonaktifkan" : "Aktifkan"}>
                        {u.aktif ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL TAMBAH/EDIT ADMIN: SOLID 100%, ANTI GELAP & ANTI BURAM */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 dark:bg-black/80 transition-opacity"
            onClick={() => setModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl modal-panel p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-outline-variant pb-3">
              <h2 className="text-lg font-bold text-on-surface">
                {editing ? "Edit Admin" : "Tambah Admin Baru"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                type="button"
                className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-error-container px-3.5 py-2.5 text-xs text-on-error-container">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-1.5">
                  Email Akun Google *
                </label>
                <input
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  type="email"
                  placeholder="contoh@gmail.com"
                  disabled={!!editing}
                  className={cn(
                    "w-full rounded-xl border border-outline-variant bg-surface px-3.5 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary",
                    editing && "opacity-60"
                  )}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-1.5">
                  Nama Lengkap Admin *
                </label>
                <input
                  value={form.nama}
                  onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
                  placeholder="Nama admin"
                  className="w-full rounded-xl border border-outline-variant bg-surface px-3.5 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-1.5">
                  Tingkat Hak Akses (Role)
                </label>
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, role: e.target.value as "superadmin" | "admin" }))
                  }
                  className="w-full rounded-xl border border-outline-variant bg-surface dark:bg-surface-container px-3.5 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="admin" className="bg-surface text-on-surface dark:bg-[#24221e] dark:text-[#f3f1eb]">Admin (Input & Update Data)</option>
                  <option value="superadmin" className="bg-surface text-on-surface dark:bg-[#24221e] dark:text-[#f3f1eb]">Superadmin (Kelola Admin & Konfigurasi)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-3 border-t border-outline-variant">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex-1 rounded-xl border border-outline-variant bg-surface py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="flex-1 rounded-xl bg-primary-container py-2.5 text-sm font-semibold text-on-primary-container hover:brightness-110 disabled:opacity-60 shadow-soft transition-all active:scale-95 font-label cursor-pointer"
              >
                {isPending ? "Menyimpan..." : "Simpan Admin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
