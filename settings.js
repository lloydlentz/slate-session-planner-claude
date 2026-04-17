// Settings panel
import { getState, setState, exportData } from './state.js';
import { fetchSessions } from './data.js';
import { setDisplayName } from './auth.js';

export function renderSettings(container, { onTeamSaved, onSessionsLoaded, onSupabaseSaved, onTeamCodeChanged, onSignOut, currentUser }) {
  const state = getState();

  container.innerHTML = `
    <div class="settings-container">

      <div class="settings-section" id="section-team">
        <div class="settings-section-header">
          <h3>Team Members</h3>
          <span class="toggle">${state.team.length > 0 ? '▶' : '▼'}</span>
        </div>
        <div class="settings-section-body ${state.team.length > 0 ? 'hidden' : ''}">
          <div class="team-list" id="team-list">
            ${renderTeamList(state.team)}
          </div>
          <div class="settings-row">
            <input class="settings-input" id="new-member-input" type="text" placeholder="Add team member name..." />
            <button class="btn" id="add-member-btn">Add</button>
          </div>
          <div class="settings-row">
            <button class="btn" id="save-team-btn">Save Team</button>
          </div>
        </div>
      </div>

      <div class="settings-section" id="section-endpoint">
        <div class="settings-section-header">
          <h3>Session Data</h3>
          <span class="toggle">${state.sessionsCache ? '▶' : '▼'}</span>
        </div>
        <div class="settings-section-body ${state.sessionsCache ? 'hidden' : ''}">
          <div class="settings-row" style="margin-top: 12px;">
            <input class="settings-input" id="endpoint-input" type="url" value="${escHtml(state.endpoint)}" />
          </div>
          <div class="settings-row">
            <button class="btn" id="load-sessions-btn">Load Sessions</button>
          </div>
          <div id="load-status" class="settings-meta">
            ${state.sessionsCachedAt ? `Last loaded: ${new Date(state.sessionsCachedAt).toLocaleString()}` : ''}
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-header">
          <h3>Export Data</h3>
          <span class="toggle">▶</span>
        </div>
        <div class="settings-section-body hidden">
          <div class="settings-row">
            <button class="btn btn-secondary" id="export-btn">Export JSON</button>
          </div>
          <p class="settings-meta">Downloads your team settings and all session preferences as a JSON file.</p>
        </div>
      </div>

      <div class="settings-section" id="section-sync">
        <div class="settings-section-header">
          <h3>Sync & Collaboration</h3>
          <span class="toggle">${state.supabaseUrl ? '▶' : '▼'}</span>
        </div>
        <div class="settings-section-body ${state.supabaseUrl ? 'hidden' : ''}">
          <div class="settings-row" style="flex-direction:column;align-items:flex-start;gap:6px">
            <label class="settings-label" for="supabase-url-input">Supabase Project URL</label>
            <input class="settings-input" id="supabase-url-input" type="url" value="${escHtml(state.supabaseUrl)}" placeholder="https://xxxx.supabase.co" />
          </div>
          <div class="settings-row" style="flex-direction:column;align-items:flex-start;gap:6px">
            <label class="settings-label" for="supabase-key-input">Anon Key</label>
            <input class="settings-input" id="supabase-key-input" type="password" value="${escHtml(state.supabaseAnonKey)}" placeholder="eyJ..." />
          </div>
          <div class="settings-row">
            <button class="btn" id="save-supabase-btn">Save & Connect</button>
          </div>
          <p class="settings-meta" id="supabase-status">${state.supabaseUrl ? '✓ Configured' : 'Enter your Supabase project URL and anon key from the Supabase dashboard.'}</p>
        </div>
      </div>

      ${state.supabaseUrl ? `
      <div class="settings-section" id="section-team-code">
        <div class="settings-section-header">
          <h3>Your Team</h3>
          <span class="toggle">${state.teamCode ? '▶' : '▼'}</span>
        </div>
        <div class="settings-section-body ${state.teamCode ? 'hidden' : ''}">
          ${state.teamCode ? `
            <p class="settings-meta">Team code: <span class="team-code-display">${escHtml(state.teamCode)}</span></p>
            <div class="settings-row">
              <button class="btn btn-secondary" id="copy-team-code-btn">Copy code</button>
              <button class="btn btn-danger" id="leave-team-btn">Leave team</button>
            </div>
          ` : `
            <p class="settings-meta">Have a team code from a colleague?</p>
            <div class="settings-row">
              <input class="settings-input" id="join-code-input" type="text" placeholder="SLATE-XXXXX" />
              <button class="btn" id="join-team-btn">Join team</button>
            </div>
            <p class="settings-meta">Or generate a new code to share with your team:</p>
            <div class="settings-row">
              <button class="btn btn-secondary" id="create-team-btn">Create new team</button>
            </div>
            <p class="settings-meta" id="team-code-status"></p>
          `}
        </div>
      </div>
      ` : ''}

      ${currentUser ? `
      <div class="settings-section" id="section-account">
        <div class="settings-section-header">
          <h3>Account</h3>
          <span class="toggle">▶</span>
        </div>
        <div class="settings-section-body hidden">
          <p class="settings-meta">Signed in as <strong>${escHtml(currentUser.email)}</strong>${currentUser.displayName ? ` · ${escHtml(currentUser.displayName)}` : ''}</p>
          <div class="settings-row">
            <input class="settings-input" id="display-name-input" type="text" value="${escHtml(currentUser.displayName ?? '')}" placeholder="Your display name" />
            <button class="btn" id="save-name-btn">Update name</button>
          </div>
          <div class="settings-row">
            <button class="btn btn-danger" id="sign-out-btn">Sign out</button>
          </div>
          <p class="settings-meta" id="account-status"></p>
        </div>
      </div>
      ` : ''}

    </div>
  `;

  // Attach collapse toggle handlers
  container.querySelectorAll('.settings-section-header').forEach(header => {
    header.addEventListener('click', () => {
      const body = header.nextElementSibling;
      body.classList.toggle('hidden');
      header.querySelector('.toggle').textContent = body.classList.contains('hidden') ? '▶' : '▼';
    });
  });

  // --- Team management ---
  let pendingTeam = [...state.team];

  function refreshTeamList() {
    container.querySelector('#team-list').innerHTML = renderTeamList(pendingTeam);
    attachRemoveHandlers();
  }

  function attachRemoveHandlers() {
    container.querySelectorAll('.remove-member').forEach(btn => {
      btn.addEventListener('click', () => {
        pendingTeam = pendingTeam.filter(m => m !== btn.dataset.member);
        refreshTeamList();
      });
    });
  }

  attachRemoveHandlers();

  container.querySelector('#add-member-btn').addEventListener('click', () => {
    const input = container.querySelector('#new-member-input');
    const name = input.value.trim();
    if (name && !pendingTeam.includes(name)) {
      pendingTeam.push(name);
      refreshTeamList();
    }
    input.value = '';
    input.focus();
  });

  container.querySelector('#new-member-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') container.querySelector('#add-member-btn').click();
  });

  container.querySelector('#save-team-btn').addEventListener('click', () => {
    setState(s => ({ ...s, team: pendingTeam }));
    container.querySelector('#section-team .settings-section-body').classList.add('hidden');
    container.querySelector('#section-team .toggle').textContent = '▶';
    onTeamSaved(pendingTeam);
  });

  // --- Session loading ---
  container.querySelector('#load-sessions-btn').addEventListener('click', async () => {
    const btn = container.querySelector('#load-sessions-btn');
    const status = container.querySelector('#load-status');
    const endpoint = container.querySelector('#endpoint-input').value.trim();
    btn.disabled = true;
    btn.textContent = 'Loading...';
    status.textContent = '';
    try {
      const sessions = await fetchSessions(endpoint);
      setState(s => ({
        ...s,
        endpoint,
        sessionsCache: sessions,
        sessionsCachedAt: Date.now()
      }));
      status.textContent = `Loaded ${sessions.length} sessions at ${new Date().toLocaleString()}`;
      container.querySelector('#section-endpoint .settings-section-body').classList.add('hidden');
      container.querySelector('#section-endpoint .toggle').textContent = '▶';
      onSessionsLoaded(sessions);
    } catch (err) {
      status.textContent = `Error: ${err.message}`;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Load Sessions';
    }
  });

  // --- Export ---
  container.querySelector('#export-btn').addEventListener('click', () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'conference-planner-data.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  // --- Sync & Collaboration ---
  container.querySelector('#save-supabase-btn')?.addEventListener('click', () => {
    const url = container.querySelector('#supabase-url-input').value.trim();
    const key = container.querySelector('#supabase-key-input').value.trim();
    if (!url || !key) {
      container.querySelector('#supabase-status').textContent = 'Please enter both URL and anon key.';
      return;
    }
    setState(s => ({ ...s, supabaseUrl: url, supabaseAnonKey: key }));
    container.querySelector('#supabase-status').textContent = '✓ Saved. Connecting…';
    container.querySelector('#section-sync .settings-section-body').classList.add('hidden');
    container.querySelector('#section-sync .toggle').textContent = '▶';
    onSupabaseSaved(url, key);
  });

  // --- Your Team ---
  container.querySelector('#join-team-btn')?.addEventListener('click', () => {
    const code = container.querySelector('#join-code-input')?.value.trim().toUpperCase();
    if (!code) return;
    onTeamCodeChanged(code);
  });

  container.querySelector('#join-code-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') container.querySelector('#join-team-btn')?.click();
  });

  container.querySelector('#create-team-btn')?.addEventListener('click', () => {
    const code = 'SLATE-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    onTeamCodeChanged(code);
  });

  container.querySelector('#copy-team-code-btn')?.addEventListener('click', () => {
    const code = getState().teamCode;
    navigator.clipboard.writeText(code).catch(() => {});
    const btn = container.querySelector('#copy-team-code-btn');
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy code'; }, 2000);
  });

  container.querySelector('#leave-team-btn')?.addEventListener('click', () => {
    onTeamCodeChanged(null);
  });

  // --- Account ---
  container.querySelector('#save-name-btn')?.addEventListener('click', async () => {
    const name = container.querySelector('#display-name-input')?.value.trim();
    if (!name) return;
    const btn = container.querySelector('#save-name-btn');
    const status = container.querySelector('#account-status');
    btn.disabled = true;
    const { error } = await setDisplayName(name);
    btn.disabled = false;
    if (error) { status.textContent = `Error: ${error}`; return; }
    setState({ myName: name });
    status.textContent = '✓ Name updated';
  });

  container.querySelector('#sign-out-btn')?.addEventListener('click', async () => {
    const btn = container.querySelector('#sign-out-btn');
    btn.disabled = true;
    await onSignOut();
    btn.disabled = false;
  });
}

function renderTeamList(team) {
  if (team.length === 0) return '<p class="settings-meta">No team members added yet.</p>';
  return team.map(m => `
    <div class="team-member-row">
      <span>${escHtml(m)}</span>
      <button class="remove-member" data-member="${escHtml(m)}" title="Remove">×</button>
    </div>
  `).join('');
}

function escHtml(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
