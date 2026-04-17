// auth.js — Supabase client for team sharing + magic link + display name
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://pbxatpcrodtgjteicemd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBieGF0cGNyb2R0Z2p0ZWljZW1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzODgyMDAsImV4cCI6MjA5MTk2NDIwMH0.MvUZ-o7vqX5UIZX7RoLx31nC5OtmGqv79B-YNnEpFdA';

let supabase = null;

export function initSupabase() {
  if (supabase) return supabase;
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabase;
}

/**
 * Send a magic link to the given email for team sharing/sync.
 * User must have authenticated (initSupabase called) before using this.
 * @param {string} email - User email address
 * @returns {Promise<{error: null | object}>}
 */
export async function sendMagicLink(email) {
  if (!supabase) {
    return { error: 'Supabase not initialized' };
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return { error: 'A valid email address is required' };
  }
  const { error } = await supabase.auth.signInWithOtp({ email });
  return { error };
}

/**
 * Get the current session, or null if not authenticated.
 * @returns {Promise<{data: {session: object | null}, error: null | object}>}
 */
export async function getSession() {
  if (!supabase) {
    return { data: { session: null }, error: 'Supabase not initialized' };
  }
  return await supabase.auth.getSession();
}

/**
 * Register a callback to be invoked when auth state changes.
 * @param {function} callback - Called with (event, session)
 * @returns {function} Unsubscribe function
 */
export function onAuthStateChange(callback) {
  if (!supabase) {
    console.warn('auth.js: onAuthStateChange called before initSupabase');
    return () => {};
  }
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return () => subscription?.unsubscribe();
}

/**
 * Get the current user's display name from user metadata.
 * @returns {Promise<string | null>}
 */
export async function getDisplayName() {
  if (!supabase) {
    return null;
  }
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return null;
  }
  return user.user_metadata?.display_name ?? null;
}

/**
 * Set the current user's display name in user metadata.
 * @param {string} name - Display name
 * @returns {Promise<{data: object | null, error: null | object}>}
 */
export async function setDisplayName(name) {
  if (!supabase) {
    return { data: null, error: 'Supabase not initialized' };
  }
  if (!name?.trim()) return { error: 'Display name cannot be empty' };
  return await supabase.auth.updateUser({ data: { display_name: name } });
}

/**
 * Sign out the current user.
 * @returns {Promise<{error: null | object}>}
 */
export async function signOut() {
  if (!supabase) {
    return { error: 'Supabase not initialized' };
  }
  return await supabase.auth.signOut();
}

/**
 * Get the Supabase client instance (for use by sync.js).
 * @returns {object | null}
 */
export function getClient() {
  return supabase;
}
