import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables - using placeholder values')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      parking_areas: {
        Row: {
          id: string
          name: string
          lat: number
          lng: number
          total_slots: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          lat: number
          lng: number
          total_slots: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          lat?: number
          lng?: number
          total_slots?: number
          created_at?: string
        }
      }
      slots: {
        Row: {
          id: string
          parking_area_id: string
          slot_number: number
          status: 'free' | 'occupied' | 'reserved'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          parking_area_id: string
          slot_number: number
          status?: 'free' | 'occupied' | 'reserved'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          parking_area_id?: string
          slot_number?: number
          status?: 'free' | 'occupied' | 'reserved'
          created_at?: string
          updated_at?: string
        }
      }
      reservations: {
        Row: {
          id: string
          user_id: string
          slot_id: string
          start_time: string
          end_time: string
          status: 'active' | 'completed' | 'cancelled'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          slot_id: string
          start_time: string
          end_time: string
          status?: 'active' | 'completed' | 'cancelled'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          slot_id?: string
          start_time?: string
          end_time?: string
          status?: 'active' | 'completed' | 'cancelled'
          created_at?: string
        }
      }
      predictions: {
        Row: {
          id: string
          slot_id: string
          timestamp: string
          probability: number
          created_at: string
        }
        Insert: {
          id?: string
          slot_id: string
          timestamp: string
          probability: number
          created_at?: string
        }
        Update: {
          id?: string
          slot_id?: string
          timestamp?: string
          probability?: number
          created_at?: string
        }
      }
      system_status: {
        Row: {
          id: string
          system_id: string
          status: string
          location: string
          last_heartbeat: string
          created_at: string
        }
        Insert: {
          id?: string
          system_id: string
          status: string
          location: string
          last_heartbeat: string
          created_at?: string
        }
        Update: {
          id?: string
          system_id?: string
          status?: string
          location?: string
          last_heartbeat?: string
          created_at?: string
        }
      }
    }
  }
}