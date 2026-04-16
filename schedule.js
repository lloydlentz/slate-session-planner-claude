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

  // Build a lookup: { day: { hour: [{ session, goingMembers }, ...] } }
  const grid = {};
  const tbdSessions = [];

  DAYS.forEach(d => {
    grid[d.key] = {};
    HOURS.forEach(h => { grid[d.key][h] = []; });
  });

  sessions.forEach(session => {
    const sessionPrefs = preferences[session.id] ?? {};
    const goingMembers = team.filter(m => sessionPrefs[m] === 'going');
    if (goingMembers.length === 0) return;
    if (memberFilter !== 'All' && !goingMembers.includes(memberFilter)) return;

    const hour = parseHour(session.time);
    if (hour === null || !grid[session.day]) {
      tbdSessions.push({ session, goingMembers });
      return;
    }
    const slot = grid[session.day]?.[hour];
    if (slot) {
      slot.push({ session, goingMembers });
    } else {
      tbdSessions.push({ session, goingMembers });
    }
  });

  // Remove stale tooltip if present
  const oldTooltip = document.getElementById('schedule-tooltip');
  if (oldTooltip) oldTooltip.remove();

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
                    data-session-id="${escHtmlAttr(session.id)}">
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
        <div class="tooltip-meta">${escHtml(s.type)} · ${escHtml(s.dayLabel)} · ${escHtml(s.time)} · ${escHtml(s.location)}</div>
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
