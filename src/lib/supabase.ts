import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SB_HOST
const supabaseAnonKey = import.meta.env.VITE_SB_LEGACY_AN

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not configured. Sync will be disabled.')
}

export const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

export const isSupabaseConfigured = (): boolean => {
    return supabase !== null
}
