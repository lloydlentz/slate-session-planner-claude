// State module — all localStorage I/O
const KEY = 'conferencePlanner';

const DEFAULT_ENDPOINT = 'https://slate-partners.technolutions.net/manage/query/run?id=8b7142c2-6c70-4109-9eeb-74d2494ba7c8&cmd=service&output=json&h=b0203357-4804-4c5d-8213-9e376263af44';

function defaultState() {
  return {
    team: ['Lloyd', 'Kathryn', 'Austin'],
    endpoint: DEFAULT_ENDPOINT,
    sessionsCache: null,
    sessionsCachedAt: null,
    preferences: {}
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

export function getPreference(sessionId, member) {
  return getState().preferences[sessionId]?.[member] ?? 'none';
}

export function cycleStatus(current) {
  const cycle = { none: 'interested', interested: 'going', going: 'none' };
  return cycle[current] ?? 'none';
}

export function setPreference(sessionId, member, status) {
  setState(s => ({
    ...s,
    preferences: {
      ...s.preferences,
      [sessionId]: { ...(s.preferences[sessionId] ?? {}), [member]: status }
    }
  }));
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
}

export function exportData() {
  return JSON.stringify(getState(), null, 2);
}
