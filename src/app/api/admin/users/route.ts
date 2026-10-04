import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type AdminUser = Database["public"]["Tables"]["admin_users"]["Row"];

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: callerAdmin } = await supabase
      .from("admin_users")
      .select("role, aktif")
      .eq("email", user.email)
      .single();

    if (!callerAdmin || callerAdmin.role !== "superadmin" || !callerAdmin.aktif) {
      return NextResponse.json({ error: "Hanya superadmin yang dapat mengelola admin." }, { status: 403 });
    }

    // Check limit max 3 admin
    const { count } = await supabase
      .from("admin_users")
      .select("id", { count: "exact" })
      .eq("aktif", true);

    if ((count ?? 0) >= 3) {
      return NextResponse.json({ error: "Maksimal 3 admin aktif telah tercapai." }, { status: 400 });
    }

    const body = await request.json();
    const { email, nama, role } = body;

    if (!email || !nama) {
      return NextResponse.json({ error: "Nama dan email wajib diisi." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("admin_users")
      .insert({
        email: email.trim().toLowerCase(),
        nama: nama.trim(),
        role: role === "superadmin" ? "superadmin" : "admin",
        aktif: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan server." }, { status: 500 });
  }
}
