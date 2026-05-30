// app.js
import { getState, setState } from './state.js';
import { getSessionTypes, fetchSessions } from './data.js';
import { renderSettings } from './settings.js';
import { renderSchedule } from './schedule.js';
import { renderSessions } from './sessions.js';
import { initSupabase, getClient } from './auth.js';
import { initSync, fetchAllPreferences, fetchAllNotes, fetchTeamMembers, pushPreference, pushNote, pushTeamMembers, subscribeToChanges } from './sync.js';
import { setPreference, setSyncHandlers, loadRemoteState } from './state.js';

const views = {
  sessions: document.getElementById('view-sessions'),
  schedule: document.getElementById('view-schedule'),
  settings: document.getElementById('view-settings'),
  about:    document.getElementById('view-about'),
};

const CACHE_TTL_MS = 48 * 60 * 60 * 1000;

const filterStrip = document.getElementById('filter-strip');

let allSessions = [];
let activeView = 'sessions';
let fetchInProgress = false;
let unsubscribeSync = null;
let syncInitInProgress = false;

function showView(name) {
  const oldTooltip = document.getElementById('schedule-tooltip');
  if (oldTooltip) oldTooltip.remove();

  activeView = name;
  Object.entries(views).forEach(([k, el]) => el.classList.toggle('hidden', k !== name));
  document.querySelectorAll('.nav-link').forEach(a => a.classList.toggle('active', a.dataset.view === name));
  filterStrip.classList.toggle('hidden', name !== 'sessions');
  if (name === 'settings') renderSettingsView();
  if (name === 'sessions') renderSessionsView();
  if (name === 'schedule') renderScheduleView();
  if (name === 'about') renderAboutView();
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

function applyTheme(theme) {
  document.body.classList.toggle('light-mode', theme === 'light');
  document.getElementById('theme-toggle-btn').textContent = theme === 'light' ? '🌙' : '☀️';
}

function updateSyncDot(mode) { // 'hidden' | 'configured' | 'connected'
  const dot = document.getElementById('sync-dot');
  if (mode === 'hidden') {
    dot.className = 'sync-dot hidden';
  } else if (mode === 'connected') {
    dot.className = 'sync-dot connected';
    dot.title = 'Syncing with team';
  } else {
    dot.className = 'sync-dot configured';
    dot.title = 'Connecting…';
  }
}

function renderSessionsView() {
  if (fetchInProgress) return;
  renderSessions(views.sessions, allSessions, getActiveFilters(), (sessionId, member, newStatus) => {
    setPreference(sessionId, member, newStatus);
    renderSessionsView();
    if (activeView === 'schedule') renderScheduleView();
  }, getState().sessionView ?? 'tiles');
}

function renderScheduleView() {
  const memberFilter = getActiveFilter('filter-member');
  renderSchedule(views.schedule, allSessions, memberFilter);
}

function renderAboutView() {
  views.about.innerHTML = `
    <div class="about-page">
      <h2>About This App</h2>
      <p class="about-intro">A team planning tool for Slate Summit 2026 — browse sessions, mark your plans, and stay in sync with your colleagues.</p>

      <section class="about-section">
        <h3>Browsing Sessions</h3>
        <ul>
          <li>Use the <strong>filter bar</strong> to narrow sessions by Day, Type, Team Member, or Status.</li>
          <li>Switch between <strong>⊞ Tiles</strong> and <strong>☰ List</strong> view using the toggle in the filter bar.</li>
          <li>Sessions are grouped by day and time slot.</li>
        </ul>
      </section>

      <section class="about-section">
        <h3>Marking Sessions</h3>
        <ul>
          <li>Click the <strong>Interested</strong> or <strong>Going</strong> buttons on any session card to set your status.</li>
          <li>Filter by <em>Status → Going</em> or <em>Status → Interested</em> to see your shortlist.</li>
          <li>Click the <strong>note icon</strong> on a card to add or edit a private note for that session.</li>
        </ul>
      </section>

      <section class="about-section">
        <h3>Schedule View</h3>
        <ul>
          <li>The <strong>Schedule</strong> tab shows only sessions your team has marked as <em>Going</em>.</li>
          <li>Sessions are laid out in a time-grid for each day so you can spot conflicts at a glance.</li>
          <li>Use the Member filter to focus on one person's schedule.</li>
        </ul>
      </section>

      <section class="about-section">
        <h3>Team Sync</h3>
        <ul>
          <li>Go to <strong>⚙ Settings</strong> and generate or enter a <strong>Team Code</strong> to sync with colleagues.</li>
          <li>Anyone who enters the same code will share session statuses and notes in real time.</li>
          <li>The <strong>sync dot</strong> in the top-right corner shows connection status: grey = configured, green = live.</li>
          <li>Team members can be customised in Settings — changes sync automatically.</li>
        </ul>
      </section>

      <section class="about-section">
        <h3>Session Data</h3>
        <ul>
          <li>Session data is cached locally and <strong>auto-refreshes after 48 hours</strong>.</li>
          <li>You can force a refresh at any time via <strong>⚙ Settings → Load Sessions</strong>.</li>
          <li>The data endpoint can also be changed in Settings if needed.</li>
        </ul>
      </section>

      <section class="about-section">
        <h3>Other Features</h3>
        <ul>
          <li>Toggle <strong>light/dark mode</strong> with the ☀️/🌙 button in the top-right nav.</li>
          <li>Export your team's preferences as JSON from Settings.</li>
          <li>Have a bug or idea? Use the <a href="https://github.com/lloydlentz/slate-session-planner-claude/issues" target="_blank" rel="noopener">Feedback</a> link in the nav.</li>
        </ul>
      </section>
    </div>`;
}

function renderSettingsView() {
  renderSettings(views.settings, {
    onTeamSaved: (team) => {
      rebuildPillGroup('filter-member', team);
      if (activeView === 'sessions') renderSessionsView();
      if (getState().teamCode) pushTeamMembers(team);
    },
    onSessionsLoaded: (sessions) => {
      allSessions = sessions;
      rebuildPillGroup('filter-type', getSessionTypes(sessions));
      renderSessionsView();
    },
    onTeamCodeChanged: (code) => {
      setState({ teamCode: code ?? '' });
      if (code) {
        initSyncIfReady();
      } else {
        setSyncHandlers(null);
        if (unsubscribeSync) { unsubscribeSync(); unsubscribeSync = null; }
        updateSyncDot('hidden');
      }
      renderSettingsView();
    },
    onThemeChange: (theme) => {
      setState(s => ({ ...s, theme }));
      applyTheme(theme);
      renderSettingsView();
    },
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
  if (a.dataset.view) a.addEventListener('click', e => { e.preventDefault(); showView(a.dataset.view); });
});

// Theme toggle button in nav
document.getElementById('theme-toggle-btn').addEventListener('click', () => {
  const current = getState().theme ?? 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  setState(s => ({ ...s, theme: next }));
  applyTheme(next);
  if (activeView === 'settings') renderSettingsView();
});

// View mode toggle
document.getElementById('view-mode-toggle').querySelectorAll('.view-mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    setState(s => ({ ...s, sessionView: btn.dataset.mode }));
    document.querySelectorAll('.view-mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === btn.dataset.mode));
    if (activeView === 'sessions') renderSessionsView();
  });
});

async function initSyncIfReady() {
  const s = getState();
  if (!s.teamCode) return;
  if (syncInitInProgress) return;
  syncInitInProgress = true;
  if (unsubscribeSync) { unsubscribeSync(); unsubscribeSync = null; }
  updateSyncDot('configured');
  try {
    initSync(getClient(), s.teamCode);
    const [prefRows, noteRows, remoteMembers] = await Promise.all([fetchAllPreferences(), fetchAllNotes(), fetchTeamMembers()]);
    loadRemoteState(prefRows, noteRows);
    if (remoteMembers && remoteMembers.length > 0) {
      setState(s => ({ ...s, team: remoteMembers }));
      rebuildPillGroup('filter-member', remoteMembers);
    } else {
      // No team config in Supabase yet — push local members to establish the team
      pushTeamMembers(getState().team);
    }
    setSyncHandlers({ pushPreference, pushNote });
    unsubscribeSync = subscribeToChanges(onRemotePreferenceChange, onRemoteNoteChange, onRemoteTeamChange);
    updateSyncDot('connected');
    renderSessionsView();
    if (activeView === 'schedule') renderScheduleView();
    if (activeView === 'settings') renderSettingsView();
  } catch (err) {
    console.error('Sync init failed:', err);
    updateSyncDot('configured');
  } finally {
    syncInitInProgress = false;
  }
}

function onRemotePreferenceChange(row) {
  loadRemoteState([row], []);
  if (activeView === 'sessions') renderSessionsView();
  if (activeView === 'schedule') renderScheduleView();
}

function onRemoteNoteChange(row) {
  loadRemoteState([], [row]);
  if (activeView === 'sessions') renderSessionsView();
}

function onRemoteTeamChange(members) {
  setState(s => ({ ...s, team: members }));
  rebuildPillGroup('filter-member', members);
  if (activeView === 'sessions') renderSessionsView();
  if (activeView === 'settings') renderSettingsView();
}

// Init
(async () => {
  initSupabase();

  // Apply saved theme
  const savedTheme = getState().theme ?? 'dark';
  applyTheme(savedTheme);

  // Apply saved view mode to toggle buttons
  const savedView = getState().sessionView ?? 'tiles';
  document.querySelectorAll('.view-mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === savedView));

  const state = getState();
  if (state.teamCode) {
    await initSyncIfReady();
  }

  const currentState = getState();
  const cacheAge = currentState.sessionsCachedAt ? Date.now() - currentState.sessionsCachedAt : Infinity;
  const cacheValid = currentState.sessionsCache && cacheAge < CACHE_TTL_MS;

  if (cacheValid) {
    allSessions = currentState.sessionsCache;
    rebuildPillGroup('filter-type', getSessionTypes(allSessions));
    if (currentState.team.length > 0) rebuildPillGroup('filter-member', currentState.team);
    showView('sessions');
  } else {
    fetchInProgress = true;
    showView('sessions');
    const staleMsg = currentState.sessionsCache
      ? `<div class="loading">Session data is over 48 hours old — refreshing…</div>`
      : `<div class="loading">Loading sessions…</div>`;
    views.sessions.innerHTML = staleMsg;
    fetchSessions(currentState.endpoint)
      .then(sessions => {
        fetchInProgress = false;
        setState(s => ({ ...s, sessionsCache: sessions, sessionsCachedAt: Date.now() }));
        allSessions = sessions;
        rebuildPillGroup('filter-type', getSessionTypes(sessions));
        const currentTeam = getState().team;
        if (currentTeam.length > 0) rebuildPillGroup('filter-member', currentTeam);
        renderSessionsView();
      })
      .catch(err => {
        fetchInProgress = false;
        // If refresh fails but we have stale data, fall back to it rather than showing an error
        if (currentState.sessionsCache) {
          allSessions = currentState.sessionsCache;
          rebuildPillGroup('filter-type', getSessionTypes(allSessions));
          if (currentState.team.length > 0) rebuildPillGroup('filter-member', currentState.team);
          renderSessionsView();
        } else {
          views.sessions.innerHTML = `
            <div class="error-msg">Failed to load sessions: ${err.message}</div>
            <div class="empty-state"><h3>Could not load sessions</h3><p>Go to ⚙ Settings to configure the data endpoint and try again.</p></div>`;
        }
      });
  }
})();
