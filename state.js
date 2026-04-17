// State module — all localStorage I/O
const KEY = 'conferencePlanner';

const DEFAULT_ENDPOINT = 'https://slate-partners.technolutions.net/manage/query/run?id=8b7142c2-6c70-4109-9eeb-74d2494ba7c8&cmd=service&output=json&h=b0203357-4804-4c5d-8213-9e376263af44';

// Module-level sync handlers registry
let syncHandlers = null;

function defaultState() {
  return {
    team: ['Lloyd', 'Kathryn', 'Austin'],
    endpoint: DEFAULT_ENDPOINT,
    sessionsCache: null,
    sessionsCachedAt: null,
    preferences: {},
    supabaseUrl: '',     // Supabase project URL
    supabaseAnonKey: '', // Supabase anon key
    teamCode: '',        // e.g. "SLATE-4X9K" — shared with teammates
    myName: ''           // e.g. "Lloyd" — confirmed on first login
  };
}

export function getState() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : defaultState();
  } catch {
    return defaultState();
  }
}

export function setState(updater) {
  const current = getState();
  const next = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function setSyncHandlers(handlers) {
  syncHandlers = handlers;
}

export function getPreference(sessionId, member) {
  return getState().preferences[sessionId]?.[member] ?? 'none';
}

export function cycleStatus(current) {
  const cycle = { none: 'interested', interested: 'going', going: 'none' };
  return cycle[current] ?? 'none';
}

export function setPreference(sessionId, member, status) {
  // Sync to Supabase only for the current user's own preferences
  const { myName } = getState();
  setState(s => ({
    ...s,
    preferences: {
      ...s.preferences,
      [sessionId]: { ...(s.preferences[sessionId] ?? {}), [member]: status }
    }
  }));
  if (syncHandlers && member === myName) {
    syncHandlers.pushPreference(sessionId, member, status).catch(() => {
      // Silently swallow sync errors — local write already succeeded
    });
  }
}

export function getNote(sessionId) {
  return getState().preferences[sessionId]?.note ?? '';
}

export function setNote(sessionId, note) {
  setState(s => ({
    ...s,
    preferences: {
      ...s.preferences,
      [sessionId]: { ...(s.preferences[sessionId] ?? {}), note }
    }
  }));
  if (syncHandlers) {
    syncHandlers.pushNote(sessionId, note).catch(() => {
      // Silently swallow sync errors — local write already succeeded
    });
  }
}

export function exportData() {
  return JSON.stringify(getState(), null, 2);
}

export function loadRemoteState(prefRows, noteRows) {
  setState(s => {
    const prefs = { ...s.preferences };
    for (const row of prefRows) {
      prefs[row.session_id] = {
        ...(prefs[row.session_id] ?? {}),
        [row.member_name]: row.status
      };
    }
    for (const row of noteRows) {
      prefs[row.session_id] = {
        ...(prefs[row.session_id] ?? {}),
        note: row.note
      };
    }
    return { ...s, preferences: prefs };
  });
}
