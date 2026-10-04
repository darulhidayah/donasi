-- ============================================================
-- DONASI MASJID DARUL HIDAYAH - SCHEMA DATABASE LENGKAP
-- Idempotent / Ramah Eksekusi Berulang Kali (Re-run Safe)
-- donasi.mdh.or.id
-- ============================================================

-- ------------------------------------------------------------
-- 1. KONFIGURASI APLIKASI
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.konfigurasi (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kunci TEXT UNIQUE NOT NULL,
  nilai TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed konfigurasi masjid
INSERT INTO public.konfigurasi (kunci, nilai) VALUES
  ('nama_masjid', 'Masjid Darul Hidayah'),
  ('alamat', 'Titik Nol Tanah Merah, Kab. Boven Digoel'),
  ('website', 'mdh.or.id'),
  ('total_hutang', '800000000'),
  ('minimal_donasi', '50000'),
  ('rekening_bank', '2156-0100-0796-535'),
  ('nama_rekening', 'Kas Pembangunan Masjid Darul Hidayah'),
  ('max_admin', '3')
ON CONFLICT (kunci) DO UPDATE SET nilai = EXCLUDED.nilai;

-- ------------------------------------------------------------
-- 2. ADMIN USERS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  nama TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('superadmin', 'admin')),
  aktif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_active_at TIMESTAMPTZ DEFAULT now()
);

-- Seed admin terdaftar (Ismail & Ilham)
INSERT INTO public.admin_users (email, nama, role, aktif) VALUES
  ('zokishmael@gmail.com', 'Ismail', 'superadmin', true),
  ('ilhamay120607@gmail.com', 'Ilham', 'admin', true)
ON CONFLICT (email) DO UPDATE SET
  nama = EXCLUDED.nama,
  role = EXCLUDED.role,
  aktif = EXCLUDED.aktif;

-- ------------------------------------------------------------
-- 3. SUMBER HUTANG (RINCIAN HUTANG KE TOKO/SUPPLIER)
-- Misalnya: Toko A Rp 500jt, Toko B Rp 200jt, dll
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sumber_hutang (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nama_kreditor TEXT NOT NULL,
  nominal BIGINT NOT NULL CHECK (nominal >= 0),
  terbayar BIGINT NOT NULL DEFAULT 0 CHECK (terbayar >= 0),
  keterangan TEXT,
  status TEXT NOT NULL DEFAULT 'belum_lunas' CHECK (status IN ('belum_lunas', 'sebagian', 'lunas')),
  created_by_name TEXT,
  updated_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed data awal jika belum ada
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.sumber_hutang LIMIT 1) THEN
    INSERT INTO public.sumber_hutang (nama_kreditor, nominal, keterangan, status, created_by_name) VALUES
      ('Toko Bangunan / Material A', 500000000, 'Material semen, besi, dan pasir tahap struktur', 'belum_lunas', 'Sistem'),
      ('Toko Bangunan / Material B', 200000000, 'Material keramik, atap kubah, dan cat', 'belum_lunas', 'Sistem'),
      ('Supplier & Pihak Ketiga C', 100000000, 'Kebutuhan instalasi listrik, sanitasi & finishing', 'belum_lunas', 'Sistem');
  END IF;
END $$;

-- ------------------------------------------------------------
-- 4. DONATUR
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.donatur (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nama TEXT NOT NULL,
  no_hp TEXT,
  minimal_bulanan BIGINT NOT NULL DEFAULT 50000,
  metode_default TEXT DEFAULT 'Transfer' CHECK (metode_default IN ('QRIS', 'Transfer', 'Tunai', 'Lainnya')),
  status TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'nonaktif')),
  catatan TEXT,
  tgl_daftar DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------
-- 5. PEMBAYARAN (RINCIAN EXCEL)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pembayaran (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  donatur_id BIGINT NOT NULL REFERENCES public.donatur(id) ON DELETE RESTRICT,
  nama_donatur TEXT NOT NULL,
  no_hp_donatur TEXT,
  bulan DATE NOT NULL,
  nominal BIGINT NOT NULL CHECK (nominal >= 50000),
  metode TEXT NOT NULL DEFAULT 'Transfer' CHECK (metode IN ('QRIS', 'Transfer', 'Tunai', 'Lainnya')),
  keterangan TEXT,
  tgl_bayar DATE NOT NULL DEFAULT CURRENT_DATE,
  dicatat_oleh TEXT,
  nama_pencatat TEXT,
  updated_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(donatur_id, bulan)
);

-- ------------------------------------------------------------
-- ------------------------------------------------------------
-- 6. SETOR PIHAK KETIGA (REKAP EXCEL)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.setor_pihak_ketiga (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bulan DATE NOT NULL UNIQUE,
  jumlah BIGINT NOT NULL DEFAULT 0,
  keterangan TEXT,
  dicatat_oleh TEXT,
  created_by_name TEXT,
  updated_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------
-- 6B. PEMBAYARAN HUTANG KE KREDITOR DENGAN BUKTI KWITANSI
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pembayaran_hutang (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sumber_hutang_id BIGINT NOT NULL REFERENCES public.sumber_hutang(id) ON DELETE CASCADE,
  tanggal_bayar DATE NOT NULL DEFAULT CURRENT_DATE,
  nominal BIGINT NOT NULL CHECK (nominal > 0),
  metode TEXT NOT NULL DEFAULT 'Transfer' CHECK (metode IN ('Transfer', 'Tunai', 'Cek', 'Lainnya')),
  no_referensi TEXT,
  bukti_url TEXT,
  keterangan TEXT,
  dicatat_oleh_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pembayaran_hutang_sumber ON public.pembayaran_hutang(sumber_hutang_id);
CREATE INDEX IF NOT EXISTS idx_pembayaran_hutang_tgl ON public.pembayaran_hutang(tanggal_bayar);


-- ------------------------------------------------------------
-- 7. HELPER FUNCTIONS
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE email = auth.email() AND aktif = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE email = auth.email() AND role = 'superadmin' AND aktif = true
  );
$$;

-- Security Trigger: tolak login OAuth jika email tidak terdaftar
CREATE OR REPLACE FUNCTION public.check_admin_email()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = 'public'
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE email = NEW.email AND aktif = true) THEN
    RAISE EXCEPTION 'Email % tidak terdaftar sebagai admin donasi MDH.', NEW.email;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.check_admin_email();

-- ------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) & POLICIES (RAMAH RE-RUN)
-- ------------------------------------------------------------
ALTER TABLE public.konfigurasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sumber_hutang ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pembayaran_hutang ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donatur ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pembayaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setor_pihak_ketiga ENABLE ROW LEVEL SECURITY;

-- Konfigurasi
DROP POLICY IF EXISTS "admin baca konfigurasi" ON public.konfigurasi;
CREATE POLICY "admin baca konfigurasi" ON public.konfigurasi FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "superadmin edit konfigurasi" ON public.konfigurasi;
CREATE POLICY "superadmin edit konfigurasi" ON public.konfigurasi FOR ALL USING (public.is_superadmin());

-- Admin Users
DROP POLICY IF EXISTS "admin baca users" ON public.admin_users;
CREATE POLICY "admin baca users" ON public.admin_users FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "superadmin kelola users" ON public.admin_users;
CREATE POLICY "superadmin kelola users" ON public.admin_users FOR ALL USING (public.is_superadmin());

DROP POLICY IF EXISTS "admin update self active" ON public.admin_users;
CREATE POLICY "admin update self active" ON public.admin_users FOR UPDATE USING (email = auth.email());

-- Sumber Hutang
DROP POLICY IF EXISTS "publik baca sumber hutang" ON public.sumber_hutang;
CREATE POLICY "publik baca sumber hutang" ON public.sumber_hutang FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin kelola sumber hutang" ON public.sumber_hutang;
CREATE POLICY "admin kelola sumber hutang" ON public.sumber_hutang FOR ALL USING (public.is_admin());

-- Pembayaran Hutang ke Kreditor
DROP POLICY IF EXISTS "publik baca pembayaran hutang" ON public.pembayaran_hutang;
CREATE POLICY "publik baca pembayaran hutang" ON public.pembayaran_hutang FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin kelola pembayaran hutang" ON public.pembayaran_hutang;
CREATE POLICY "admin kelola pembayaran hutang" ON public.pembayaran_hutang FOR ALL USING (public.is_admin());

-- Donatur
DROP POLICY IF EXISTS "admin kelola donatur" ON public.donatur;
CREATE POLICY "admin kelola donatur" ON public.donatur FOR ALL USING (public.is_admin());

-- Pembayaran
DROP POLICY IF EXISTS "admin kelola pembayaran" ON public.pembayaran;
CREATE POLICY "admin kelola pembayaran" ON public.pembayaran FOR ALL USING (public.is_admin());

-- Setor Pihak Ketiga
DROP POLICY IF EXISTS "admin kelola setor" ON public.setor_pihak_ketiga;
CREATE POLICY "admin kelola setor" ON public.setor_pihak_ketiga FOR ALL USING (public.is_admin());

-- ------------------------------------------------------------
-- 9. AUTO UPDATE TIMESTAMP & SYNC TRIGGERS
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_donatur_updated ON public.donatur;
CREATE TRIGGER trg_donatur_updated BEFORE UPDATE ON public.donatur
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_pembayaran_updated ON public.pembayaran;
CREATE TRIGGER trg_pembayaran_updated BEFORE UPDATE ON public.pembayaran
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_hutang_updated ON public.sumber_hutang;
CREATE TRIGGER trg_hutang_updated BEFORE UPDATE ON public.sumber_hutang
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger Auto-Sync Nilai Terbayar dan Status Sumber Hutang
CREATE OR REPLACE FUNCTION public.sync_sumber_hutang_terbayar()
RETURNS TRIGGER AS $$
DECLARE
  target_id BIGINT;
  total_bayar BIGINT;
  nominal_hutang BIGINT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_id := OLD.sumber_hutang_id;
  ELSE
    target_id := NEW.sumber_hutang_id;
  END IF;

  SELECT COALESCE(SUM(nominal), 0) INTO total_bayar
  FROM public.pembayaran_hutang
  WHERE sumber_hutang_id = target_id;

  SELECT nominal INTO nominal_hutang
  FROM public.sumber_hutang
  WHERE id = target_id;

  UPDATE public.sumber_hutang
  SET 
    terbayar = total_bayar,
    status = CASE 
      WHEN total_bayar >= nominal_hutang THEN 'lunas'
      WHEN total_bayar > 0 THEN 'sebagian'
      ELSE 'belum_lunas'
    END,
    updated_at = now()
  WHERE id = target_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_sumber_hutang ON public.pembayaran_hutang;
CREATE TRIGGER trg_sync_sumber_hutang
  AFTER INSERT OR UPDATE OR DELETE ON public.pembayaran_hutang
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_sumber_hutang_terbayar();

-- ------------------------------------------------------------
-- 10. STORAGE BUCKET UNTUK KWITANSI
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'kwitansi', 
  'kwitansi', 
  true, 
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760;

DROP POLICY IF EXISTS "Publik boleh baca kwitansi" ON storage.objects;
CREATE POLICY "Publik boleh baca kwitansi" ON storage.objects 
  FOR SELECT USING (bucket_id = 'kwitansi');

DROP POLICY IF EXISTS "Admin boleh upload kwitansi" ON storage.objects;
CREATE POLICY "Admin boleh upload kwitansi" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'kwitansi' AND public.is_admin());

DROP POLICY IF EXISTS "Admin boleh update kwitansi" ON storage.objects;
CREATE POLICY "Admin boleh update kwitansi" ON storage.objects 
  FOR UPDATE USING (bucket_id = 'kwitansi' AND public.is_admin());

DROP POLICY IF EXISTS "Admin boleh hapus kwitansi" ON storage.objects;
CREATE POLICY "Admin boleh hapus kwitansi" ON storage.objects 
  FOR DELETE USING (bucket_id = 'kwitansi' AND public.is_admin());

