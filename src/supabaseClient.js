import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tzfvteccfyxfefwhmara.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6ZnZ0ZWNjZnl4ZmVmd2htYXJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjUxMjUsImV4cCI6MjA2Njg0MTEyNX0.2V5VDPPGTxo4R-_s-e7eBUEc7MF8N0s-9zdsZpCNFgY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)