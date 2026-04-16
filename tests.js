// tests.js — browser test runner for pure logic modules

function suite() {
  const results = [];
  let passed = 0, failed = 0;

  function test(name, fn) {
    try {
      fn();
      results.push({ name, passed: true });
      passed++;
    } catch (e) {
      results.push({ name, passed: false, error: e.message });
      failed++;
    }
  }

  function assertEqual(a, b, msg) {
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      throw new Error(msg || `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
    }
  }

  function assert(condition, msg) {
    if (!condition) throw new Error(msg || 'Assertion failed');
  }

  return { test, assertEqual, assert, results: () => ({ results, passed, failed }) };
}

export async function runTests() {
  const { test, assertEqual, assert, results } = suite();

  // --- state.js tests ---
  const { cycleStatus } = await import('./state.js');

  test('cycleStatus: none → interested', () => {
    assertEqual(cycleStatus('none'), 'interested');
  });

  test('cycleStatus: interested → going', () => {
    assertEqual(cycleStatus('interested'), 'going');
  });

  test('cycleStatus: going → none', () => {
    assertEqual(cycleStatus('going'), 'none');
  });

  test('cycleStatus: unknown falls back to none', () => {
    assertEqual(cycleStatus('bogus'), 'none');
  });

  // --- data.js tests ---
  const { normalizeSession, parseHour, getSessionTypes } = await import('./data.js');

  test('normalizeSession: maps all fields', () => {
    const raw = {
      guid: 'abc-123',
      Type: 'Slate Summit Plenary',
      Title: '  Opening Session  ',
      Description: '\n  Great talk.\n',
      Day: 'Wednesday',
      Time: '9:00 AM',
      Location: 'Hall D',
      Speakers: 'Jane Smith\nBob Jones'
    };
    const s = normalizeSession(raw);
    assertEqual(s.id, 'abc-123');
    assertEqual(s.title, 'Opening Session');
    assertEqual(s.description, 'Great talk.');
    assertEqual(s.dayLabel, 'Wed');
    assertEqual(s.dayDate, 'June 24');
    assertEqual(s.time, '9:00 AM');
    assertEqual(s.speakers, ['Jane Smith', 'Bob Jones']);
  });

  test('normalizeSession: handles missing Speakers', () => {
    const raw = { guid: 'x', Type: 'T', Title: 'T', Description: '', Day: 'Friday', Time: '2:00 PM', Location: '' };
    assertEqual(normalizeSession(raw).speakers, []);
  });

  test('normalizeSession: unknown day passes through', () => {
    const raw = { guid: 'x', Type: '', Title: '', Description: '', Day: 'Monday', Time: 'TBD', Location: '' };
    assertEqual(normalizeSession(raw).dayLabel, 'Monday');
  });

  test('parseHour: 9:00 AM → 9', () => {
    assertEqual(parseHour('9:00 AM'), 9);
  });

  test('parseHour: 1:30 PM → 13', () => {
    assertEqual(parseHour('1:30 PM'), 13);
  });

  test('parseHour: 12:00 PM → 12', () => {
    assertEqual(parseHour('12:00 PM'), 12);
  });

  test('parseHour: 12:00 AM → 0', () => {
    assertEqual(parseHour('12:00 AM'), 0);
  });

  test('parseHour: TBD → null', () => {
    assertEqual(parseHour('TBD'), null);
  });

  test('parseHour: null → null', () => {
    assertEqual(parseHour(null), null);
  });

  test('getSessionTypes: deduplicates and sorts', () => {
    const sessions = [
      { type: 'Workshop' }, { type: 'Plenary' }, { type: 'Workshop' }
    ];
    assertEqual(getSessionTypes(sessions), ['Plenary', 'Workshop']);
  });

  // --- sessions.js filter tests ---
  const { filterSessions } = await import('./sessions.js');

  const mockSessions = [
    { id: 's1', day: 'Wednesday', type: 'Plenary', title: 'Keynote' },
    { id: 's2', day: 'Thursday',  type: 'Workshop', title: 'Deep Dive' },
    { id: 's3', day: 'Wednesday', type: 'Workshop', title: 'Hands On' },
  ];
  const mockPrefs = {
    s1: { Lloyd: 'going', Kathryn: 'interested' },
    s2: { Lloyd: 'interested' },
  };
  const mockTeam = ['Lloyd', 'Kathryn'];

  test('filterSessions: All filters → all sessions', () => {
    const r = filterSessions(mockSessions, { day:'All', type:'All', member:'All', status:'All' }, mockPrefs, mockTeam);
    assertEqual(r.length, 3);
  });

  test('filterSessions: filter by day', () => {
    const r = filterSessions(mockSessions, { day:'Wednesday', type:'All', member:'All', status:'All' }, mockPrefs, mockTeam);
    assertEqual(r.length, 2);
  });

  test('filterSessions: filter by type', () => {
    const r = filterSessions(mockSessions, { day:'All', type:'Workshop', member:'All', status:'All' }, mockPrefs, mockTeam);
    assertEqual(r.length, 2);
  });

  test('filterSessions: member filter hides none-status sessions', () => {
    const r = filterSessions(mockSessions, { day:'All', type:'All', member:'Lloyd', status:'All' }, mockPrefs, mockTeam);
    assertEqual(r.length, 2);
    assert(r.every(s => s.id !== 's3'));
  });

  test('filterSessions: member + status filter', () => {
    const r = filterSessions(mockSessions, { day:'All', type:'All', member:'Lloyd', status:'going' }, mockPrefs, mockTeam);
    assertEqual(r.length, 1);
    assertEqual(r[0].id, 's1');
  });

  test('filterSessions: All member + status=going shows any-member going', () => {
    const r = filterSessions(mockSessions, { day:'All', type:'All', member:'All', status:'going' }, mockPrefs, mockTeam);
    assertEqual(r.length, 1);
    assertEqual(r[0].id, 's1');
  });

  return results();
}
