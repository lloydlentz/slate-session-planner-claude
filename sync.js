// sync.js — team-scoped Supabase fetch, push, subscribe

let client = null;
let currentTeamCode = null;
let activeChannel = null;

/**
 * Initialize sync with Supabase client and team code.
 * @param {SupabaseClient} supabaseClient - Supabase client instance
 * @param {string} teamCode - Team code to filter all queries
 */
export function initSync(supabaseClient, teamCode) {
  if (!supabaseClient) throw new Error('sync.js: supabaseClient is required');
  if (!teamCode?.trim()) throw new Error('sync.js: teamCode is required');

  // Clean up existing channel if re-initializing
  if (activeChannel && client) {
    client.removeChannel(activeChannel);
    activeChannel = null;
  }

  client = supabaseClient;
  currentTeamCode = teamCode.trim();
}

/**
 * Fetch all member preferences for the current team.
 * @returns {Promise<Array>} Array of { session_id, member_name, status } or [] on error
 */
export async function fetchAllPreferences() {
  if (!client || !currentTeamCode) {
    return [];
  }

  try {
    const { data, error } = await client
      .from('member_preferences')
      .select('session_id, member_name, status')
      .eq('team_code', currentTeamCode);

    if (error) {
      console.error('Error fetching preferences:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Exception fetching preferences:', err);
    return [];
  }
}

/**
 * Fetch all session notes for the current team.
 * @returns {Promise<Array>} Array of { session_id, note } or [] on error
 */
export async function fetchAllNotes() {
  if (!client || !currentTeamCode) {
    return [];
  }

  try {
    const { data, error } = await client
      .from('session_notes')
      .select('session_id, note')
      .eq('team_code', currentTeamCode);

    if (error) {
      console.error('Error fetching notes:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Exception fetching notes:', err);
    return [];
  }
}

/**
 * Upsert a member preference.
 * @param {string} sessionId - Session ID
 * @param {string} memberName - Member name
 * @param {string} status - Status value
 * @returns {Promise<Object>} { error } object
 */
export async function pushPreference(sessionId, memberName, status) {
  if (!client || !currentTeamCode) {
    return { error: 'Sync not initialized' };
  }

  try {
    const row = {
      team_code: currentTeamCode,
      session_id: sessionId,
      member_name: memberName,
      status,
      updated_at: new Date().toISOString()
    };

    const { error } = await client
      .from('member_preferences')
      .upsert(row);

    if (error) {
      console.error('Error pushing preference:', error);
      return { error };
    }

    return { error: null };
  } catch (err) {
    console.error('Exception pushing preference:', err);
    return { error: err.message };
  }
}

/**
 * Upsert a session note.
 * @param {string} sessionId - Session ID
 * @param {string} note - Note content
 * @returns {Promise<Object>} { error } object
 */
export async function pushNote(sessionId, note) {
  if (!client || !currentTeamCode) {
    return { error: 'Sync not initialized' };
  }

  try {
    const row = {
      team_code: currentTeamCode,
      session_id: sessionId,
      note,
      updated_at: new Date().toISOString()
    };

    const { error } = await client
      .from('session_notes')
      .upsert(row);

    if (error) {
      console.error('Error pushing note:', error);
      return { error };
    }

    return { error: null };
  } catch (err) {
    console.error('Exception pushing note:', err);
    return { error: err.message };
  }
}

/**
 * Subscribe to realtime changes for member preferences and session notes.
 * @param {Function} onPreferenceChange - Callback for preference changes
 * @param {Function} onNoteChange - Callback for note changes
 * @returns {Function} Unsubscribe function
 */
export function subscribeToChanges(onPreferenceChange, onNoteChange) {
  if (!client || !currentTeamCode) {
    return () => {};
  }

  const channel = client
    .channel(`team-changes-${currentTeamCode}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'member_preferences' },
      (payload) => { if (payload.new.team_code === currentTeamCode) onPreferenceChange(payload.new); }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'member_preferences' },
      (payload) => { if (payload.new.team_code === currentTeamCode) onPreferenceChange(payload.new); }
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'session_notes' },
      (payload) => { if (payload.new.team_code === currentTeamCode) onNoteChange(payload.new); }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'session_notes' },
      (payload) => { if (payload.new.team_code === currentTeamCode) onNoteChange(payload.new); }
    )
    .subscribe();

  activeChannel = channel;
  return () => {
    client.removeChannel(channel);
    activeChannel = null;
  };
}
