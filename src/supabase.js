import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wulihgevyzzhysnxzhoy.supabase.co'
const SUPABASE_ANON = 'COLE_AQUI_A_CHAVE_sb_publishable'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

// Número oficial de WhatsApp da escola (só dígitos: 55 + DDD + número)
export const WHATSAPP_ESCOLA = '5521999999999'
