/* ═══════════════════════════════════════════════════════════
   SeatG33k – Smart Seat Allocation Platform
   app.js
   ═══════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────
   MOCK DATA
   ⚠️  BACKEND INTEGRATION POINTS ARE MARKED THROUGHOUT
   Replace mock arrays with fetch() calls to your Flask API.
     GET  /api/sessions          → SESSION_DATA
     GET  /api/participants      → PARTICIPANTS
     POST /api/login             → auth
     GET  /api/participants/:id  → single participant
───────────────────────────────────────────────────────── */

// ── Sessions ──────────────────────────────────────────────
// BACKEND: Replace SESSION_DATA with:
//   const res  = await fetch('/api/sessions');
//   const data = await res.json();
//   SESSION_DATA = data.sessions;
const SESSION_DATA = [
  {
    id: 1, name: 'Morning',   time: '09:00 – 10:30', capacity: 20, assigned: 0,
    deptCounts: { 'Division A': 0, 'Division B': 0, 'Division C': 0 }
  },
  {
    id: 2, name: 'Midday',    time: '11:00 – 12:30', capacity: 20, assigned: 0,
    deptCounts: { 'Division A': 0, 'Division B': 0, 'Division C': 0 }
  },
  {
    id: 3, name: 'Afternoon', time: '13:00 – 14:30', capacity: 20, assigned: 0,
    deptCounts: { 'Division A': 0, 'Division B': 0, 'Division C': 0 }
  },
];

// ── Department per-session limits (mirrors DB constraint) ──
const DEPT_LIMITS = {
  'Division A': 8,
  'Division B': 6,
  'Division C': 6,
};

// ── Participants ───────────────────────────────────────────
// BACKEND: Replace PARTICIPANTS with:
//   const res  = await fetch('/api/participants');
//   const data = await res.json();
//   PARTICIPANTS = data.participants;
const PARTICIPANTS = generateParticipants();

function generateParticipants() {
  const firstNames = [
    'Alice','Bob','Carol','David','Emma','Frank','Grace','Henry','Irene','James',
    'Karen','Leo','Mia','Noah','Olivia','Paul','Quinn','Rachel','Sam','Tina',
    'Uma','Victor','Wendy','Xander','Yara','Zoe','Aaron','Beth','Cole','Diana',
  ];
  const lastNames = [
    'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Wilson','Moore',
    'Taylor','Anderson','Thomas','Jackson','White','Harris','Martin','Thompson','Robinson','Clark',
    'Lewis','Walker','Hall','Allen','Young','King','Wright','Scott','Adams','Baker',
  ];
  const sessions = ['Morning', 'Midday', 'Afternoon'];
  const list = [];
  let id = 1001;

  // Division A: 24 participants (8 per session)
  for (let s = 0; s < 3; s++) {
    for (let i = 0; i < 8; i++) {
      const fi = (id - 1001) % firstNames.length;
      const li = (id - 1001) % lastNames.length;
      list.push({
        id: `P${id}`, participantId: id,
        fname: firstNames[fi], lname: lastNames[li],
        email: `${firstNames[fi].toLowerCase()}.${lastNames[li].toLowerCase()}@diva.com`,
        contact: `07${Math.floor(10000000 + Math.random() * 89999999)}`,
        department: 'Division A',
        session: sessions[s],
      });
      id++;
    }
  }

  // Division B: 18 participants (6 per session)
  for (let s = 0; s < 3; s++) {
    for (let i = 0; i < 6; i++) {
      const fi = (id - 1001) % firstNames.length;
      const li = (id - 1001) % lastNames.length;
      list.push({
        id: `P${id}`, participantId: id,
        fname: firstNames[fi], lname: lastNames[li],
        email: `${firstNames[fi].toLowerCase()}.${lastNames[li].toLowerCase()}@divb.com`,
        contact: `07${Math.floor(10000000 + Math.random() * 89999999)}`,
        department: 'Division B',
        session: sessions[s],
      });
      id++;
    }
  }

  // Division C: 18 participants (6 per session)
  for (let s = 0; s < 3; s++) {
    for (let i = 0; i < 6; i++) {
      const fi = (id - 1001) % firstNames.length;
      const li = (id - 1001) % lastNames.length;
      list.push({
        id: `P${id}`, participantId: id,
        fname: firstNames[fi], lname: lastNames[li],
        email: `${firstNames[fi].toLowerCase()}.${lastNames[li].toLowerCase()}@divc.com`,
        contact: `07${Math.floor(10000000 + Math.random() * 89999999)}`,
        department: 'Division C',
        session: sessions[s],
      });
      id++;
    }
  }

  return list;
}

// ── Users / Auth ───────────────────────────────────────────
// BACKEND: POST /api/login { email, password, role } → { token, user }
// Remove this array and replace the lookup in handleLogin() with a fetch call.
const USERS = [
  { email: 'manager@seatg33k.com', password: 'admin123', role: 'manager', name: 'Admin Manager' },
  // Map participant emails → credentials
  ...PARTICIPANTS.map(p => ({
    email: p.email, password: 'pass123', role: 'participant', participantId: p.participantId,
  })),
  // Quick demo shortcut
  { email: 'alice.smith@div.com', password: 'pass123', role: 'participant', participantId: 1001 },
];


/* ─────────────────────────────────────────────────────────
   APPLICATION STATE
───────────────────────────────────────────────────────── */
let currentRole         = 'manager';
let loggedInUser        = null;
let selectedParticipant = null;
let filteredParticipants = [...PARTICIPANTS];


/* ─────────────────────────────────────────────────────────
   INITIALISATION
   Compute session counts from participant data.
   When integrated: session counts come from the API directly.
───────────────────────────────────────────────────────── */
(function initSessionCounts() {
  PARTICIPANTS.forEach(p => {
    if (!p.session) return;
    const sess = SESSION_DATA.find(s => s.name === p.session);
    if (sess) {
      sess.assigned++;
      sess.deptCounts[p.department] = (sess.deptCounts[p.department] || 0) + 1;
    }
  });
})();


/* ─────────────────────────────────────────────────────────
   PAGE ROUTING
───────────────────────────────────────────────────────── */
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  window.scrollTo(0, 0);
}


/* ─────────────────────────────────────────────────────────
   LOGIN PAGE
───────────────────────────────────────────────────────── */

/**
 * Toggle the role selector (Manager / Participant).
 * @param {string} role - 'manager' | 'participant'
 */
function setRole(role) {
  currentRole = role;
  document.querySelectorAll('.login-role-btn').forEach((btn, i) => {
    const isActive = (i === 0 && role === 'manager') || (i === 1 && role === 'participant');
    btn.classList.toggle('active', isActive);
  });
}

/**
 * Attempt login with the form values.
 * BACKEND INTEGRATION: Replace the USERS.find() block below with a fetch() call.
 */
function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const pass  = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';

  if (!email || !pass) {
    errEl.textContent = 'Please enter your email and password.';
    return;
  }

  // ─ BACKEND INTEGRATION POINT ───────────────────────────
  // Replace the block below with:
  //
  //   try {
  //     const res  = await fetch('/api/login', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ email, password: pass, role: currentRole }),
  //     });
  //     const data = await res.json();
  //     if (!res.ok) { errEl.textContent = data.message; return; }
  //     loggedInUser = data.user;
  //     localStorage.setItem('token', data.token);
  //     redirectAfterLogin(data.user);
  //   } catch (err) {
  //     errEl.textContent = 'Server error. Please try again.';
  //   }
  // ────────────────────────────────────────────────────────

  const user = USERS.find(u => u.email === email && u.password === pass);

  if (!user) {
    errEl.textContent = '✕ Invalid email or password.';
    return;
  }
  if (user.role !== currentRole) {
    errEl.textContent = `✕ This account is not a ${currentRole} account.`;
    return;
  }

  loggedInUser = user;
  redirectAfterLogin(user);
}

/**
 * Route the user to the correct page after successful login.
 * @param {object} user
 */
function redirectAfterLogin(user) {
  if (user.role === 'manager') {
    document.getElementById('managerName').textContent = user.name;
    renderSessionCards();
    renderTable(PARTICIPANTS);
    updateStats();
    showPage('manager');
    toast('Welcome back, ' + user.name + '!', 'success');
  } else {
    // BACKEND: fetch(`/api/participants/${user.participantId}`) then populateParticipantPage(data)
    const p = PARTICIPANTS.find(px => px.participantId === user.participantId)
           || PARTICIPANTS[0]; // fallback for demo only
    populateParticipantPage(p);
    showPage('participant');
    toast('Welcome, ' + p.fname + '!', 'success');
  }
}

/** Clear the login form. */
function clearLogin() {
  document.getElementById('loginEmail').value    = '';
  document.getElementById('loginPass').value     = '';
  document.getElementById('loginError').textContent = '';
}

/** Log out and return to the login page. */
function logout() {
  loggedInUser        = null;
  selectedParticipant = null;
  clearLogin();
  showPage('login');
  toast('Logged out successfully.', 'success');
}


/* ─────────────────────────────────────────────────────────
   MANAGER DASHBOARD – SESSION CARDS
───────────────────────────────────────────────────────── */

/**
 * Render the three session capacity cards.
 * BACKEND: SESSION_DATA comes from GET /api/sessions
 */
function renderSessionCards() {
  const container = document.getElementById('sessionCards');
  container.innerHTML = '';

  SESSION_DATA.forEach(sess => {
    const avail      = sess.capacity - sess.assigned;
    const pct        = (sess.assigned / sess.capacity) * 100;
    const isFull     = avail === 0;
    const isAlmost   = avail <= 4 && !isFull;
    const fillClass  = isFull ? 'full' : isAlmost ? 'almost' : '';
    const badgeClass = isFull ? 'full' : isAlmost ? 'almost' : '';
    const badgeText  = isFull ? 'FULL' : `${avail} seats left`;

    const deptChips = Object.entries(sess.deptCounts)
      .map(([dept, count]) => {
        const letter = dept.split(' ')[1];
        const limit  = DEPT_LIMITS[dept];
        return `<span class="dept-chip ${letter}" title="${dept}: ${count}/${limit}">
                  ${dept.replace('Division', '')} ${count}/${limit}
                </span>`;
      }).join('');

    container.innerHTML += `
      <div class="session-card">
        <div class="session-card-header">
          <div>
            <div class="session-name">${sess.name}</div>
            <div class="session-time">${sess.time}</div>
          </div>
          <div class="session-seats-badge ${badgeClass}">${badgeText}</div>
        </div>
        <div class="progress-bar">
          <div class="progress-fill ${fillClass}" style="width:${pct}%"></div>
        </div>
        <div style="font-size:12px;color:var(--grey);">${sess.assigned} / ${sess.capacity} participants</div>
        <div class="session-dept-row">${deptChips}</div>
      </div>`;
  });
}


/* ─────────────────────────────────────────────────────────
   MANAGER DASHBOARD – STATS
───────────────────────────────────────────────────────── */

/**
 * Update the top stat cards.
 * BACKEND: These totals come from the API response, e.g. data.stats.assigned
 */
function updateStats() {
  const assigned = PARTICIPANTS.filter(p => p.session).length;
  document.getElementById('statAssigned').textContent   = assigned;
  document.getElementById('statUnassigned').textContent = PARTICIPANTS.length - assigned;
}


/* ─────────────────────────────────────────────────────────
   MANAGER DASHBOARD – PARTICIPANT TABLE
───────────────────────────────────────────────────────── */

/**
 * Render the participant table rows.
 * @param {Array} list - Array of participant objects to display.
 */
function renderTable(list) {
  const tbody  = document.getElementById('participantTableBody');
  const noRes  = document.getElementById('noResults');
  document.getElementById('tableCount').textContent = `(${list.length} shown)`;

  if (list.length === 0) {
    tbody.innerHTML = '';
    noRes.style.display = 'block';
    return;
  }
  noRes.style.display = 'none';

  tbody.innerHTML = list.map(p => {
    const deptLetter = p.department.split(' ')[1];
    const sessHtml   = p.session
      ? `<span class="badge-session">${p.session}</span>`
      : `<span class="badge-session unassigned">Unassigned</span>`;
    const isSelected = selectedParticipant && selectedParticipant.id === p.id;

    return `
      <tr onclick="selectParticipant('${p.id}')" ${isSelected ? 'class="selected"' : ''}>
        <td style="color:var(--grey);font-size:13px;">${p.id}</td>
        <td style="font-weight:500;">${p.fname} ${p.lname}</td>
        <td style="color:var(--grey);font-size:13px;">${p.email}</td>
        <td><span class="badge-dept ${deptLetter}">${p.department}</span></td>
        <td>${sessHtml}</td>
        <td style="color:var(--grey);font-size:13px;">${p.contact}</td>
      </tr>`;
  }).join('');
}

/**
 * Apply search and filter criteria to the participant list.
 * BACKEND INTEGRATION: Replace the filter logic below with:
 *   const q    = document.getElementById('searchInput').value.trim();
 *   const dept = document.getElementById('deptFilter').value;
 *   const sess = document.getElementById('sessionFilter').value;
 *   const res  = await fetch(`/api/participants?search=${q}&dept=${dept}&session=${sess}`);
 *   const data = await res.json();
 *   renderTable(data.participants);
 */
function applyFilters() {
  const q    = document.getElementById('searchInput').value.trim().toLowerCase();
  const dept = document.getElementById('deptFilter').value;
  const sess = document.getElementById('sessionFilter').value;

  filteredParticipants = PARTICIPANTS.filter(p => {
    const fullName  = `${p.fname} ${p.lname}`.toLowerCase();
    const matchQ    = !q    || fullName.includes(q) || p.email.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
    const matchDept = !dept || p.department === dept;
    const matchSess = !sess || (sess === 'Unassigned' ? !p.session : p.session === sess);
    return matchQ && matchDept && matchSess;
  });

  renderTable(filteredParticipants);
}

/**
 * Select a participant row and show their detail panel.
 * BACKEND INTEGRATION: Replace PARTICIPANTS.find() with:
 *   const res  = await fetch(`/api/participants/${pid}`);
 *   const data = await res.json();
 *   showDetail(data.participant);
 * @param {string} pid - Participant ID string, e.g. "P1001"
 */
function selectParticipant(pid) {
  const p = PARTICIPANTS.find(x => x.id === pid);
  if (!p) return;

  selectedParticipant = p;
  applyFilters();        // re-render to highlight selected row
  showDetail(p);
}

/**
 * Populate and show the participant detail panel below the table.
 * @param {object} p - Participant object.
 */
function showDetail(p) {
  const panel  = document.getElementById('detailPanel');
  const grid   = document.getElementById('detailGrid');
  const sessEl = document.getElementById('detailSession');

  const deptLetter = p.department.split(' ')[1];
  const sessInfo   = p.session ? SESSION_DATA.find(s => s.name === p.session) : null;

  // Personal info fields
  grid.innerHTML = `
    <div class="detail-field">
      <label>Full Name</label>
      <div class="val">${p.fname} ${p.lname}</div>
    </div>
    <div class="detail-field">
      <label>Participant ID</label>
      <div class="val">${p.id}</div>
    </div>
    <div class="detail-field">
      <label>Department</label>
      <div class="val"><span class="badge-dept ${deptLetter}">${p.department}</span></div>
    </div>
    <div class="detail-field">
      <label>Email Address</label>
      <div class="val">${p.email}</div>
    </div>
    <div class="detail-field">
      <label>Contact Number</label>
      <div class="val">${p.contact}</div>
    </div>`;

  // Session allocation info
  if (sessInfo) {
    const deptCount = sessInfo.deptCounts[p.department] || 0;
    const deptLimit = DEPT_LIMITS[p.department];
    sessEl.innerHTML = `
      <div class="detail-session-card assigned">
        <div class="s-label">Assigned Session</div>
        <div class="s-val">${p.session}</div>
        <div class="s-sub">${sessInfo.time}</div>
      </div>
      <div class="detail-session-card">
        <div class="s-label">Session Capacity</div>
        <div class="s-val">${sessInfo.assigned} / ${sessInfo.capacity}</div>
        <div class="s-sub">${sessInfo.capacity - sessInfo.assigned} seats remaining</div>
      </div>
      <div class="detail-session-card">
        <div class="s-label">${p.department} Quota</div>
        <div class="s-val">${deptCount} / ${deptLimit}</div>
        <div class="s-sub">Per-session dept. limit</div>
      </div>`;
  } else {
    sessEl.innerHTML = `
      <div class="detail-session-card">
        <div class="s-label">Session Status</div>
        <div class="s-val" style="color:var(--grey);font-size:16px;">Not Assigned</div>
        <div class="s-sub">Awaiting allocation</div>
      </div>`;
  }

  panel.classList.add('visible');
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/** Close and hide the participant detail panel. */
function closeDetail() {
  document.getElementById('detailPanel').classList.remove('visible');
  selectedParticipant = null;
  applyFilters();
}


/* ─────────────────────────────────────────────────────────
   PARTICIPANT PAGE
───────────────────────────────────────────────────────── */

/**
 * Fill the participant self-view page with their data.
 * BACKEND INTEGRATION: Replace the direct object access with:
 *   const res  = await fetch(`/api/participants/${p.participantId}`, {
 *     headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
 *   });
 *   const data = await res.json();
 *   fillParticipantUI(data.participant);
 * @param {object} p - Participant object.
 */
function populateParticipantPage(p) {
  const initials   = `${p.fname[0]}${p.lname[0]}`;
  const deptLetter = p.department.split(' ')[1];
  const sessInfo   = p.session ? SESSION_DATA.find(s => s.name === p.session) : null;

  // Header section
  document.getElementById('participantFirstName').textContent = p.fname;
  document.getElementById('participantAvatar').textContent    = initials;
  document.getElementById('participantFullName').textContent  = `${p.fname} ${p.lname}`;
  document.getElementById('participantIdLabel').textContent   = `Participant ID: ${p.id}`;

  const badge = document.getElementById('participantDeptBadge');
  badge.textContent = p.department;
  badge.className   = `badge-dept p-dept ${deptLetter}`;

  // Info grid
  document.getElementById('pEmail').textContent   = p.email;
  document.getElementById('pContact').textContent = p.contact;
  document.getElementById('pDept').textContent    = p.department;

  // Session banner
  const banner      = document.getElementById('participantSessionBanner');
  const icon        = document.getElementById('participantSessionIcon');
  const sessEl      = document.getElementById('participantSession');
  const timeEl      = document.getElementById('participantTime');
  const pill        = document.getElementById('participantStatusPill');
  const pillText    = document.getElementById('participantStatusText');
  const statusField = document.getElementById('pStatus');

  if (sessInfo) {
    const sessionIcons = { Morning: '🌅', Midday: '☀️', Afternoon: '🌇' };
    banner.className      = 'session-banner assigned';
    icon.textContent      = sessionIcons[sessInfo.name] || '📅';
    sessEl.textContent    = sessInfo.name;
    timeEl.textContent    = sessInfo.time;
    pill.className        = 'status-pill confirmed';
    pillText.textContent  = '✓ Confirmed';
    statusField.textContent = 'Confirmed';
  } else {
    banner.className      = 'session-banner unassigned';
    icon.textContent      = '⏳';
    sessEl.textContent    = 'Not yet assigned';
    timeEl.textContent    = 'Awaiting allocation by manager';
    pill.className        = 'status-pill pending';
    pillText.textContent  = '⏳ Pending';
    statusField.textContent = 'Pending';
  }
}


/* ─────────────────────────────────────────────────────────
   TOAST NOTIFICATIONS
───────────────────────────────────────────────────────── */

/**
 * Show a transient toast notification.
 * @param {string} msg  - Message to display.
 * @param {string} type - 'success' | 'error' | 'warning'
 */
function toast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  const el        = document.createElement('div');
  const icons     = { success: '✓', error: '✕', warning: '⚠' };

  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type] || 'ℹ'}</span> ${msg}`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3100);
}