import { NextResponse } from "next/server";
import { createServerSupabase, createAdminClient } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();

    // 1. Verifikasi autentikasi admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) {
      return NextResponse.json({ error: "Sesi telah berakhir. Silakan login kembali." }, { status: 401 });
    }

    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("id, email, aktif, nama")
      .eq("email", user.email)
      .eq("aktif", true)
      .maybeSingle();

    if (!adminUser) {
      return NextResponse.json({ error: "Akses ditolak. Anda bukan admin aktif." }, { status: 403 });
    }

    // 2. Baca file dari formData
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const sumberId = (formData.get("sumber_hutang_id") as string) || "umum";

    if (!file) {
      return NextResponse.json({ error: "File bukti kwitansi tidak ditemukan." }, { status: 400 });
    }

    // 3. Validasi tipe file & ukuran (maks 10MB)
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
    ];

    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Format file tidak didukung. Harap unggah gambar (JPG, PNG, WebP) atau file PDF." },
        { status: 400 }
      );
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Ukuran file terlalu besar. Maksimal 10MB." }, { status: 400 });
    }

    // 4. Inisialisasi admin client untuk storage
    const adminClient = createAdminClient();
    const bucketName = "kwitansi";

    // Pastikan bucket ada (jika belum dibuat manual di SQL)
    const { data: buckets } = await adminClient.storage.listBuckets();
    const bucketExists = buckets?.some((b: { id: string }) => b.id === bucketName);

    if (!bucketExists) {
      await adminClient.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: MAX_SIZE,
      });
    }

    // 5. Generate path file aman
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const cleanFileName = file.name
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .replace(/_{2,}/g, "_");
    const filePath = `sumber_${sumberId}/${Date.now()}_${cleanFileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 6. Upload ke Supabase Storage
    const { error: uploadError } = await adminClient.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: `Gagal upload: ${uploadError.message}` }, { status: 500 });
    }

    // 7. Ambil URL Publik
    const { data: publicUrlData } = adminClient.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      url: publicUrlData.publicUrl,
      path: filePath,
      fileName: file.name,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan internal.";
    console.error("Upload kwitansi route error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
