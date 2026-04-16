// Data module — feed fetching and normalization

const DAY_MAP = {
  'Wednesday': { label: 'Wed', date: 'June 24' },
  'Thursday':  { label: 'Thu', date: 'June 25' },
  'Friday':    { label: 'Fri', date: 'June 26' }
};

export function normalizeSession(raw) {
  const dayInfo = DAY_MAP[raw.Day] ?? { label: raw.Day ?? '?', date: '' };
  return {
    id: raw.guid,
    type: (raw.Type ?? '').trim(),
    title: (raw.Title ?? '').trim(),
    description: (raw.Description ?? '').trim(),
    day: raw.Day ?? '',
    dayLabel: dayInfo.label,
    dayDate: dayInfo.date,
    time: (raw.Time ?? 'TBD').trim(),
    location: (raw.Location ?? '').trim(),
    speakers: raw.Speakers
      ? raw.Speakers.split('\n').map(s => s.trim()).filter(Boolean)
      : []
  };
}

export async function fetchSessions(endpoint) {
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error(`Failed to fetch sessions: HTTP ${res.status}`);
  const json = await res.json();
  return (json.row ?? []).map(normalizeSession);
}

// Parse "9:00 AM" → 9, "1:30 PM" → 13, "TBD" → null
export function parseHour(timeStr) {
  if (!timeStr || timeStr === 'TBD') return null;
  const match = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  return hour;
}

export function getSessionTypes(sessions) {
  return [...new Set(sessions.map(s => s.type).filter(Boolean))].sort();
}
