// app.js
import { getState, setState } from './state.js';
import { getSessionTypes, fetchSessions } from './data.js';
import { renderSettings } from './settings.js';
import { renderSchedule } from './schedule.js';
import { renderSessions } from './sessions.js';
import { initSupabase, sendMagicLink, getSession, onAuthStateChange, getDisplayName, setDisplayName, signOut, getClient } from './auth.js';
import { initSync, fetchAllPreferences, fetchAllNotes, pushPreference, pushNote, subscribeToChanges } from './sync.js';
import { setPreference, setSyncHandlers, loadRemoteState } from './state.js';

const views = {
  sessions: document.getElementById('view-sessions'),
  schedule: document.getElementById('view-schedule'),
  settings: document.getElementById('view-settings'),
};

const filterStrip = document.getElementById('filter-strip');

let allSessions = [];
let activeView = 'sessions';
let fetchInProgress = false;

let pendingAction = null;       // { sessionId, member, newStatus } waiting for auth
let isAuthenticated = false;   // tracks current auth state
let unsubscribeSync = null;    // cleanup fn for realtime subscription
let syncInitInProgress = false;
let currentUserEmail = '';

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

function updateSyncDot(mode) { // 'hidden' | 'configured' | 'connected'
  const dot = document.getElementById('sync-dot');
  if (mode === 'hidden') {
    dot.className = 'sync-dot hidden';
  } else if (mode === 'connected') {
    dot.className = 'sync-dot connected';
    dot.title = 'Syncing with team';
  } else {
    dot.className = 'sync-dot configured';
    dot.title = 'Sign in to sync';
  }
}

function showSetupModal(step) {
  // Determine which step to show if not specified
  if (!step) {
    if (!isAuthenticated) step = 'email';
    else if (!getState().myName) step = 'name';
    else step = 'team';
  }
  const modal = document.getElementById('setup-modal');
  modal.querySelectorAll('.setup-step').forEach(s => s.classList.add('hidden'));
  const stepEl = modal.querySelector(`.setup-step[data-step="${step}"]`);
  if (stepEl) stepEl.classList.remove('hidden');
  modal.classList.remove('hidden');
  const firstFocusable = modal.querySelector('input:not([disabled]), button:not([disabled])');
  (firstFocusable ?? modal).focus();
}

function hideSetupModal() {
  document.getElementById('setup-modal').classList.add('hidden');
  pendingAction = null;
}

function renderSessionsView() {
  if (fetchInProgress) return;
  renderSessions(views.sessions, allSessions, getActiveFilters(), (sessionId, member, newStatus) => {
    const s = getState();
    // Only require auth if Supabase is configured
    if (s.supabaseUrl && (!s.myName || !s.teamCode)) {
      pendingAction = { sessionId, member, newStatus };
      showSetupModal();
      return;
    }
    setPreference(sessionId, member, newStatus);
    renderSessionsView();
    if (activeView === 'schedule') renderScheduleView();
  });
}

function renderScheduleView() {
  const memberFilter = getActiveFilter('filter-member');
  renderSchedule(views.schedule, allSessions, memberFilter);
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
    },
    onSupabaseSaved: (url, key) => {
      try {
        initSupabase(url, key);
        updateSyncDot('configured');
        onAuthStateChange(handleAuthStateChange);
      } catch (err) {
        console.error('Supabase init failed:', err);
      }
    },
    onTeamCodeChanged: (code) => {
      setState({ teamCode: code ?? '' });
      if (code) {
        initSyncIfReady();
      } else {
        // Leaving team: tear down sync
        setSyncHandlers(null);
        if (unsubscribeSync) { unsubscribeSync(); unsubscribeSync = null; }
        updateSyncDot('configured');
      }
      renderSettingsView(); // re-render to show updated team section
    },
    onSignOut: async () => {
      await signOut();
      // handleAuthStateChange will fire and handle cleanup
    },
    currentUser: isAuthenticated ? { email: currentUserEmail, displayName: getState().myName } : null,
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

async function initSyncIfReady() {
  const s = getState();
  if (!s.supabaseUrl || !s.supabaseAnonKey || !s.teamCode || !s.myName || !isAuthenticated) return;
  if (syncInitInProgress) return;
  syncInitInProgress = true;
  if (unsubscribeSync) { unsubscribeSync(); unsubscribeSync = null; }
  try {
    initSync(getClient(), s.teamCode);
    const [prefRows, noteRows] = await Promise.all([fetchAllPreferences(), fetchAllNotes()]);
    loadRemoteState(prefRows, noteRows);
    setSyncHandlers({ pushPreference, pushNote });
    unsubscribeSync = subscribeToChanges(onRemotePreferenceChange, onRemoteNoteChange);
    updateSyncDot('connected');
    // Only re-render if modal is not open
    if (document.getElementById('setup-modal').classList.contains('hidden')) {
      renderSessionsView();
      if (activeView === 'schedule') renderScheduleView();
    }
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

async function completeSetup() {
  hideSetupModal();
  await initSyncIfReady();
  if (pendingAction) {
    const { sessionId, member, newStatus } = pendingAction;
    pendingAction = null;
    setPreference(sessionId, member, newStatus);
    renderSessionsView();
    if (activeView === 'schedule') renderScheduleView();
  }
}

// Modal button handlers
// Backdrop click
document.getElementById('setup-modal').addEventListener('click', e => {
  if (e.target.id === 'setup-modal') hideSetupModal();
});

// Cancel (email step)
document.getElementById('setup-cancel-btn').addEventListener('click', hideSetupModal);

// Cancel (sent step)
document.getElementById('setup-cancel-from-sent-btn').addEventListener('click', hideSetupModal);

// Send magic link
document.getElementById('setup-send-btn').addEventListener('click', async () => {
  const email = document.getElementById('setup-email-input').value.trim();
  if (!email) return;
  const btn = document.getElementById('setup-send-btn');
  btn.disabled = true;
  btn.textContent = 'Sending…';
  const { error } = await sendMagicLink(email);
  btn.disabled = false;
  btn.textContent = 'Send sign-in link';
  if (error) { alert(`Could not send link: ${error}`); return; }
  document.getElementById('setup-sent-email').textContent = email;
  showSetupModal('sent');
});

// Set display name
document.getElementById('setup-name-btn').addEventListener('click', async () => {
  const name = document.getElementById('setup-name-input').value.trim();
  if (!name) return;
  const btn = document.getElementById('setup-name-btn');
  btn.disabled = true;
  const { error } = await setDisplayName(name);
  btn.disabled = false;
  if (error) { alert(`Could not save name: ${error}`); return; }
  setState({ myName: name });
  showSetupModal('team');
});

// Join team
document.getElementById('setup-join-btn').addEventListener('click', async () => {
  const code = document.getElementById('setup-team-code-input').value.trim().toUpperCase();
  if (!code) return;
  setState({ teamCode: code });
  await completeSetup();
});

// Create new team
document.getElementById('setup-create-btn').addEventListener('click', async () => {
  const code = 'SLATE-' + Math.random().toString(36).substring(2, 7).toUpperCase();
  setState({ teamCode: code });
  document.getElementById('setup-team-code-display').textContent = code;
  showSetupModal('team-created');
  // Don't completeSetup yet — user still needs to click Done
  initSyncIfReady(); // fire-and-forget
});

// Copy team code
document.getElementById('setup-copy-code-btn').addEventListener('click', () => {
  const code = document.getElementById('setup-team-code-display').textContent;
  navigator.clipboard.writeText(code).catch(() => {});
  document.getElementById('setup-copy-code-btn').textContent = 'Copied!';
  setTimeout(() => { document.getElementById('setup-copy-code-btn').textContent = 'Copy code'; }, 2000);
});

// Done (team-created step)
document.getElementById('setup-done-btn').addEventListener('click', completeSetup);

// Escape key dismisses modal
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !document.getElementById('setup-modal').classList.contains('hidden')) {
    hideSetupModal();
  }
});

// Enter key submits email / team-code inputs
document.getElementById('setup-email-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('setup-send-btn').click();
});
document.getElementById('setup-team-code-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('setup-join-btn').click();
});

// Auth state change callback (registered after initSupabase in the init block)
async function handleAuthStateChange(event, session) {
  isAuthenticated = !!session;
  if (!session) {
    // User signed out
    currentUserEmail = '';
    setSyncHandlers(null);
    pendingAction = null;
    if (unsubscribeSync) { unsubscribeSync(); unsubscribeSync = null; }
    setState({ myName: '' });
    updateSyncDot('configured');
    return;
  }
  // User signed in — read display name from session metadata
  currentUserEmail = session.user?.email ?? '';
  const displayName = session.user?.user_metadata?.display_name;
  if (displayName && !getState().myName) {
    setState({ myName: displayName });
  }
  // Advance modal if it's open
  const modal = document.getElementById('setup-modal');
  if (!modal.classList.contains('hidden')) {
    const st = getState();
    if (!st.myName) {
      // Pre-fill name input with email prefix
      const nameInput = document.getElementById('setup-name-input');
      if (!nameInput.value && session.user?.email) {
        nameInput.value = session.user.email.split('@')[0];
      }
      showSetupModal('name');
    } else if (!st.teamCode) {
      showSetupModal('team');
    } else {
      await completeSetup();
    }
  }
  await initSyncIfReady();
}

// Init
(async () => {
  const state = getState();

  // Init Supabase if credentials are configured
  if (state.supabaseUrl && state.supabaseAnonKey) {
    updateSyncDot('configured');
    initSupabase(state.supabaseUrl, state.supabaseAnonKey);
    // Register auth state change handler now that Supabase client exists
    onAuthStateChange(handleAuthStateChange);
    // Also check current session immediately
    const result = await getSession();
    const data = result?.data;
    if (data?.session) {
      isAuthenticated = true;
      const displayName = data.session.user?.user_metadata?.display_name;
      if (displayName && !getState().myName) {
        setState({ myName: displayName });
      }
      if (getState().teamCode) {
        await initSyncIfReady();
      }
    }
  }

  // Restore sessions from cache or fetch
  const currentState = getState();
  if (currentState.sessionsCache) {
    allSessions = currentState.sessionsCache;
    rebuildPillGroup('filter-type', getSessionTypes(allSessions));
    if (currentState.team.length > 0) rebuildPillGroup('filter-member', currentState.team);
    showView('sessions');
  } else {
    fetchInProgress = true;
    showView('sessions');
    views.sessions.innerHTML = `<div class="loading">Loading sessions…</div>`;
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
        views.sessions.innerHTML = `
          <div class="error-msg">Failed to load sessions: ${err.message}</div>
          <div class="empty-state"><h3>Could not load sessions</h3><p>Go to ⚙ Settings to configure the data endpoint and try again.</p></div>`;
      });
  }
})();
