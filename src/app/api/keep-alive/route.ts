import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    // Query ringan ke konfigurasi untuk merefresh aktivitas Supabase project
    const { data, error } = await supabase
      .from("konfigurasi")
      .select("kunci, nilai")
      .limit(1);

    if (error) {
      return NextResponse.json(
        { status: "error", error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: "active",
      message: "Supabase project keep-alive ping succeeded",
      data,
    });
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: String(err) },
      { status: 500 }
    );
  }
}
