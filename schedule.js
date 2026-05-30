// Schedule view
import { getState } from './state.js';
import { parseHour, getSessionTypes } from './data.js';
import { buildTypeColorMap } from './sessions.js';

const DAYS = [
  { key: 'Wednesday', label: 'Wed 6/24' },
  { key: 'Thursday',  label: 'Thu 6/25' },
  { key: 'Friday',    label: 'Fri 6/26' },
];

const HOURS = Array.from({ length: 12 }, (_, i) => i + 7);

let _modalKeydownListener = null;

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

  const grid = {};
  const tbdSessions = [];

  DAYS.forEach(d => {
    grid[d.key] = {};
    HOURS.forEach(h => { grid[d.key][h] = []; });
  });

  sessions.forEach(session => {
    const sessionPrefs = preferences[session.id] ?? {};
    const goingMembers = team.filter(m => sessionPrefs[m] === 'going');
    const interestedMembers = team.filter(m => sessionPrefs[m] === 'interested');

    if (goingMembers.length === 0 && interestedMembers.length === 0) return;

    if (memberFilter !== 'All') {
      const memberStatus = sessionPrefs[memberFilter] ?? 'none';
      if (memberStatus === 'none') return;
    }

    const hour = parseHour(session.time);
    if (hour === null || !grid[session.day]) {
      tbdSessions.push({ session, goingMembers, interestedMembers });
      return;
    }
    const slot = grid[session.day]?.[hour];
    if (slot) {
      slot.push({ session, goingMembers, interestedMembers });
    } else {
      tbdSessions.push({ session, goingMembers, interestedMembers });
    }
  });

  // Remove stale modal + keydown
  const oldModal = document.getElementById('schedule-modal');
  if (oldModal) oldModal.remove();
  if (_modalKeydownListener) {
    document.removeEventListener('keydown', _modalKeydownListener);
    _modalKeydownListener = null;
  }

  const modal = document.createElement('div');
  modal.id = 'schedule-modal';
  modal.className = 'schedule-modal hidden';
  modal.innerHTML = `
    <div class="schedule-modal-backdrop"></div>
    <div class="schedule-modal-content" role="dialog" aria-modal="true">
      <button class="schedule-modal-close" aria-label="Close">&times;</button>
      <div class="schedule-modal-body"></div>
    </div>
  `;
  document.body.appendChild(modal);

  function closeModal() { modal.classList.add('hidden'); }
  modal.querySelector('.schedule-modal-backdrop').addEventListener('click', closeModal);
  modal.querySelector('.schedule-modal-close').addEventListener('click', closeModal);

  _modalKeydownListener = (e) => { if (e.key === 'Escape') closeModal(); };
  document.addEventListener('keydown', _modalKeydownListener);

  function memberLine(going, interested) {
    const parts = [
      ...going.map(m => `✓ ${m}`),
      ...interested.map(m => `★ ${m}`),
    ];
    return parts.join('  ·  ');
  }

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
                ${blocks.map(({ session, goingMembers, interestedMembers }) => {
                  const interestedOnly = goingMembers.length === 0;
                  const initials = [
                    ...goingMembers.map(m => `✓${m[0]}`),
                    ...interestedMembers.map(m => `★${m[0]}`),
                  ].join(' ');
                  return `
                    <div class="session-block type-color-${typeColorMap[session.type] ?? 0}${interestedOnly ? ' status-interested' : ''}"
                      data-session-id="${escHtmlAttr(session.id)}">
                      <div class="session-block-title">${escHtml(session.title)}</div>
                      <div class="session-block-members">${escHtml(initials)}</div>
                    </div>
                  `;
                }).join('')}
              </div>`;
          }).join('')}
        `).join('')}
      </div>
      <div class="schedule-legend">
        <span class="legend-item legend-going">✓ Going</span>
        <span class="legend-item legend-interested">★ Interested</span>
      </div>
    </div>
  `;

  const tbdHtml = tbdSessions.length > 0 ? `
    <div class="tbd-section">
      <h3>Time TBD</h3>
      <div class="tbd-list">
        ${tbdSessions.map(({ session, goingMembers, interestedMembers }) => `
          <div class="tbd-item">
            <strong>${escHtml(session.title)}</strong>
            <span class="tbd-members">${escHtml(memberLine(goingMembers, interestedMembers))}</span>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  container.innerHTML = gridHtml + tbdHtml;

  const sessionById = Object.fromEntries(sessions.map(s => [s.id, s]));

  container.querySelectorAll('.session-block').forEach(block => {
    block.addEventListener('click', () => {
      const s = sessionById[block.dataset.sessionId];
      if (!s) return;
      const sessionPrefs = preferences[s.id] ?? {};
      const going = team.filter(m => sessionPrefs[m] === 'going');
      const interested = team.filter(m => sessionPrefs[m] === 'interested');

      modal.querySelector('.schedule-modal-body').innerHTML = `
        <div class="modal-title">${escHtml(s.title)}</div>
        ${s.speakers.length ? `<div class="modal-speaker">${escHtml(s.speakers.join(', '))}</div>` : ''}
        <div class="modal-meta">${escHtml(s.type)}${s.dayLabel ? ` · ${escHtml(s.dayLabel)}` : ''} · ${escHtml(s.time)}${s.location ? ` · ${escHtml(s.location)}` : ''}</div>
        ${s.description ? `<div class="modal-desc">${escHtml(s.description)}</div>` : ''}
        ${going.length ? `<div class="modal-members modal-going">✓ Going: ${escHtml(going.join(', '))}</div>` : ''}
        ${interested.length ? `<div class="modal-members modal-interested">★ Interested: ${escHtml(interested.join(', '))}</div>` : ''}
      `;
      modal.classList.remove('hidden');
    });
  });
}

function escHtml(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function escHtmlAttr(str) {
  return String(str ?? '').replace(/"/g, '&quot;');
}
