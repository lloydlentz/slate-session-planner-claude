# Conference Session Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static GitHub Pages web app where a team manager can browse conference sessions, mark team members as interested/going, add notes, and view a 3-day schedule grid.

**Architecture:** Eight vanilla JS ES modules loaded from `index.html` with no build step. `state.js` owns all localStorage I/O; `data.js` owns feed fetching and normalization; view modules (`sessions.js`, `schedule.js`, `settings.js`) render into DOM containers passed to them by `app.js`, which wires everything together. Any state change triggers a full re-render of the active view.

**Tech Stack:** HTML5, CSS3, vanilla ES Modules (no npm, no bundler, no CDN dependencies). GitHub Pages static hosting.

---

## Live Feed Structure (confirmed by inspection)

Endpoint: `https://slate-partners.technolutions.net/manage/query/run?id=8b7142c2-6c70-4109-9eeb-74d2494ba7c8&cmd=service&output=json&h=b0203357-4804-4c5d-8213-9e376263af44`

Response shape:
```json
{
  "row": [
    {
      "guid": "0fcae7c3-f88f-4fb6-a150-ed962cd75d95",
      "Type": "Slate Summit Plenary",
      "Title": "Breakfast",
      "Description": "\n    Join us for breakfast!\n  ",
      "Day": "Wednesday",
      "Time": "7:30 AM",
      "Location": "Hall B & C"
    },
    {
      "guid": "98b68a5b-e365-416b-a13f-21f0147b8f81",
      "Type": "Slate Summit Plenary",
      "Title": "Opening Session",
      "Description": "...",
      "Day": "Wednesday",
      "Time": "9:00 AM",
      "Location": "Hall D",
      "Speakers": "Alexander Clark"
    }
  ]
}
```

Key facts:
- `guid` is the unique session ID
- `Day` is already "Wednesday" / "Thursday" / "Friday"
- `Time` is already "7:30 AM" / "9:00 AM" format
- `Speakers` is optional (absent for non-session entries like meals)
- `Description` needs `.trim()`

---

## File Map

| File | Responsibility |
|------|---------------|
| `index.html` | App shell: nav bar, filter strip, view containers |
| `styles.css` | Dark theme, all layout and component styles |
| `app.js` | Init, view routing, filter state, re-render orchestration |
| `state.js` | All localStorage reads/writes — no DOM |
| `data.js` | Feed fetch, session normalization, day mapping — no DOM |
| `sessions.js` | Sessions view: card grid rendering + pill interaction |
| `schedule.js` | Schedule view: time-grid rendering + hover tooltip |
| `settings.js` | Settings panel: team CRUD, endpoint config, export |
| `tests.html` | Browser-runnable tests for pure logic modules |

---

## Task 1: Project scaffold

**Files:**
- Create: `index.html`
- Create: `styles.css`
- Create: `app.js`
- Create: `state.js`
- Create: `data.js`
- Create: `sessions.js`
- Create: `schedule.js`
- Create: `settings.js`
- Create: `tests.html`
- Create: `.gitignore`

- [ ] **Step 1: Create `.gitignore`**

```
.superpowers/
.DS_Store
```

- [ ] **Step 2: Create `index.html` shell**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Conference Session Planner</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header id="top-bar">
    <div id="brand">Conference Planner</div>
    <nav id="main-nav">
      <a href="#" class="nav-link active" data-view="sessions">Sessions</a>
      <a href="#" class="nav-link" data-view="schedule">Schedule</a>
      <a href="#" class="nav-link" data-view="settings">⚙ Settings</a>
    </nav>
  </header>

  <div id="filter-strip" class="hidden">
    <div class="filter-group">
      <label>Day</label>
      <div id="filter-day" class="filter-pills">
        <button class="pill active" data-value="All">All</button>
        <button class="pill" data-value="Wednesday">Wed</button>
        <button class="pill" data-value="Thursday">Thu</button>
        <button class="pill" data-value="Friday">Fri</button>
      </div>
    </div>
    <div class="filter-group">
      <label>Type</label>
      <div id="filter-type" class="filter-pills"></div>
    </div>
    <div class="filter-group">
      <label>Member</label>
      <div id="filter-member" class="filter-pills">
        <button class="pill active" data-value="All">All</button>
      </div>
    </div>
    <div class="filter-group">
      <label>Status</label>
      <div id="filter-status" class="filter-pills">
        <button class="pill active" data-value="All">All</button>
        <button class="pill" data-value="interested">Interested</button>
        <button class="pill" data-value="going">Going</button>
      </div>
    </div>
  </div>

  <main id="main-content">
    <div id="view-sessions" class="view"></div>
    <div id="view-schedule" class="view hidden"></div>
    <div id="view-settings" class="view hidden"></div>
  </main>

  <script type="module" src="app.js"></script>
</body>
</html>
```

- [ ] **Step 3: Create empty stub modules**

Create each of these files with just an export comment for now:

`state.js`:
```js
// State module — all localStorage I/O
const KEY = 'conferencePlanner';
```

`data.js`:
```js
// Data module — feed fetching and normalization
```

`sessions.js`:
```js
// Sessions view
```

`schedule.js`:
```js
// Schedule view
```

`settings.js`:
```js
// Settings panel
```

`app.js`:
```js
// App entry point
```

`styles.css`: create as empty file for now.

- [ ] **Step 4: Create `tests.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tests</title>
  <style>
    body { font-family: monospace; background: #0f172a; color: #e2e8f0; padding: 20px; }
    .pass { color: #4ade80; }
    .fail { color: #f87171; }
    #summary { margin-top: 16px; font-size: 1.2em; font-weight: bold; }
  </style>
</head>
<body>
  <h2>Test Runner</h2>
  <div id="output"></div>
  <div id="summary"></div>
  <script type="module">
    import { runTests } from './tests.js';
    const results = await runTests();
    const out = document.getElementById('output');
    results.results.forEach(r => {
      const el = document.createElement('div');
      el.className = r.passed ? 'pass' : 'fail';
      el.textContent = `${r.passed ? '✓' : '✗'} ${r.name}${r.error ? ': ' + r.error : ''}`;
      out.appendChild(el);
    });
    document.getElementById('summary').textContent =
      `${results.passed} passed, ${results.failed} failed`;
  </script>
</body>
</html>
```

- [ ] **Step 5: Create `tests.js` test runner stub**

```js
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

  // Tests will be added in subsequent tasks

  return results();
}
```

- [ ] **Step 6: Open `tests.html` in browser to confirm it loads**

Open `tests.html` directly in Chrome (file:// or via a local server). You should see "0 passed, 0 failed". No errors in the console.

- [ ] **Step 7: Commit scaffold**

```bash
git add index.html styles.css app.js state.js data.js sessions.js schedule.js settings.js tests.html tests.js .gitignore
git commit -m "feat: project scaffold — all files stubbed"
```

---

## Task 2: Implement `state.js`

**Files:**
- Modify: `state.js`
- Modify: `tests.js`

- [ ] **Step 1: Implement `state.js`**

```js
// State module — all localStorage I/O
const KEY = 'conferencePlanner';

const DEFAULT_ENDPOINT = 'https://slate-partners.technolutions.net/manage/query/run?id=8b7142c2-6c70-4109-9eeb-74d2494ba7c8&cmd=service&output=json&h=b0203357-4804-4c5d-8213-9e376263af44';

function defaultState() {
  return {
    team: [],
    endpoint: DEFAULT_ENDPOINT,
    sessionsCache: null,
    sessionsCachedAt: null,
    preferences: {}
  };
}

export function getState() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || defaultState();
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
```

- [ ] **Step 2: Add state tests to `tests.js`**

Replace the `// Tests will be added` comment with:

```js
  // --- state.js tests ---
  // Use a temp key so tests don't touch real app data
  const TEST_KEY = 'conferencePlanner_test';
  const origKey = localStorage.getItem('conferencePlanner');

  // Temporarily swap to test key by patching localStorage
  // (We test cycleStatus directly since it's pure)
  const { cycleStatus, getNote, getPreference } = await import('./state.js');

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
```

- [ ] **Step 3: Open `tests.html` in browser, verify 4 passing tests**

Expected output:
```
✓ cycleStatus: none → interested
✓ cycleStatus: interested → going
✓ cycleStatus: going → none
✓ cycleStatus: unknown falls back to none
4 passed, 0 failed
```

- [ ] **Step 4: Commit**

```bash
git add state.js tests.js
git commit -m "feat: state module with localStorage CRUD and cycleStatus"
```

---

## Task 3: Implement `data.js`

**Files:**
- Modify: `data.js`
- Modify: `tests.js`

- [ ] **Step 1: Implement `data.js`**

```js
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
```

- [ ] **Step 2: Add data tests to `tests.js`**

Add after the state tests:

```js
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
```

- [ ] **Step 3: Open `tests.html` in browser, verify 14 passing tests**

All 14 tests should pass. If `parseHour` tests fail, check AM/PM logic in the regex.

- [ ] **Step 4: Commit**

```bash
git add data.js tests.js
git commit -m "feat: data module with feed normalization, date mapping, time parsing"
```

---

## Task 4: `styles.css` — dark theme and layout

**Files:**
- Modify: `styles.css`

- [ ] **Step 1: Write full `styles.css`**

```css
/* ===== Reset & Base ===== */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg-deep:    #0f172a;
  --bg-card:    #1e293b;
  --bg-hover:   #263347;
  --border:     #334155;
  --text:       #e2e8f0;
  --text-muted: #94a3b8;
  --accent:     #3b82f6;
  --going:      #16a34a;
  --going-bg:   #14532d;
  --interested: #d97706;
  --int-bg:     #78350f;
  --none-bg:    #334155;
  --none-text:  #64748b;
  --radius:     6px;
}

body {
  background: var(--bg-deep);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 14px;
  min-height: 100vh;
}

a { color: inherit; text-decoration: none; }

/* ===== Top Bar ===== */
#top-bar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-deep);
  border-bottom: 1px solid var(--border);
  padding: 0 20px;
  height: 48px;
}

#brand {
  font-weight: 700;
  font-size: 15px;
  color: var(--accent);
  letter-spacing: 0.02em;
}

#main-nav {
  display: flex;
  gap: 4px;
}

.nav-link {
  padding: 6px 14px;
  border-radius: var(--radius);
  color: var(--text-muted);
  font-size: 13px;
  transition: color 0.15s, background 0.15s;
}

.nav-link:hover { color: var(--text); background: var(--bg-card); }
.nav-link.active { color: var(--text); border-bottom: 2px solid var(--accent); border-radius: 0; }

/* ===== Filter Strip ===== */
#filter-strip {
  display: flex;
  gap: 20px;
  align-items: center;
  flex-wrap: wrap;
  padding: 10px 20px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
}

#filter-strip.hidden { display: none; }

.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-group label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
}

.filter-pills {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.filter-pills .pill {
  background: var(--bg-deep);
  border: 1px solid var(--border);
  color: var(--text-muted);
  border-radius: 12px;
  padding: 3px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.filter-pills .pill:hover { border-color: var(--accent); color: var(--text); }
.filter-pills .pill.active { background: var(--accent); border-color: var(--accent); color: #fff; }

/* ===== Main Content ===== */
#main-content { padding: 20px; }

.view { }
.view.hidden { display: none; }

/* ===== Session Cards ===== */
.sessions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 14px;
}

.session-type-group { margin-bottom: 28px; }
.session-type-heading {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 10px;
  padding-left: 2px;
}

.session-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 0.15s;
}

.session-card:hover { border-color: #475569; }

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.card-title {
  font-weight: 700;
  font-size: 13px;
  color: #f1f5f9;
  line-height: 1.3;
}

.card-speaker {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}

.card-badges {
  display: flex;
  gap: 5px;
  flex-shrink: 0;
}

.badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  white-space: nowrap;
}

.badge-day { background: #1e3a5f; color: #93c5fd; }
.badge-type { background: var(--bg-deep); color: var(--text-muted); border: 1px solid var(--border); }

/* Type-specific badge colors */
.badge-type-0 { background: #1e3a5f; color: #93c5fd; border: none; }
.badge-type-1 { background: #14532d; color: #86efac; border: none; }
.badge-type-2 { background: #78350f; color: #fcd34d; border: none; }
.badge-type-3 { background: #581c87; color: #d8b4fe; border: none; }
.badge-type-4 { background: #7f1d1d; color: #fca5a5; border: none; }
.badge-type-5 { background: #1e3a5f; color: #67e8f9; border: none; }

.card-description {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
  flex-wrap: wrap;
}

/* ===== Team Pills ===== */
.team-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
  user-select: none;
}

.team-pill[data-status="none"] {
  background: var(--none-bg);
  color: var(--none-text);
}

.team-pill[data-status="interested"] {
  background: var(--int-bg);
  color: var(--interested);
}

.team-pill[data-status="going"] {
  background: var(--going-bg);
  color: #4ade80;
}

.team-pill:hover { filter: brightness(1.2); }

/* ===== Note Toggle ===== */
.note-toggle {
  margin-left: auto;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 14px;
  padding: 2px 4px;
  border-radius: 4px;
  transition: color 0.15s;
}
.note-toggle:hover { color: var(--text); }
.note-toggle.has-note { color: var(--accent); }

.note-area {
  display: none;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}

.note-area.open { display: block; }

.note-area textarea {
  width: 100%;
  background: var(--bg-deep);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  font-size: 12px;
  padding: 8px;
  resize: vertical;
  min-height: 60px;
  font-family: inherit;
  line-height: 1.5;
}

.note-area textarea:focus {
  outline: none;
  border-color: var(--accent);
}

/* ===== Empty State ===== */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-muted);
}

.empty-state h3 { font-size: 16px; margin-bottom: 8px; color: var(--text); }
.empty-state p { font-size: 13px; }

/* ===== Schedule View ===== */
.schedule-container { overflow-x: auto; }

.schedule-grid {
  display: grid;
  grid-template-columns: 56px repeat(3, 1fr);
  min-width: 600px;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.schedule-header {
  background: var(--bg-deep);
  padding: 10px 12px;
  font-weight: 700;
  font-size: 12px;
  color: var(--accent);
  text-align: center;
  border-bottom: 2px solid var(--border);
}

.schedule-header.time-col { color: var(--text-muted); }

.schedule-row {
  display: contents;
}

.schedule-time {
  padding: 6px 8px;
  font-size: 11px;
  color: var(--text-muted);
  text-align: right;
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  background: var(--bg-deep);
  white-space: nowrap;
}

.schedule-cell {
  padding: 4px 6px;
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  background: var(--bg-card);
  min-height: 48px;
  position: relative;
}

.schedule-cell:last-child { border-right: none; }
.schedule-row:last-child .schedule-cell { border-bottom: none; }
.schedule-row:last-child .schedule-time { border-bottom: none; }

.schedule-cell.alt { background: #1a2535; }

.session-block {
  border-radius: 4px;
  padding: 5px 7px;
  margin-bottom: 3px;
  cursor: pointer;
  position: relative;
  transition: filter 0.15s;
}

.session-block:hover { filter: brightness(1.15); }

.session-block-title {
  font-size: 11px;
  font-weight: 600;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-block-members {
  font-size: 10px;
  margin-top: 2px;
  opacity: 0.8;
}

/* Session type colors for schedule blocks — must match badge colors */
.type-color-0 { background: #1e3a5f; color: #93c5fd; border-left: 3px solid #3b82f6; }
.type-color-1 { background: #14532d; color: #86efac; border-left: 3px solid #16a34a; }
.type-color-2 { background: #78350f; color: #fcd34d; border-left: 3px solid #d97706; }
.type-color-3 { background: #581c87; color: #d8b4fe; border-left: 3px solid #9333ea; }
.type-color-4 { background: #7f1d1d; color: #fca5a5; border-left: 3px solid #ef4444; }
.type-color-5 { background: #1e3a5f; color: #67e8f9; border-left: 3px solid #06b6d4; }

/* ===== Tooltip ===== */
.tooltip {
  position: fixed;
  z-index: 1000;
  background: #1e293b;
  border: 1px solid #475569;
  border-radius: 8px;
  padding: 12px 14px;
  max-width: 280px;
  pointer-events: none;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}

.tooltip-title { font-weight: 700; font-size: 13px; margin-bottom: 4px; color: #f1f5f9; }
.tooltip-speaker { font-size: 11px; color: var(--text-muted); margin-bottom: 6px; }
.tooltip-desc { font-size: 11px; color: var(--text-muted); line-height: 1.5; }
.tooltip-meta { font-size: 10px; color: #475569; margin-top: 6px; }
.tooltip.hidden { display: none; }

/* TBD section */
.tbd-section { margin-top: 28px; }
.tbd-section h3 { font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px; }
.tbd-list { display: flex; flex-direction: column; gap: 6px; }
.tbd-item { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 8px 12px; font-size: 12px; }

/* ===== Settings ===== */
.settings-container { max-width: 560px; display: flex; flex-direction: column; gap: 16px; }

.settings-section {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.settings-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  user-select: none;
}

.settings-section-header h3 { font-size: 13px; font-weight: 700; }
.settings-section-header .toggle { color: var(--text-muted); font-size: 12px; }

.settings-section-body { padding: 0 16px 16px; border-top: 1px solid var(--border); }
.settings-section-body.hidden { display: none; }

.settings-row { display: flex; gap: 8px; margin-top: 12px; align-items: center; }

.settings-input {
  flex: 1;
  background: var(--bg-deep);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  font-size: 13px;
  padding: 7px 10px;
  font-family: inherit;
}

.settings-input:focus { outline: none; border-color: var(--accent); }

.btn {
  background: var(--accent);
  border: none;
  color: #fff;
  border-radius: var(--radius);
  padding: 7px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.15s;
  white-space: nowrap;
}

.btn:hover { filter: brightness(1.1); }
.btn.btn-secondary { background: var(--bg-deep); border: 1px solid var(--border); color: var(--text); }
.btn.btn-secondary:hover { border-color: var(--accent); color: var(--accent); }
.btn.btn-danger { background: #7f1d1d; color: #fca5a5; border: 1px solid #ef4444; }

.team-list { display: flex; flex-direction: column; gap: 6px; margin-top: 12px; }

.team-member-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-deep);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 7px 12px;
  font-size: 13px;
}

.remove-member {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 14px;
  padding: 0 4px;
  line-height: 1;
  transition: color 0.15s;
}

.remove-member:hover { color: #ef4444; }

.settings-meta { font-size: 11px; color: var(--text-muted); margin-top: 8px; }

/* ===== Loading / Error ===== */
.loading { text-align: center; padding: 40px; color: var(--text-muted); }
.error-msg { background: #7f1d1d; border: 1px solid #ef4444; border-radius: var(--radius); padding: 12px 16px; color: #fca5a5; font-size: 13px; margin-bottom: 16px; }
```

- [ ] **Step 2: Open `index.html` in browser, verify no layout errors**

Open `index.html` directly. You should see: dark background, nav bar at top, no console errors. The page will be mostly empty — that's expected.

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "feat: full CSS — dark theme, layout, cards, schedule grid, settings"
```

---

## Task 5: Implement `settings.js`

**Files:**
- Modify: `settings.js`
- Modify: `app.js` (minimal wiring to test)

- [ ] **Step 1: Implement `settings.js`**

```js
// Settings panel
import { getState, setState } from './state.js';
import { fetchSessions } from './data.js';

export function renderSettings(container, { onTeamSaved, onSessionsLoaded }) {
  const state = getState();

  container.innerHTML = `
    <div class="settings-container">

      <div class="settings-section" id="section-team">
        <div class="settings-section-header" onclick="this.nextElementSibling.classList.toggle('hidden'); this.querySelector('.toggle').textContent = this.nextElementSibling.classList.contains('hidden') ? '▶' : '▼'">
          <h3>Team Members</h3>
          <span class="toggle">${state.team.length > 0 ? '▶' : '▼'}</span>
        </div>
        <div class="settings-section-body ${state.team.length > 0 ? 'hidden' : ''}">
          <div class="team-list" id="team-list">
            ${renderTeamList(state.team)}
          </div>
          <div class="settings-row">
            <input class="settings-input" id="new-member-input" type="text" placeholder="Add team member name..." />
            <button class="btn" id="add-member-btn">Add</button>
          </div>
          <div class="settings-row">
            <button class="btn" id="save-team-btn">Save Team</button>
          </div>
        </div>
      </div>

      <div class="settings-section" id="section-endpoint">
        <div class="settings-section-header" onclick="this.nextElementSibling.classList.toggle('hidden'); this.querySelector('.toggle').textContent = this.nextElementSibling.classList.contains('hidden') ? '▶' : '▼'">
          <h3>Session Data</h3>
          <span class="toggle">${state.sessionsCache ? '▶' : '▼'}</span>
        </div>
        <div class="settings-section-body ${state.sessionsCache ? 'hidden' : ''}">
          <div class="settings-row" style="margin-top: 12px;">
            <input class="settings-input" id="endpoint-input" type="url" value="${escHtml(state.endpoint)}" />
          </div>
          <div class="settings-row">
            <button class="btn" id="load-sessions-btn">Load Sessions</button>
          </div>
          <div id="load-status" class="settings-meta">
            ${state.sessionsCachedAt ? `Last loaded: ${new Date(state.sessionsCachedAt).toLocaleString()}` : ''}
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-header" onclick="this.nextElementSibling.classList.toggle('hidden'); this.querySelector('.toggle').textContent = this.nextElementSibling.classList.contains('hidden') ? '▶' : '▼'">
          <h3>Export Data</h3>
          <span class="toggle">▶</span>
        </div>
        <div class="settings-section-body hidden">
          <div class="settings-row">
            <button class="btn btn-secondary" id="export-btn">Export JSON</button>
          </div>
          <p class="settings-meta">Downloads your team settings and all session preferences as a JSON file.</p>
        </div>
      </div>

    </div>
  `;

  // --- Team management ---
  let pendingTeam = [...state.team];

  function refreshTeamList() {
    container.querySelector('#team-list').innerHTML = renderTeamList(pendingTeam);
    attachRemoveHandlers();
  }

  function attachRemoveHandlers() {
    container.querySelectorAll('.remove-member').forEach(btn => {
      btn.addEventListener('click', () => {
        pendingTeam = pendingTeam.filter(m => m !== btn.dataset.member);
        refreshTeamList();
      });
    });
  }

  attachRemoveHandlers();

  container.querySelector('#add-member-btn').addEventListener('click', () => {
    const input = container.querySelector('#new-member-input');
    const name = input.value.trim();
    if (name && !pendingTeam.includes(name)) {
      pendingTeam.push(name);
      refreshTeamList();
    }
    input.value = '';
    input.focus();
  });

  container.querySelector('#new-member-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') container.querySelector('#add-member-btn').click();
  });

  container.querySelector('#save-team-btn').addEventListener('click', () => {
    setState(s => ({ ...s, team: pendingTeam }));
    container.querySelector('#section-team .settings-section-body').classList.add('hidden');
    container.querySelector('#section-team .toggle').textContent = '▶';
    onTeamSaved(pendingTeam);
  });

  // --- Session loading ---
  container.querySelector('#load-sessions-btn').addEventListener('click', async () => {
    const btn = container.querySelector('#load-sessions-btn');
    const status = container.querySelector('#load-status');
    const endpoint = container.querySelector('#endpoint-input').value.trim();
    btn.disabled = true;
    btn.textContent = 'Loading...';
    status.textContent = '';
    try {
      const sessions = await fetchSessions(endpoint);
      setState(s => ({
        ...s,
        endpoint,
        sessionsCache: sessions,
        sessionsCachedAt: Date.now()
      }));
      status.textContent = `Loaded ${sessions.length} sessions at ${new Date().toLocaleString()}`;
      container.querySelector('#section-endpoint .settings-section-body').classList.add('hidden');
      container.querySelector('#section-endpoint .toggle').textContent = '▶';
      onSessionsLoaded(sessions);
    } catch (err) {
      status.textContent = `Error: ${err.message}`;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Load Sessions';
    }
  });

  // --- Export ---
  container.querySelector('#export-btn').addEventListener('click', () => {
    const { exportData } = window.__state ?? {};
    import('./state.js').then(({ exportData }) => {
      const blob = new Blob([exportData()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'conference-planner-data.json';
      a.click();
      URL.revokeObjectURL(url);
    });
  });
}

function renderTeamList(team) {
  if (team.length === 0) return '<p class="settings-meta">No team members added yet.</p>';
  return team.map(m => `
    <div class="team-member-row">
      <span>${escHtml(m)}</span>
      <button class="remove-member" data-member="${escHtml(m)}" title="Remove">×</button>
    </div>
  `).join('');
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
```

- [ ] **Step 2: Wire settings into `app.js` minimally**

```js
// app.js
import { getState, setState } from './state.js';
import { renderSettings } from './settings.js';
import { fetchSessions } from './data.js';

const views = {
  sessions: document.getElementById('view-sessions'),
  schedule: document.getElementById('view-schedule'),
  settings: document.getElementById('view-settings'),
};

const filterStrip = document.getElementById('filter-strip');

let allSessions = [];
let activeView = 'sessions';

function showView(name) {
  activeView = name;
  Object.entries(views).forEach(([k, el]) => {
    el.classList.toggle('hidden', k !== name);
  });
  document.querySelectorAll('.nav-link').forEach(a => {
    a.classList.toggle('active', a.dataset.view === name);
  });
  filterStrip.classList.toggle('hidden', name !== 'sessions');
  if (name === 'settings') renderSettingsView();
}

function renderSettingsView() {
  renderSettings(views.settings, {
    onTeamSaved: (team) => {
      rebuildTeamFilter(team);
      if (activeView === 'sessions') renderSessionsView();
    },
    onSessionsLoaded: (sessions) => {
      allSessions = sessions;
      renderSessionsView();
    }
  });
}

function renderSessionsView() {
  views.sessions.innerHTML = `<p style="color:var(--text-muted);padding:20px">Sessions view coming soon…</p>`;
}

function rebuildTeamFilter(team) {
  const container = document.getElementById('filter-member');
  container.innerHTML = `<button class="pill active" data-value="All">All</button>` +
    team.map(m => `<button class="pill" data-value="${m}">${m}</button>`).join('');
  attachFilterHandlers(container);
}

function attachFilterHandlers(container) {
  container.querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('click', () => {
      container.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      if (activeView === 'sessions') renderSessionsView();
    });
  });
}

// Init
document.querySelectorAll('.nav-link').forEach(a => {
  a.addEventListener('click', e => { e.preventDefault(); showView(a.dataset.view); });
});

// Attach filter handlers to all static filter pill groups
['filter-day', 'filter-type', 'filter-status', 'filter-member'].forEach(id => {
  const el = document.getElementById(id);
  if (el) attachFilterHandlers(el);
});

// On load: restore sessions from cache and show initial view
const state = getState();
if (state.sessionsCache) {
  allSessions = state.sessionsCache;
  rebuildTeamFilter(state.team);
}
showView('sessions');
```

- [ ] **Step 3: Open `index.html` in browser and test Settings**

1. Click "⚙ Settings" in the nav
2. Open "Team Members" section — add "Lloyd", "Kathryn", "Tom" → Save Team
3. Open "Session Data" section → click "Load Sessions" — should fetch from the endpoint and show count
4. Confirm filter strip "Member" pills update with team names
5. Check browser console — no errors

- [ ] **Step 4: Commit**

```bash
git add settings.js app.js
git commit -m "feat: settings panel — team CRUD, session loading, export"
```

---

## Task 6: Implement `sessions.js`

**Files:**
- Modify: `sessions.js`
- Modify: `app.js`

- [ ] **Step 1: Implement `sessions.js`**

```js
// Sessions view
import { getState, getPreference, setPreference, getNote, setNote, cycleStatus } from './state.js';
import { getSessionTypes } from './data.js';

export function filterSessions(sessions, filters, preferences, team) {
  const { day, type, member, status } = filters;
  return sessions.filter(session => {
    if (day !== 'All' && session.day !== day) return false;
    if (type !== 'All' && session.type !== type) return false;
    if (member !== 'All') {
      const memberStatus = preferences[session.id]?.[member] ?? 'none';
      if (memberStatus === 'none') return false;
      if (status !== 'All' && memberStatus !== status) return false;
    } else if (status !== 'All') {
      const anyMatch = team.some(m => (preferences[session.id]?.[m] ?? 'none') === status);
      if (!anyMatch) return false;
    }
    return true;
  });
}

export function renderSessions(container, sessions, filters, onStatusChange) {
  const state = getState();
  const { preferences, team } = state;
  const filtered = filterSessions(sessions, filters, preferences, team);

  if (sessions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No sessions loaded</h3>
        <p>Go to ⚙ Settings → Session Data and click "Load Sessions".</p>
      </div>`;
    return;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No sessions match your filters</h3>
        <p>Try adjusting the day, type, or member filters above.</p>
      </div>`;
    return;
  }

  // Group by type
  const byType = {};
  filtered.forEach(s => {
    if (!byType[s.type]) byType[s.type] = [];
    byType[s.type].push(s);
  });

  const allTypes = getSessionTypes(sessions);
  const typeColorMap = buildTypeColorMap(allTypes);

  container.innerHTML = Object.entries(byType).map(([type, typeSessions]) => `
    <div class="session-type-group">
      <div class="session-type-heading">${escHtml(type)}</div>
      <div class="sessions-grid">
        ${typeSessions.map(s => renderCard(s, team, preferences, typeColorMap)).join('')}
      </div>
    </div>
  `).join('');

  // Attach pill click handlers
  container.querySelectorAll('.team-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const sessionId = pill.dataset.session;
      const member = pill.dataset.member;
      const current = pill.dataset.status;
      const next = cycleStatus(current);
      setPreference(sessionId, member, next);
      pill.dataset.status = next;
      pill.textContent = pillLabel(member, next);
      onStatusChange();
    });
  });

  // Attach note handlers
  container.querySelectorAll('.note-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const sessionId = btn.dataset.session;
      const noteArea = btn.closest('.session-card').querySelector('.note-area');
      noteArea.classList.toggle('open');
    });
  });

  container.querySelectorAll('.note-area textarea').forEach(ta => {
    ta.addEventListener('blur', () => {
      const sessionId = ta.dataset.session;
      setNote(sessionId, ta.value);
      // Update note-toggle indicator
      const card = ta.closest('.session-card');
      const toggle = card.querySelector('.note-toggle');
      toggle.classList.toggle('has-note', ta.value.trim().length > 0);
    });
  });
}

function renderCard(session, team, preferences, typeColorMap) {
  const sessionPrefs = preferences[session.id] ?? {};
  const note = sessionPrefs.note ?? '';
  const hasNote = note.trim().length > 0;
  const colorIdx = typeColorMap[session.type] ?? 0;

  const speakerHtml = session.speakers.length > 0
    ? `<div class="card-speaker">${escHtml(session.speakers.join(', '))}</div>`
    : '';

  const pillsHtml = team.length > 0
    ? team.map(m => {
        const status = sessionPrefs[m] ?? 'none';
        return `<button class="team-pill" data-session="${session.id}" data-member="${escHtml(m)}" data-status="${status}">${pillLabel(m, status)}</button>`;
      }).join('')
    : '<span style="font-size:11px;color:var(--text-muted)">Add team members in Settings</span>';

  return `
    <div class="session-card">
      <div class="card-header">
        <div>
          <div class="card-title">${escHtml(session.title)}</div>
          ${speakerHtml}
        </div>
        <div class="card-badges">
          <span class="badge badge-day">${escHtml(session.dayLabel)}</span>
          <span class="badge badge-type badge-type-${colorIdx}">${escHtml(session.time)}</span>
        </div>
      </div>
      ${session.description ? `<div class="card-description">${escHtml(session.description)}</div>` : ''}
      <div class="card-footer">
        ${pillsHtml}
        <button class="note-toggle ${hasNote ? 'has-note' : ''}" data-session="${session.id}" title="Notes">💬</button>
      </div>
      <div class="note-area ${hasNote ? 'open' : ''}">
        <textarea data-session="${session.id}" placeholder="Add notes about this session…">${escHtml(note)}</textarea>
      </div>
    </div>
  `;
}

function pillLabel(member, status) {
  if (status === 'going') return `✓ ${member}`;
  if (status === 'interested') return `★ ${member}`;
  return member;
}

export function buildTypeColorMap(types) {
  const map = {};
  types.forEach((t, i) => { map[t] = i % 6; });
  return map;
}

function escHtml(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
```

- [ ] **Step 2: Add filterSessions tests to `tests.js`**

Add after the data tests:

```js
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
    // Lloyd has status on s1, s2 but not s3
    const r = filterSessions(mockSessions, { day:'All', type:'All', member:'Lloyd', status:'All' }, mockPrefs, mockTeam);
    assertEqual(r.length, 2);
    assert(r.every(s => s.id !== 's3'));
  });

  test('filterSessions: member + status filter', () => {
    // Lloyd going = only s1
    const r = filterSessions(mockSessions, { day:'All', type:'All', member:'Lloyd', status:'going' }, mockPrefs, mockTeam);
    assertEqual(r.length, 1);
    assertEqual(r[0].id, 's1');
  });

  test('filterSessions: All member + status=going shows any-member going', () => {
    // Only s1 has a "going" status (Lloyd)
    const r = filterSessions(mockSessions, { day:'All', type:'All', member:'All', status:'going' }, mockPrefs, mockTeam);
    assertEqual(r.length, 1);
    assertEqual(r[0].id, 's1');
  });
```

- [ ] **Step 3: Open `tests.html` — verify all tests pass (should be 20 total)**

- [ ] **Step 4: Wire sessions rendering into `app.js`**

Replace the `renderSessionsView` function and add type-filter rebuild:

```js
// At top of app.js, add import:
import { renderSessions, buildTypeColorMap } from './sessions.js';

// Replace renderSessionsView():
function getActiveFilters() {
  const get = id => document.querySelector(`#${id} .pill.active`)?.dataset.value ?? 'All';
  return {
    day:    get('filter-day'),
    type:   get('filter-type'),
    member: get('filter-member'),
    status: get('filter-status'),
  };
}

function renderSessionsView() {
  renderSessions(views.sessions, allSessions, getActiveFilters(), () => {
    // on status change: re-render schedule if it's visible
    if (activeView === 'schedule') renderScheduleView();
  });
}

function rebuildTypeFilter(sessions) {
  const { getSessionTypes } = await import('./data.js'); // static import at top instead
  // NOTE: Move this to use the already-imported getSessionTypes
}
```

Actually, replace the full `app.js` with this complete version that wires sessions properly:

```js
// app.js
import { getState, setState } from './state.js';
import { getSessionTypes } from './data.js';
import { renderSettings } from './settings.js';
import { renderSessions } from './sessions.js';

const views = {
  sessions: document.getElementById('view-sessions'),
  schedule: document.getElementById('view-schedule'),
  settings: document.getElementById('view-settings'),
};

const filterStrip = document.getElementById('filter-strip');

let allSessions = [];
let activeView = 'sessions';

function showView(name) {
  activeView = name;
  Object.entries(views).forEach(([k, el]) => el.classList.toggle('hidden', k !== name));
  document.querySelectorAll('.nav-link').forEach(a => a.classList.toggle('active', a.dataset.view === name));
  filterStrip.classList.toggle('hidden', name !== 'sessions');
  if (name === 'settings') renderSettingsView();
  if (name === 'sessions') renderSessionsView();
  if (name === 'schedule') renderScheduleView();
}

function getActiveFilter(groupId) {
  return document.querySelector(`#${groupId} .pill.active`)?.dataset.value ?? 'All';
}

function getActiveFilters() {
  return {
    day:    getActiveFilter('filter-day'),
    type:   getActiveFilter('filter-type'),
    member: getActiveFilter('filter-member'),
    status: getActiveFilter('filter-status'),
  };
}

function renderSessionsView() {
  renderSessions(views.sessions, allSessions, getActiveFilters(), () => {
    if (activeView === 'schedule') renderScheduleView();
  });
}

function renderScheduleView() {
  views.schedule.innerHTML = `<p style="color:var(--text-muted);padding:20px">Schedule view coming soon…</p>`;
}

function renderSettingsView() {
  renderSettings(views.settings, {
    onTeamSaved: (team) => {
      rebuildMemberFilter(team);
      if (activeView === 'sessions') renderSessionsView();
    },
    onSessionsLoaded: (sessions) => {
      allSessions = sessions;
      rebuildTypeFilter(sessions);
      renderSessionsView();
    }
  });
}

function rebuildPillGroup(containerId, values, selectedValue = 'All') {
  const container = document.getElementById(containerId);
  const allBtn = `<button class="pill ${selectedValue === 'All' ? 'active' : ''}" data-value="All">All</button>`;
  const pills = values.map(v => `<button class="pill ${v === selectedValue ? 'active' : ''}" data-value="${v}">${v}</button>`).join('');
  container.innerHTML = allBtn + pills;
  container.querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('click', () => {
      container.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      if (activeView === 'sessions') renderSessionsView();
      if (activeView === 'schedule') renderScheduleView();
    });
  });
}

function rebuildTypeFilter(sessions) {
  rebuildPillGroup('filter-type', getSessionTypes(sessions));
}

function rebuildMemberFilter(team) {
  rebuildPillGroup('filter-member', team);
}

// Attach static filter pill handlers (day, status)
['filter-day', 'filter-status'].forEach(id => {
  document.getElementById(id).querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.getElementById(id).querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      if (activeView === 'sessions') renderSessionsView();
    });
  });
});

// Nav
document.querySelectorAll('.nav-link').forEach(a => {
  a.addEventListener('click', e => { e.preventDefault(); showView(a.dataset.view); });
});

// Init
const state = getState();
if (state.sessionsCache) {
  allSessions = state.sessionsCache;
  rebuildTypeFilter(allSessions);
  rebuildMemberFilter(state.team);
}
showView('sessions');
```

- [ ] **Step 5: Open `index.html` in browser and test sessions view**

1. Sessions cards should render (if cache exists), or show "No sessions loaded" prompt
2. If needed: go to Settings → Load Sessions → return to Sessions
3. Verify: cards show title, speaker, day badge, time badge, team pills
4. Click a team pill — should cycle none → ★ Name → ✓ Name → Name
5. Refresh page — pill state should persist (localStorage)
6. Click 💬 on a card, type a note, click away — note persists on refresh
7. Test day filter pills — cards filter by day

- [ ] **Step 6: Commit**

```bash
git add sessions.js app.js tests.js
git commit -m "feat: sessions view — card grid, 3-state toggles, notes, filters"
```

---

## Task 7: Implement `schedule.js`

**Files:**
- Modify: `schedule.js`
- Modify: `app.js`

- [ ] **Step 1: Implement `schedule.js`**

```js
// Schedule view
import { getState } from './state.js';
import { parseHour, getSessionTypes } from './data.js';
import { buildTypeColorMap } from './sessions.js';

const DAYS = [
  { key: 'Wednesday', label: 'Wed 6/24' },
  { key: 'Thursday',  label: 'Thu 6/25' },
  { key: 'Friday',    label: 'Fri 6/26' },
];

// Hours to display in the grid (7 AM through 6 PM inclusive)
const HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // [7,8,...,18]

function formatHour(h) {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

export function renderSchedule(container, sessions, memberFilter = 'All') {
  const { preferences, team } = getState();
  const allTypes = getSessionTypes(sessions);
  const typeColorMap = buildTypeColorMap(allTypes);

  // Build a lookup: { day: { hour: [session, ...] } }
  const grid = {};
  const tbdSessions = [];

  DAYS.forEach(d => { grid[d.key] = {}; HOURS.forEach(h => { grid[d.key][h] = []; }); });

  sessions.forEach(session => {
    // Determine if this session is relevant to the memberFilter
    const sessionPrefs = preferences[session.id] ?? {};
    const goingMembers = team.filter(m => sessionPrefs[m] === 'going');
    if (goingMembers.length === 0) return; // only show sessions someone is "going" to

    if (memberFilter !== 'All' && !goingMembers.includes(memberFilter)) return;

    const hour = parseHour(session.time);
    if (hour === null || !grid[session.day]) {
      tbdSessions.push({ session, goingMembers });
      return;
    }
    if (grid[session.day][hour]) {
      grid[session.day][hour].push({ session, goingMembers });
    }
  });

  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip hidden';
  tooltip.id = 'schedule-tooltip';
  document.body.appendChild(tooltip);

  const gridHtml = `
    <div class="schedule-container">
      <div class="schedule-grid">
        <div class="schedule-header time-col"></div>
        ${DAYS.map(d => `<div class="schedule-header">${escHtml(d.label)}</div>`).join('')}
        ${HOURS.map((hour, rowIdx) => `
          <div class="schedule-time">${formatHour(hour)}</div>
          ${DAYS.map(d => {
            const blocks = grid[d.key]?.[hour] ?? [];
            const isAlt = rowIdx % 2 === 1;
            return `
              <div class="schedule-cell ${isAlt ? 'alt' : ''}">
                ${blocks.map(({ session, goingMembers }) => `
                  <div class="session-block type-color-${typeColorMap[session.type] ?? 0}"
                    data-session-id="${session.id}"
                    title="${escHtmlAttr(session.title)}">
                    <div class="session-block-title">${escHtml(session.title)}</div>
                    <div class="session-block-members">${escHtml(goingMembers.map(m => m[0]).join(' · '))}</div>
                  </div>
                `).join('')}
              </div>`;
          }).join('')}
        `).join('')}
      </div>
    </div>
  `;

  const tbdHtml = tbdSessions.length > 0 ? `
    <div class="tbd-section">
      <h3>Time TBD</h3>
      <div class="tbd-list">
        ${tbdSessions.map(({ session, goingMembers }) => `
          <div class="tbd-item">
            <strong>${escHtml(session.title)}</strong>
            <span style="color:var(--text-muted);margin-left:8px;font-size:11px">${escHtml(goingMembers.join(', '))}</span>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  container.innerHTML = gridHtml + tbdHtml;

  // Build session lookup for tooltip
  const sessionById = Object.fromEntries(sessions.map(s => [s.id, s]));

  // Tooltip handlers
  container.querySelectorAll('.session-block').forEach(block => {
    block.addEventListener('mouseenter', e => {
      const s = sessionById[block.dataset.sessionId];
      if (!s) return;
      tooltip.innerHTML = `
        <div class="tooltip-title">${escHtml(s.title)}</div>
        ${s.speakers.length ? `<div class="tooltip-speaker">${escHtml(s.speakers.join(', '))}</div>` : ''}
        ${s.description ? `<div class="tooltip-desc">${escHtml(s.description.slice(0, 200))}${s.description.length > 200 ? '…' : ''}</div>` : ''}
        <div class="tooltip-meta">${escHtml(s.type)} · ${escHtml(s.dayLabel)} ${escHtml(s.time)} · ${escHtml(s.location)}</div>
      `;
      tooltip.classList.remove('hidden');
      positionTooltip(e, tooltip);
    });

    block.addEventListener('mousemove', e => positionTooltip(e, tooltip));

    block.addEventListener('mouseleave', () => tooltip.classList.add('hidden'));
  });
}

function positionTooltip(e, tooltip) {
  const margin = 12;
  let x = e.clientX + margin;
  let y = e.clientY + margin;
  const tw = tooltip.offsetWidth || 280;
  const th = tooltip.offsetHeight || 120;
  if (x + tw > window.innerWidth - margin) x = e.clientX - tw - margin;
  if (y + th > window.innerHeight - margin) y = e.clientY - th - margin;
  tooltip.style.left = x + 'px';
  tooltip.style.top  = y + 'px';
}

function escHtml(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function escHtmlAttr(str) {
  return String(str ?? '').replace(/"/g, '&quot;');
}
```

- [ ] **Step 2: Wire schedule into `app.js`**

Add the import and update `renderScheduleView`:

```js
// Add to imports at top of app.js:
import { renderSchedule } from './schedule.js';

// Replace renderScheduleView():
function renderScheduleView() {
  const memberFilter = getActiveFilter('filter-member');
  renderSchedule(views.schedule, allSessions, memberFilter);
}
```

Also add filter handling for the member filter on schedule view — update the `rebuildMemberFilter` / pill click handler so schedule re-renders when a member filter is clicked while on the schedule view. The `rebuildPillGroup` function already handles this via the `if (activeView === 'schedule') renderScheduleView();` call — verify this is present.

- [ ] **Step 3: Remove stale tooltip on view change**

In `showView`, add tooltip cleanup:

```js
function showView(name) {
  // Remove any lingering tooltip
  const oldTooltip = document.getElementById('schedule-tooltip');
  if (oldTooltip) oldTooltip.remove();

  activeView = name;
  // ... rest of showView unchanged
}
```

- [ ] **Step 4: Open `index.html` and test Schedule view**

1. First ensure some team members are marked "going" on sessions (via Sessions view)
2. Click "Schedule" in nav
3. Verify the 3-column time grid renders
4. Sessions where anyone is "going" appear as colored blocks in the correct time slot
5. Hover a block — tooltip appears with title, speaker, description, metadata
6. Click a team member pill in filter strip → schedule re-renders showing only that person's sessions
7. Sessions with no going attendees are not shown (by design)
8. If any sessions have no time, they appear in "Time TBD" section below grid

- [ ] **Step 5: Commit**

```bash
git add schedule.js app.js
git commit -m "feat: schedule view — 3-day time grid, tooltips, member filter"
```

---

## Task 8: Polish and final wiring

**Files:**
- Modify: `index.html` (page title, favicon hint)
- Modify: `app.js` (auto-load sessions on first visit)
- Modify: `styles.css` (minor responsive tweaks)

- [ ] **Step 1: Auto-load sessions on first visit**

In `app.js`, after the init block, add logic to auto-fetch if no cache exists:

```js
// At the bottom of app.js, replace the init block with:
const state = getState();
if (state.sessionsCache) {
  allSessions = state.sessionsCache;
  rebuildTypeFilter(allSessions);
  rebuildMemberFilter(state.team);
  showView('sessions');
} else {
  // No cache — auto-fetch from the default endpoint
  showView('sessions'); // show loading state first
  views.sessions.innerHTML = `<div class="loading">Loading sessions…</div>`;
  import('./data.js').then(({ fetchSessions }) => {
    fetchSessions(state.endpoint)
      .then(sessions => {
        setState(s => ({ ...s, sessionsCache: sessions, sessionsCachedAt: Date.now() }));
        allSessions = sessions;
        rebuildTypeFilter(sessions);
        rebuildMemberFilter(state.team);
        renderSessionsView();
      })
      .catch(err => {
        views.sessions.innerHTML = `
          <div class="error-msg">Failed to load sessions: ${err.message}</div>
          <div class="empty-state"><p>Go to ⚙ Settings to configure the data endpoint.</p></div>`;
      });
  });
}
```

- [ ] **Step 2: Add `<meta>` description and update page title**

In `index.html`, update the `<head>`:

```html
<title>Conference Session Planner — Slate Summit 2026</title>
<meta name="description" content="Plan your team's conference schedule for Slate Summit 2026">
```

- [ ] **Step 3: Verify full end-to-end flow in browser**

Fresh test (clear localStorage first: DevTools → Application → Local Storage → Clear):

1. Page loads → automatically fetches sessions → cards appear
2. Click ⚙ Settings → "Team Members" is expanded (no team yet) → add 2-3 names → Save Team
3. Return to Sessions → team pills appear on each card
4. Toggle some members to "interested" and "going"
5. Filter by Day → cards filter correctly
6. Filter by a team member name → only sessions they've marked appear
7. Click Schedule → sessions with "going" members appear in time grid
8. Hover a session block → tooltip appears
9. Filter by a member in the schedule → only their sessions shown
10. Refresh page → all state preserved

- [ ] **Step 4: Final commit**

```bash
git add index.html app.js styles.css
git commit -m "feat: auto-load sessions on first visit, final polish"
```

---

## Self-Review Notes

- **Spec coverage:** ✓ Top bar + filter strip nav (Layout C), ✓ 3-state toggle pills, ✓ sessions grid with cards, ✓ shared note per session, ✓ day/type/member/status filters, ✓ schedule time-grid, ✓ hover tooltips, ✓ settings panel (team + endpoint + export), ✓ localStorage persistence, ✓ auto-load on first visit, ✓ date mapping (Wed Jun 24 / Thu Jun 25 / Fri Jun 26)
- **Placeholder scan:** No TBDs. All code blocks are complete.
- **Type consistency:** `normalizeSession` → `id, type, title, description, day, dayLabel, dayDate, time, location, speakers` — used consistently across `sessions.js`, `schedule.js`. `cycleStatus` defined in `state.js`, imported in `sessions.js`. `buildTypeColorMap` defined in `sessions.js`, imported in `schedule.js`. `parseHour` defined in `data.js`, imported in `schedule.js`.
- **escHtml** is duplicated across modules — acceptable for a no-bundler app; each module is self-contained.
