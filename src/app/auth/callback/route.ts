import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type AdminUser = Database["public"]["Tables"]["admin_users"]["Row"];

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const isLocal = requestUrl.hostname === "localhost" || requestUrl.hostname === "127.0.0.1";

  const origin = isLocal
    ? requestUrl.origin
    : (forwardedHost ? `${forwardedProto}://${forwardedHost}` : requestUrl.origin);

  if (code) {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user && data.user.email) {
      const { data: adminRaw } = await supabase
        .from("admin_users")
        .select("id, email, aktif")
        .eq("email", data.user.email)
        .single();

      const adminUser = adminRaw as Pick<AdminUser, "id" | "email" | "aktif"> | null;

      if (adminUser && adminUser.aktif) {
        return NextResponse.redirect(`${origin}/admin`);
      } else {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=akses_ditolak`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_gagal`);
}
