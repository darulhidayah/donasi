-- ============================================================
-- MIGRATION: PENANGGUNG JAWAB / AUDIT TRAIL PERUBAHAN DATA
-- donasi.mdh.or.id
-- ============================================================

ALTER TABLE public.donatur ADD COLUMN IF NOT EXISTS created_by_name TEXT;
ALTER TABLE public.donatur ADD COLUMN IF NOT EXISTS updated_by_name TEXT;

ALTER TABLE public.pembayaran ADD COLUMN IF NOT EXISTS updated_by_name TEXT;

ALTER TABLE public.sumber_hutang ADD COLUMN IF NOT EXISTS created_by_name TEXT;
ALTER TABLE public.sumber_hutang ADD COLUMN IF NOT EXISTS updated_by_name TEXT;

ALTER TABLE public.setor_pihak_ketiga ADD COLUMN IF NOT EXISTS created_by_name TEXT;
ALTER TABLE public.setor_pihak_ketiga ADD COLUMN IF NOT EXISTS updated_by_name TEXT;
