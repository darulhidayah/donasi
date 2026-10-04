export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      konfigurasi: {
        Row: { id: number; kunci: string; nilai: string; updated_at: string }
        Insert: { id?: number; kunci: string; nilai: string; updated_at?: string }
        Update: { id?: number; kunci?: string; nilai?: string; updated_at?: string }
        Relationships: []
      }
      admin_users: {
        Row: {
          id: string
          email: string
          nama: string
          role: 'superadmin' | 'admin'
          aktif: boolean
          created_at: string
          last_active_at: string | null
        }
        Insert: {
          id?: string
          email: string
          nama: string
          role?: 'superadmin' | 'admin'
          aktif?: boolean
          created_at?: string
          last_active_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          nama?: string
          role?: 'superadmin' | 'admin'
          aktif?: boolean
          created_at?: string
          last_active_at?: string | null
        }
        Relationships: []
      }
      donatur: {
        Row: {
          id: number
          nama: string
          no_hp: string | null
          minimal_bulanan: number
          metode_default: 'QRIS' | 'Transfer' | 'Tunai' | 'Lainnya'
          status: 'aktif' | 'nonaktif'
          catatan: string | null
          tgl_daftar: string
          created_by: string | null
          created_by_name: string | null
          updated_by_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          nama: string
          no_hp?: string | null
          minimal_bulanan?: number
          metode_default?: 'QRIS' | 'Transfer' | 'Tunai' | 'Lainnya'
          status?: 'aktif' | 'nonaktif'
          catatan?: string | null
          tgl_daftar?: string
          created_by?: string | null
          created_by_name?: string | null
          updated_by_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          nama?: string
          no_hp?: string | null
          minimal_bulanan?: number
          metode_default?: 'QRIS' | 'Transfer' | 'Tunai' | 'Lainnya'
          status?: 'aktif' | 'nonaktif'
          catatan?: string | null
          tgl_daftar?: string
          created_by?: string | null
          created_by_name?: string | null
          updated_by_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      pembayaran: {
        Row: {
          id: number
          donatur_id: number
          nama_donatur: string
          no_hp_donatur: string | null
          bulan: string
          nominal: number
          metode: 'QRIS' | 'Transfer' | 'Tunai' | 'Lainnya'
          keterangan: string | null
          tgl_bayar: string
          dicatat_oleh: string | null
          nama_pencatat: string | null
          updated_by_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          donatur_id: number
          nama_donatur: string
          no_hp_donatur?: string | null
          bulan: string
          nominal: number
          metode?: 'QRIS' | 'Transfer' | 'Tunai' | 'Lainnya'
          keterangan?: string | null
          tgl_bayar?: string
          dicatat_oleh?: string | null
          nama_pencatat?: string | null
          updated_by_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          donatur_id?: number
          nama_donatur?: string
          no_hp_donatur?: string | null
          bulan?: string
          nominal?: number
          metode?: 'QRIS' | 'Transfer' | 'Tunai' | 'Lainnya'
          keterangan?: string | null
          tgl_bayar?: string
          dicatat_oleh?: string | null
          nama_pencatat?: string | null
          updated_by_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      setor_pihak_ketiga: {
        Row: {
          id: number
          bulan: string
          jumlah: number
          keterangan: string | null
          dicatat_oleh: string | null
          created_by_name: string | null
          updated_by_name: string | null
          created_at: string
        }
        Insert: {
          id?: number
          bulan: string
          jumlah: number
          keterangan?: string | null
          dicatat_oleh?: string | null
          created_by_name?: string | null
          updated_by_name?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          bulan?: string
          jumlah?: number
          keterangan?: string | null
          dicatat_oleh?: string | null
          created_by_name?: string | null
          updated_by_name?: string | null
          created_at?: string
        }
        Relationships: []
      }
      sumber_hutang: {
        Row: {
          id: number
          nama_kreditor: string
          nominal: number
          terbayar: number
          keterangan: string | null
          status: 'belum_lunas' | 'sebagian' | 'lunas'
          created_by_name: string | null
          updated_by_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          nama_kreditor: string
          nominal: number
          terbayar?: number
          keterangan?: string | null
          status?: 'belum_lunas' | 'sebagian' | 'lunas'
          created_by_name?: string | null
          updated_by_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          nama_kreditor?: string
          nominal?: number
          terbayar?: number
          keterangan?: string | null
          status?: 'belum_lunas' | 'sebagian' | 'lunas'
          created_by_name?: string | null
          updated_by_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      pembayaran_hutang: {
        Row: {
          id: number
          sumber_hutang_id: number
          tanggal_bayar: string
          nominal: number
          metode: 'Transfer' | 'Tunai' | 'Cek' | 'Lainnya'
          no_referensi: string | null
          bukti_url: string | null
          keterangan: string | null
          dicatat_oleh_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          sumber_hutang_id: number
          tanggal_bayar?: string
          nominal: number
          metode?: 'Transfer' | 'Tunai' | 'Cek' | 'Lainnya'
          no_referensi?: string | null
          bukti_url?: string | null
          keterangan?: string | null
          dicatat_oleh_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          sumber_hutang_id?: number
          tanggal_bayar?: string
          nominal?: number
          metode?: 'Transfer' | 'Tunai' | 'Cek' | 'Lainnya'
          no_referensi?: string | null
          bukti_url?: string | null
          keterangan?: string | null
          dicatat_oleh_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }

    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_superadmin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
