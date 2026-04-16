# Conference Session Planner — Design Spec
_Date: 2026-04-16_

## Overview

A static, client-side-only web app hosted on GitHub Pages. A team manager uses it to browse conference sessions, mark team members as "interested" or "going" for each session, add shared notes, and view a 3-day schedule grid. All state persists in `localStorage` with a clean export path for future sharing.

---

## File Structure

```
index.html       # Shell: nav bar, filter strip, view containers
styles.css       # All styling, dark theme
app.js           # App init, view routing
data.js          # Session fetching, caching, date fallback logic
state.js         # localStorage read/write for team + preferences
sessions.js      # Sessions view: render cards, filtering
schedule.js      # Schedule view: time-grid render, tooltip
settings.js      # Settings panel: team setup, endpoint config
```

All JS files are loaded as ES modules (`<script type="module">`). No build step, no npm, no external dependencies. Deployable directly to GitHub Pages.

---

## Data Source

**Endpoint:**
```
https://slate-partners.technolutions.net/manage/query/run?id=8b7142c2-6c70-4109-9eeb-74d2494ba7c8&cmd=service&output=json&h=b0203357-4804-4c5d-8213-9e376263af44
```

Sessions are fetched on first load (or on manual refresh from Settings). The raw JSON is cached in `localStorage` to avoid re-fetching on every page load.

### Date Fallback Logic

On fetch, `data.js` inspects the session objects for date/time fields (e.g., `date`, `time`, `start_time`, `day`):

- If date/time fields exist → parse and use them directly.
- If a `day` or numeric day field exists → map to the conference dates:
  - Day 1 → Wednesday, June 24, 2026
  - Day 2 → Thursday, June 25, 2026
  - Day 3 → Friday, June 26, 2026
- If no day field exists → distribute sessions across the 3 days by their position in the feed (first third to Wed, second third to Thu, remainder to Fri) as a best-effort fallback until the feed includes real dates.
- If no time data is available, show time as "TBD" and list those sessions in a "Time TBD" section below the schedule grid rather than placing them in a time slot.

The actual field names will be confirmed by inspecting the live feed during implementation.

---

## State Shape (localStorage key: `conferencePlanner`)

```json
{
  "team": ["Lloyd", "Kathryn", "Tom"],
  "endpoint": "https://...",
  "sessionsCache": [ /* raw feed JSON */ ],
  "sessionsCachedAt": 1234567890,
  "preferences": {
    "<sessionId>": {
      "Lloyd": "going",
      "Kathryn": "interested",
      "Tom": "none",
      "note": "Great for onboarding new staff"
    }
  }
}
```

Member status values: `"none"` | `"interested"` | `"going"`

Session IDs (`<sessionId>` keys) will use whatever unique identifier the feed provides (e.g., an `id` or `key` field). If the feed lacks a unique ID, a stable hash of the session title + type will be used. The actual field will be confirmed by inspecting the live feed during implementation.

The state shape is designed to be JSON-exportable/importable without transformation.

---

## Navigation

**Layout C — Top Bar + Filter Strip**

- Slim top bar: app title on left, nav links (Sessions · Schedule · ⚙ Settings) on right
- Persistent filter strip below nav (visible on Sessions view):
  - Day: All / Wed / Thu / Fri
  - Session Type: All + types from feed
  - Team Member: All + individual names (populated from saved team)
  - Status: All / Interested / Going
- Settings collapses into the nav bar as a panel (does not replace the main view)

---

## Sessions View

The default view. Sessions displayed as a responsive card grid, grouped by session type.

### Session Card

- **Header:** Session title, speaker name
- **Badges:** Session type (colored), day (e.g., "Wed")
- **Body:** Truncated description (2–3 lines, expandable)
- **Team pills (bottom row):** One pill per team member showing name + state
  - Grey pill = none (click to cycle)
  - Amber pill + ★ = interested
  - Green pill + ✓ = going
  - Clicking a pill cycles: none → interested → going → none
- **Note badge:** 💬 indicator (filled when a note exists, empty outline when not); clicking expands an inline textarea for the shared session note. Auto-saves on blur.

### Filtering

Filters compose (AND logic): a session appears if it matches ALL active filters. The team member filter shows sessions where that member has any non-"none" status.

---

## Schedule View

A time-grid calendar (Google Calendar style).

- **Columns:** Wed 6/24 · Thu 6/25 · Fri 6/26
- **Rows:** Hourly time slots (8:00am – 6:00pm)
- **Session blocks:** Appear in the correct time slot, spanning their column
  - Show: session title + attendee initials (only members marked "going")
  - Color-coded by session type (same palette as card badges)
- **Hover tooltip:** Full session title, speaker, description, session type
- **Empty slots:** Subtle background striping to visually distinguish from filled slots
- Sessions with no time data are listed below the grid in a "Time TBD" section

---

## Settings Panel

Collapsible panel, accessible from the nav. Sections collapse individually after saving.

### Team Members
- Input to add team member names one at a time
- List of saved members with remove (×) button
- "Save Team" button — collapses this section, populates team filters and card pills

### Data Endpoint
- URL input field pre-filled with the default Slate endpoint
- "Load Sessions" button — fetches data, caches to localStorage, collapses this section
- Shows last-loaded timestamp

### Export
- "Export Data (JSON)" button — downloads current `localStorage` state as a `.json` file
- For future: "Import Data" button (noted as future scope, not built initially)

---

## Visual Design

- **Theme:** Dark (slate/navy backgrounds, light text)
- **Palette:**
  - Background: `#1e293b` (cards), `#0f172a` (nav/sidebar)
  - Accent: `#3b82f6` (blue, primary actions)
  - Going: `#16a34a` green
  - Interested: `#d97706` amber
  - Neutral/none: `#334155` grey
- **Typography:** System sans-serif stack
- **Responsive:** Works on desktop; mobile not a primary concern but cards should reflow

---

## Future Scope (not built now)

- Import data from JSON file
- Server-side persistence / sharing between devices
- Individual per-person notes
- Comment threads on sessions
