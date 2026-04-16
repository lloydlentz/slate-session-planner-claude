// app.js
import { getState, setState } from './state.js';
import { getSessionTypes } from './data.js';
import { renderSettings } from './settings.js';

const views = {
  sessions: document.getElementById('view-sessions'),
  schedule: document.getElementById('view-schedule'),
  settings: document.getElementById('view-settings'),
};

const filterStrip = document.getElementById('filter-strip');

let allSessions = [];
let activeView = 'sessions';

function showView(name) {
  // Remove any lingering tooltip
  const oldTooltip = document.getElementById('schedule-tooltip');
  if (oldTooltip) oldTooltip.remove();

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
  views.sessions.innerHTML = `<p style="color:var(--text-muted);padding:20px">Sessions view coming soon…</p>`;
}

function renderScheduleView() {
  views.schedule.innerHTML = `<p style="color:var(--text-muted);padding:20px">Schedule view coming soon…</p>`;
}

function renderSettingsView() {
  renderSettings(views.settings, {
    onTeamSaved: (team) => {
      rebuildPillGroup('filter-member', team);
      if (activeView === 'sessions') renderSessionsView();
    },
    onSessionsLoaded: (sessions) => {
      allSessions = sessions;
      rebuildPillGroup('filter-type', getSessionTypes(sessions));
      renderSessionsView();
    }
  });
}

function rebuildPillGroup(containerId, values, selectedValue = 'All') {
  const container = document.getElementById(containerId);
  const allBtn = `<button class="pill ${selectedValue === 'All' ? 'active' : ''}" data-value="All">All</button>`;
  const pills = values.map(v => `<button class="pill ${v === selectedValue ? 'active' : ''}" data-value="${escHtml(v)}">${escHtml(v)}</button>`).join('');
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

function escHtml(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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

// Init: restore from cache or show placeholder
const state = getState();
if (state.sessionsCache) {
  allSessions = state.sessionsCache;
  rebuildPillGroup('filter-type', getSessionTypes(allSessions));
  rebuildPillGroup('filter-member', state.team);
}
showView('sessions');
