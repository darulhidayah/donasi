-- ============================================================
-- SEED DATA - Tambahkan admin awal setelah user login pertama kali
-- Jalankan ini SETELAH Ismail dan Ilham login via Google OAuth
-- ============================================================

-- CATATAN: Ganti <UUID_ISMAIL> dan <UUID_ILHAM> dengan UUID yang
-- didapat dari Supabase Dashboard > Authentication > Users
-- setelah mereka login pertama kali via Google.

-- INSERT INTO admin_users (id, email, nama, role) VALUES
--   ('<UUID_ISMAIL>', 'zokishmael@gmail.com', 'Ismail', 'superadmin'),
--   ('<UUID_ILHAM>', 'ilhamay120607@gmail.com', 'Ilham', 'admin');

-- Contoh donatur awal (opsional, hapus jika tidak perlu)
-- INSERT INTO donatur (nama, no_hp, minimal_bulanan) VALUES
--   ('Ahmad Fauzi', '081234567890', 50000),
--   ('Siti Rahmah', '082345678901', 100000),
--   ('Budi Santoso', '083456789012', 50000);
