-- ============================================================
-- 05_views_dan_kebijakan_publik.sql
-- Optimasi agregasi via VIEW & izin akses publik untuk ringkasan donasi
-- ============================================================

-- 1. Berikan hak akses baca konfigurasi untuk publik (anon & authenticated)
-- agar nama masjid, no rekening, dan alamat dapat tampil bagi tamu/pengunjung umum
DROP POLICY IF EXISTS "publik baca konfigurasi" ON public.konfigurasi;
CREATE POLICY "publik baca konfigurasi" ON public.konfigurasi 
  FOR SELECT 
  USING (true);

-- 2. VIEW Ringkasan Donasi & Hutang
-- Berjalan dengan hak akses owner (postgres) secara default sehingga aman diakses oleh anon
-- tanpa mengekspos data pribadi donatur (nama, no_hp, dll).
CREATE OR REPLACE VIEW public.view_ringkasan_donasi AS
SELECT
  -- Total hutang dari seluruh sumber hutang
  COALESCE((SELECT SUM(nominal) FROM public.sumber_hutang), 0)::bigint AS total_hutang,
  
  -- Total donasi yang telah dihimpun dari para donatur
  COALESCE((SELECT SUM(nominal) FROM public.pembayaran), 0)::bigint AS total_donasi_terkumpul,
  
  -- Total dana yang telah disetorkan/dibayarkan ke toko/supplier
  COALESCE((SELECT SUM(nominal) FROM public.pembayaran_hutang), 0)::bigint AS total_setor_ke_toko,
  
  -- Sisa kewajiban donasi yang masih perlu dihimpun
  GREATEST(0, 
    COALESCE((SELECT SUM(nominal) FROM public.sumber_hutang), 0) - 
    COALESCE((SELECT SUM(nominal) FROM public.pembayaran), 0)
  )::bigint AS sisa_hutang,

  -- Sisa hutang aktual ke toko (kewajiban dikurangi yang sudah disetor)
  GREATEST(0, 
    COALESCE((SELECT SUM(nominal) FROM public.sumber_hutang), 0) - 
    COALESCE((SELECT SUM(nominal) FROM public.pembayaran_hutang), 0)
  )::bigint AS sisa_hutang_ke_toko,
  
  -- Jumlah donatur tetap aktif
  (SELECT COUNT(*) FROM public.donatur WHERE status = 'aktif')::bigint AS total_donatur_aktif,
  
  -- Persentase donasi terkumpul terhadap total hutang
  CASE 
    WHEN COALESCE((SELECT SUM(nominal) FROM public.sumber_hutang), 0) > 0 THEN
      ROUND(
        (COALESCE((SELECT SUM(nominal) FROM public.pembayaran), 0)::numeric / 
         (SELECT SUM(nominal) FROM public.sumber_hutang)::numeric) * 100, 
        2
      )
    ELSE 0
  END AS persentase_tercapai;

-- Berikan izin akses SELECT untuk view_ringkasan_donasi ke publik dan authenticated
GRANT SELECT ON public.view_ringkasan_donasi TO anon, authenticated;


-- 3. VIEW Detail Sumber Hutang (otomatis menghitung terbayar & sisa)
-- Mengurangi penghitungan looping/penggabungan manual di sisi kode aplikasi
CREATE OR REPLACE VIEW public.view_sumber_hutang_detail AS
SELECT 
  sh.id,
  sh.nama_kreditor,
  sh.nominal,
  COALESCE(ph.total_terbayar, 0)::bigint AS terbayar,
  GREATEST(0, sh.nominal - COALESCE(ph.total_terbayar, 0))::bigint AS sisa,
  CASE 
    WHEN COALESCE(ph.total_terbayar, 0) >= sh.nominal AND sh.nominal > 0 THEN 'lunas'
    WHEN COALESCE(ph.total_terbayar, 0) > 0 THEN 'sebagian'
    ELSE 'belum_lunas'
  END AS status,
  sh.keterangan,
  sh.created_by_name,
  sh.updated_by_name,
  sh.created_at,
  sh.updated_at
FROM public.sumber_hutang sh
LEFT JOIN (
  SELECT sumber_hutang_id, SUM(nominal) AS total_terbayar
  FROM public.pembayaran_hutang
  GROUP BY sumber_hutang_id
) ph ON sh.id = ph.sumber_hutang_id
ORDER BY sh.nominal DESC;

-- Berikan izin akses SELECT untuk view_sumber_hutang_detail ke publik dan authenticated
GRANT SELECT ON public.view_sumber_hutang_detail TO anon, authenticated;
