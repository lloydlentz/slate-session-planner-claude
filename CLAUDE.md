# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development

No build step, no npm, no bundler. Pure HTML/CSS/JS (ES modules). Serve the directory with any static server — `file://` won't work due to ES module restrictions.

```bash
npx serve .
```

Manual test harness: open `tests.html` in browser.

## Architecture

Single-page app with three views (Sessions, Schedule, Settings). All data persists in a single `conferencePlanner` localStorage key. Supabase sync is optional — only activates when a team code is set.

**Module responsibilities:**

| File | Role |
|------|------|
| `app.js` | Entry point; view routing, filter strip wiring, sync lifecycle |
| `state.js` | All localStorage reads/writes; preference and note mutation helpers |
| `data.js` | Fetch and normalize sessions from external Slate API endpoint |
| `sync.js` | Supabase upserts, fetches, and realtime subscription |
| `auth.js` | Supabase client (hardcoded public anon key — intentional) |
| `sessions.js` | Sessions view: filter logic, card/list rendering, notes UI |
| `schedule.js` | Schedule view: 7 AM–6 PM grid per day, TBD section |
| `settings.js` | Settings view: team mgmt, endpoint input, export, theme, team code |

## State shape

```js
// localStorage key: "conferencePlanner"
{
  team: ['Lloyd', 'Kathryn'],
  endpoint: 'https://...',        // Slate API URL
  sessionsCache: [...],
  sessionsCachedAt: 1714733423000,
  preferences: {
    'session-guid': {
      'Lloyd': 'going',           // 'none' | 'interested' | 'going'
      note: 'shared team note'
    }
  },
  teamCode: 'SLATE-4X9K',        // undefined = no sync
  sessionView: 'tiles',          // 'tiles' | 'list'
  theme: 'dark'
}
```

## Key patterns

**Preference cycle:** pill click → `none → interested → going → none` → `setPreference()` writes localStorage → if teamCode set, calls `syncHandlers.pushPreference()` to upsert Supabase.

**View rendering:** each view module exports a `render(state, sessions, filters)` function; `app.js` calls the active one on any state/filter change. There is no virtual DOM — functions write directly to DOM container `innerHTML`.

**Supabase tables:** `member_preferences`, `session_notes`, `team_config`. Team code (not user auth) scopes all queries; RLS enforces isolation.

**Day mapping:** June 24 → Wed, 25 → Thu, 26 → Fri is hardcoded in `data.js` because the Slate API doesn't return date fields.

## Deployment

GitHub Pages — push `main` branch. No CI/CD. Live at https://lloydlentz.github.io/slate-session-planner-claude/
