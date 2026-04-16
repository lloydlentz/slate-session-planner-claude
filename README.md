# Slate Summit 2026 — Conference Session Planner

A static web app for browsing and coordinating attendance at the Slate Summit 2026 conference (June 24–26, 2026). A team manager can mark which sessions each team member is interested in or planning to attend, add shared notes, and view a 3-day schedule grid.

## Live Site

**[lloydlentz.github.io/slate-session-planner-claude](https://lloydlentz.github.io/slate-session-planner-claude/)**

## Features

- Browse conference sessions in a filterable card grid (filter by day, session type, team member, or status)
- Track each team member's interest per session: **Interested** or **Going** (click a pill to cycle through states)
- Add shared notes to any session
- View a 3-day schedule grid showing who's going to what
- All data persists in `localStorage` — no server, no login required
- Export your team's preferences as a JSON file

## Setup

1. Open the site and go to **Settings**
2. Under **Team Members**, add each person's name and click **Save Team**
3. Sessions load automatically from the Slate conference feed — if they don't appear, use the **Load Sessions** button under **Session Data**

## Technical Notes

No build step, no npm, no external dependencies. Pure HTML/CSS/JS (ES modules), deployable directly to GitHub Pages. State is stored in `localStorage` under the key `conferencePlanner`.

To run locally, serve the files from any static server (e.g., `npx serve .` or VS Code Live Server) — direct `file://` access won't work due to ES module loading restrictions.
