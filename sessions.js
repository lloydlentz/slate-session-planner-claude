// Sessions view
import { getState, setNote, cycleStatus } from './state.js';
import { getSessionTypes, parseHour } from './data.js';

const DAY_ORDER = ['Wednesday', 'Thursday', 'Friday'];
const DAY_DATES = { Wednesday: 'June 24', Thursday: 'June 25', Friday: 'June 26' };

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

export function renderSessions(container, sessions, filters, onStatusChange, viewMode = 'tiles') {
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

  const allTypes = getSessionTypes(sessions);
  const typeColorMap = buildTypeColorMap(allTypes);

  // Group by day > time
  const byDay = {};
  filtered.forEach(s => {
    if (!byDay[s.day]) byDay[s.day] = {};
    const t = s.time || 'TBD';
    if (!byDay[s.day][t]) byDay[s.day][t] = [];
    byDay[s.day][t].push(s);
  });

  const days = DAY_ORDER.filter(d => byDay[d]);

  container.innerHTML = days.map(day => {
    const timeSlots = Object.keys(byDay[day]).sort((a, b) => {
      const ha = parseHour(a) ?? 999;
      const hb = parseHour(b) ?? 999;
      return ha - hb;
    });

    const dayDate = DAY_DATES[day] ?? '';
    return `
      <div class="session-day-group">
        <div class="session-day-heading">${escHtml(day)}${dayDate ? ` <span class="session-day-date">${escHtml(dayDate)}</span>` : ''}</div>
        ${timeSlots.map(time => {
          const timeSessions = byDay[day][time];
          const content = viewMode === 'list'
            ? `<div class="sessions-list">${timeSessions.map(s => renderListRow(s, team, preferences, typeColorMap)).join('')}</div>`
            : `<div class="sessions-grid">${timeSessions.map(s => renderCard(s, team, preferences, typeColorMap)).join('')}</div>`;
          return `
            <div class="session-time-group">
              <div class="session-time-heading">${escHtml(time)}</div>
              ${content}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }).join('');

  // Attach pill click handlers
  container.querySelectorAll('.team-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const sessionId = pill.dataset.session;
      const member = pill.dataset.member;
      const current = pill.dataset.status;
      const next = cycleStatus(current);
      onStatusChange(sessionId, member, next);
    });
  });

  // Attach note handlers
  container.querySelectorAll('.note-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = btn.closest('.session-card, .list-row');
      row.querySelector('.note-area').classList.toggle('open');
    });
  });

  container.querySelectorAll('.note-area textarea').forEach(ta => {
    ta.addEventListener('blur', () => {
      const sessionId = ta.dataset.session;
      setNote(sessionId, ta.value);
      const row = ta.closest('.session-card, .list-row');
      row.querySelector('.note-toggle').classList.toggle('has-note', ta.value.trim().length > 0);
    });
  });

  // Attach description expand handlers (tiles only)
  container.querySelectorAll('.desc-expand-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const descEl = btn.previousElementSibling;
      const isExpanded = descEl.classList.contains('expanded');
      descEl.classList.toggle('expanded', !isExpanded);
      btn.textContent = isExpanded ? 'Show more' : 'Show less';
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
        return `<button class="team-pill" data-session="${escHtml(session.id)}" data-member="${escHtml(m)}" data-status="${escHtml(status)}">${pillLabel(m, status)}</button>`;
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
          <span class="badge badge-type badge-type-${colorIdx}">${escHtml(session.type)}</span>
          ${session.location ? `<span class="badge badge-location">${escHtml(session.location)}</span>` : ''}
        </div>
      </div>
      ${session.description ? `
  <div class="card-description-wrapper">
    <div class="card-description">${escHtml(session.description)}</div>
    ${session.description.length > 120 ? `<button class="desc-expand-btn" aria-label="Show more">Show more</button>` : ''}
  </div>` : ''}
      <div class="card-footer">
        ${pillsHtml}
        <button class="note-toggle ${hasNote ? 'has-note' : ''}" data-session="${escHtml(session.id)}" title="Notes">💬</button>
      </div>
      <div class="note-area ${hasNote ? 'open' : ''}">
        <textarea data-session="${escHtml(session.id)}" placeholder="Add notes about this session…">${escHtml(note)}</textarea>
      </div>
    </div>
  `;
}

function renderListRow(session, team, preferences, typeColorMap) {
  const sessionPrefs = preferences[session.id] ?? {};
  const note = sessionPrefs.note ?? '';
  const hasNote = note.trim().length > 0;
  const colorIdx = typeColorMap[session.type] ?? 0;

  const pillsHtml = team.length > 0
    ? team.map(m => {
        const status = sessionPrefs[m] ?? 'none';
        return `<button class="team-pill" data-session="${escHtml(session.id)}" data-member="${escHtml(m)}" data-status="${escHtml(status)}">${pillLabel(m, status)}</button>`;
      }).join('')
    : '';

  return `
    <div class="list-row">
      <div class="list-row-main">
        <div class="list-row-info">
          <div class="list-row-title">${escHtml(session.title)}</div>
          ${session.speakers.length > 0 ? `<div class="list-row-speaker">${escHtml(session.speakers.join(', '))}</div>` : ''}
        </div>
        <div class="list-row-meta">
          <span class="badge badge-type badge-type-${colorIdx}">${escHtml(session.type)}</span>
          ${session.location ? `<span class="list-row-location">${escHtml(session.location)}</span>` : ''}
        </div>
        <div class="list-row-actions">
          ${pillsHtml}
          <button class="note-toggle ${hasNote ? 'has-note' : ''}" data-session="${escHtml(session.id)}" title="Notes">💬</button>
        </div>
      </div>
      <div class="note-area ${hasNote ? 'open' : ''}">
        <textarea data-session="${escHtml(session.id)}" placeholder="Add notes about this session…">${escHtml(note)}</textarea>
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
