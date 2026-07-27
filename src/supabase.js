import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wulihgevyzzhysnxzhoy.supabase.co'
const SUPABASE_ANON = 'sb_publishable_YTaSssCbwiudqrAoRx2YpA_CrEhc4Sb'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

// Número oficial de WhatsApp da escola (só dígitos: 55 + DDD + número)
export const WHATSAPP_ESCOLA = '5521977380286'
