/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// console.log('Supabase URL:', supabaseUrl);
// console.log('Supabase Anon Key:', supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL or Anon Key is missing. Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Optimize auth performance
    flowType: 'pkce',
  },
  // Optimize database connections
  db: {
    schema: 'public',
  },
  // Enable real-time optimizations
  realtime: {
    params: {
      eventsPerSecond: 10, // Limit real-time events
    },
  },
  // Global headers for better caching
  global: {
    headers: {
      'Cache-Control': 'max-age=300', // 5 minutes cache
    },
  },
});
