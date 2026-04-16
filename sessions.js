// Sessions view
import { getState, setPreference, setNote, cycleStatus } from './state.js';
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
      const noteArea = btn.closest('.session-card').querySelector('.note-area');
      noteArea.classList.toggle('open');
    });
  });

  container.querySelectorAll('.note-area textarea').forEach(ta => {
    ta.addEventListener('blur', () => {
      const sessionId = ta.dataset.session;
      setNote(sessionId, ta.value);
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
        return `<button class="team-pill" data-session="${escHtml(session.id)}" data-member="${escHtml(m)}" data-status="${status}">${pillLabel(m, status)}</button>`;
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
        <button class="note-toggle ${hasNote ? 'has-note' : ''}" data-session="${escHtml(session.id)}" title="Notes">💬</button>
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
