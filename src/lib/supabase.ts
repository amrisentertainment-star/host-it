import { createClient } from '@supabase/supabase-js';

// Next.js requires the NEXT_PUBLIC_ prefix to use these in the browser
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("SUPABASE ERROR: Missing API Keys in Environment Variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
