import { guardAdminPage } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase";
import AdminHutangClient from "@/components/AdminHutangClient";
import type { Database } from "@/lib/database.types";

type SumberHutang = Database["public"]["Tables"]["sumber_hutang"]["Row"];
type PembayaranHutang = Database["public"]["Tables"]["pembayaran_hutang"]["Row"];

export default async function AdminHutangPage() {
  const { adminUser } = await guardAdminPage();
  const supabase = await createServerSupabase();

  const [{ data: hutangData }, { data: pembayaranData }, { data: donasiData }] = await Promise.all([
    supabase
      .from("sumber_hutang")
      .select("*")
      .order("nominal", { ascending: false }),
    supabase
      .from("pembayaran_hutang")
      .select("*")
      .order("tanggal_bayar", { ascending: false }),
    supabase
      .from("pembayaran")
      .select("nominal"),
  ]);

  const totalDonasiTerkumpul = (donasiData ?? []).reduce((acc, p) => acc + (p.nominal || 0), 0);

  return (
    <AdminHutangClient
      initialList={(hutangData ?? []) as SumberHutang[]}
      initialPembayaran={(pembayaranData ?? []) as PembayaranHutang[]}
      totalDonasiTerkumpul={totalDonasiTerkumpul}
      adminNama={adminUser.nama}
    />
  );
}

