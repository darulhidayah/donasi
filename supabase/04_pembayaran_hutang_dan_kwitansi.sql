-- ============================================================
-- 04_pembayaran_hutang_dan_kwitansi.sql
-- Fitur Pembayaran ke Sumber Hutang + Bukti Kwitansi & Auto Sync
-- Idempotent / Re-run Safe
-- ============================================================

-- 1. TABEL PEMBAYARAN HUTANG (CICILAN / PELUNASAN KE TOKO/SUPPLIER)
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

-- Index untuk performa query
CREATE INDEX IF NOT EXISTS idx_pembayaran_hutang_sumber ON public.pembayaran_hutang(sumber_hutang_id);
CREATE INDEX IF NOT EXISTS idx_pembayaran_hutang_tgl ON public.pembayaran_hutang(tanggal_bayar);

-- 2. TRIGGER OTOMATIS SINKRONISASI TERBAYAR & STATUS DI SUMBER_HUTANG
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

  -- Hitung total pembayaran untuk sumber hutang ini
  SELECT COALESCE(SUM(nominal), 0) INTO total_bayar
  FROM public.pembayaran_hutang
  WHERE sumber_hutang_id = target_id;

  -- Ambil nominal pagu hutang
  SELECT nominal INTO nominal_hutang
  FROM public.sumber_hutang
  WHERE id = target_id;

  -- Update kolom terbayar dan status otomatis
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

-- 3. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.pembayaran_hutang ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "publik baca pembayaran hutang" ON public.pembayaran_hutang;
CREATE POLICY "publik baca pembayaran hutang" ON public.pembayaran_hutang
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin kelola pembayaran hutang" ON public.pembayaran_hutang;
CREATE POLICY "admin kelola pembayaran hutang" ON public.pembayaran_hutang
  FOR ALL USING (public.is_admin());

-- 4. STORAGE BUCKET UNTUK KWITANSI
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'kwitansi', 
  'kwitansi', 
  true, 
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

-- Storage policies
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
