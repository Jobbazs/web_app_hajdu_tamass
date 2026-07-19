import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
//eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xdnB0Ymhqemlwd2N6dm9kcnVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0OTU5NjUsImV4cCI6MjA5NjA3MTk2NX0.spt3nnMp88RsKlzvBePNyymO3wY0FECh-dVJGQIQMi4

export const supabase = createClient(supabaseUrl, supabaseAnonKey)