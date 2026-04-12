import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://glofenpwfihshzohqnla.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsb2ZlbnB3Zmloc2h6b2hxbmxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMTcyNjEsImV4cCI6MjA5MTU5MzI2MX0.pe4d7omQhNBjUpk8WqYTPHbgiKEwcbHCs93jysV7xBo'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)