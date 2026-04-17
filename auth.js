// auth.js — Optional Supabase client for team sharing + magic link + display name
// Login is only required if user wants to share/sync their plan with a team.
// Local plan building works without authentication.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

let supabase = null;

/**
 * Initialize Supabase client with provided credentials (optional).
 * Only required if user wants to share/sync their plan with a team.
 * The client automatically handles magic link token in URL hash on init.
 * @param {string} url - Supabase project URL
 * @param {string} anonKey - Supabase anonymous key
 * @returns {object} Supabase client instance
 */
export function initSupabase(url, anonKey) {
  if (!url || !anonKey) throw new Error('auth.js: url and anonKey are required');
  if (!supabase) {
    supabase = createClient(url, anonKey);
  }
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
