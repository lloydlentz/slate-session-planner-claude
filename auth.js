// auth.js — Supabase client
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://pbxatpcrodtgjteicemd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBieGF0cGNyb2R0Z2p0ZWljZW1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzODgyMDAsImV4cCI6MjA5MTk2NDIwMH0.MvUZ-o7vqX5UIZX7RoLx31nC5OtmGqv79B-YNnEpFdA';

let supabase = null;

export function initSupabase() {
  if (supabase) return supabase;
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabase;
}

export function getClient() {
  return supabase;
}
