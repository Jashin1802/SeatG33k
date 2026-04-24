const API_BASE = "";
let managerParticipants = [];
let filteredManagerParticipants = [];

function getCurrentRoleFromUI() {
  const activeBtn = document.querySelector(".login-role-btn.active");
  if (!activeBtn) return "manager";
  return activeBtn.textContent.toLowerCase().includes("participant") ? "participant" : "manager";
}

async function apiRequest(path, method = "GET", payload = null) {
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (payload) options.body = JSON.stringify(payload);

  const response = await fetch(`${API_BASE}${path}`, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}

window.setRole = function setRole(role) {
  const buttons = document.querySelectorAll(".login-role-btn");
  buttons.forEach((button) => {
    const isParticipant = button.textContent.toLowerCase().includes("participant");
    const shouldBeActive = (role === "participant" && isParticipant) || (role === "manager" && !isParticipant);
    button.classList.toggle("active", shouldBeActive);
  });
};

window.clearLogin = function clearLogin() {
  const email = document.getElementById("loginEmail");
  const pass = document.getElementById("loginPass");
  const error = document.getElementById("loginError");
  if (email) email.value = "";
  if (pass) pass.value = "";
  if (error) error.textContent = "";
};

window.handleLogin = async function handleLogin() {
  const emailEl = document.getElementById("loginEmail");
  const passEl = document.getElementById("loginPass");
  const errEl = document.getElementById("loginError");
  if (!emailEl || !passEl || !errEl) return;

  const email = emailEl.value.trim().toLowerCase();
  const password = passEl.value;
  const role = getCurrentRoleFromUI();

  if (!email || !password) {
    errEl.textContent = "Please enter your email and password.";
    return;
  }

  try {
    const endpoint = role === "participant" ? "/api/auth/participant/login" : "/api/auth/login";
    const result = await apiRequest(endpoint, "POST", { email_address: email, password });
    localStorage.setItem("seatg33k_user", JSON.stringify({ role, data: result.data }));
    window.location.href = role === "participant" ? "/participant" : "/manager";
  } catch (error) {
    errEl.textContent = error.message;
  }
};

window.logout = function logout() {
  localStorage.removeItem("seatg33k_user");
  window.location.href = "/login";
};

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

async function buildParticipantDivisionMap() {
  const map = new Map();
  const divisionsRes = await apiRequest("/api/divisions?page=1&page_size=100");
  for (const division of divisionsRes.data || []) {
    const divParticipants = await apiRequest(`/api/divisions/${division.div_id}/participants`);
    for (const participant of divParticipants.data || []) {
      map.set(participant.participant_id, {
        division_id: division.div_id,
        division_name: division.name,
      });
    }
  }
  return map;
}

async function buildParticipantSessionMap(participantIds) {
  const map = new Map();
  for (const participantId of participantIds) {
    const sessionsRes = await apiRequest(`/api/participants/${participantId}/sessions`);
    const firstSession = (sessionsRes.data || [])[0] || null;
    map.set(participantId, firstSession);
  }
  return map;
}

function renderManagerTable(list) {
  const tbody = document.getElementById("participantTableBody");
  const noRes = document.getElementById("noResults");
  if (!tbody) return;

  setText("tableCount", `(${list.length} shown)`);
  if (!list.length) {
    tbody.innerHTML = "";
    if (noRes) noRes.style.display = "block";
    return;
  }
  if (noRes) noRes.style.display = "none";

  tbody.innerHTML = list
    .map(
      (p) => `
      <tr onclick="selectParticipant(${p.participant_id})">
        <td style="color:#6b7280;font-size:13px;">P${p.participant_id}</td>
        <td style="font-weight:500;">${p.first_name} ${p.last_name}</td>
        <td style="color:#6b7280;font-size:13px;">${p.email_address || "-"}</td>
        <td>${p.division_name || "-"}</td>
        <td>${p.session_name || "Unassigned"}</td>
        <td style="color:#6b7280;font-size:13px;">${p.contact_no || "-"}</td>
      </tr>
    `
    )
    .join("");
}

window.applyFilters = function applyFilters() {
  const q = (document.getElementById("searchInput")?.value || "").trim().toLowerCase();
  const divisionFilter = document.getElementById("deptFilter")?.value || "";
  const sessionFilter = document.getElementById("sessionFilter")?.value || "";

  filteredManagerParticipants = managerParticipants.filter((p) => {
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
    const idLabel = `p${p.participant_id}`.toLowerCase();
    const sessionShort = p.session_name?.replace(" Session", "") || "";

    const qMatch =
      !q ||
      fullName.includes(q) ||
      (p.email_address || "").toLowerCase().includes(q) ||
      idLabel.includes(q);
    const divisionMatch = !divisionFilter || p.division_name === divisionFilter;
    const sessionMatch =
      !sessionFilter ||
      (sessionFilter === "Unassigned" ? !p.session_name : sessionShort === sessionFilter);

    return qMatch && divisionMatch && sessionMatch;
  });

  renderManagerTable(filteredManagerParticipants);
};

window.selectParticipant = function selectParticipant(participantId) {
  const participant = managerParticipants.find((p) => p.participant_id === Number(participantId));
  if (!participant) return;

  const detailPanel = document.getElementById("detailPanel");
  const detailGrid = document.getElementById("detailGrid");
  const detailSession = document.getElementById("detailSession");
  if (!detailPanel || !detailGrid || !detailSession) return;

  detailGrid.innerHTML = `
    <div class="detail-field"><label>Full Name</label><div class="val">${participant.first_name} ${participant.last_name}</div></div>
    <div class="detail-field"><label>Participant ID</label><div class="val">P${participant.participant_id}</div></div>
    <div class="detail-field"><label>Department</label><div class="val">${participant.division_name || "-"}</div></div>
    <div class="detail-field"><label>Email Address</label><div class="val">${participant.email_address || "-"}</div></div>
    <div class="detail-field"><label>Contact Number</label><div class="val">${participant.contact_no || "-"}</div></div>
  `;

  detailSession.innerHTML = `
    <div class="detail-session-card assigned">
      <div class="s-label">Assigned Session</div>
      <div class="s-val">${participant.session_name || "Unassigned"}</div>
      <div class="s-sub">Status: ${participant.session_status || "n/a"}</div>
    </div>
    <div class="detail-session-card">
      <div class="s-label">Seat</div>
      <div class="s-val">${participant.seat_label || "-"}</div>
      <div class="s-sub">Seat ID: ${participant.seat_id || "-"}</div>
    </div>
  `;

  detailPanel.classList.add("visible");
};

window.closeDetail = function closeDetail() {
  const detailPanel = document.getElementById("detailPanel");
  if (detailPanel) detailPanel.classList.remove("visible");
};

async function initManagerPage(user) {
  const managerName = document.getElementById("managerName");
  if (managerName && user?.data?.first_name) {
    managerName.textContent = `${user.data.first_name} ${user.data.last_name || ""}`.trim();
  }

  const [participants, sessions, participantDivisionMap] = await Promise.all([
    apiRequest("/api/participants"),
    apiRequest("/api/sessions"),
    buildParticipantDivisionMap(),
  ]);
  const sessionMap = await buildParticipantSessionMap((participants.data || []).map((p) => p.participant_id));

  managerParticipants = (participants.data || []).map((participant) => {
    const divisionInfo = participantDivisionMap.get(participant.participant_id) || {};
    const sessionInfo = sessionMap.get(participant.participant_id) || null;
    return {
      ...participant,
      division_id: divisionInfo.division_id || null,
      division_name: divisionInfo.division_name || null,
      session_id: sessionInfo?.sess_id || null,
      session_name: sessionInfo?.session_name || null,
      session_status: sessionInfo?.status || null,
      seat_id: sessionInfo?.seat_id || null,
      seat_label: sessionInfo?.seat_label || null,
    };
  });
  filteredManagerParticipants = [...managerParticipants];

  const totalParticipants = participants.meta?.total ?? participants.data?.length ?? 0;
  const assignedCount = managerParticipants.filter((p) => p.session_name).length;
  const statTotal = document.getElementById("statTotal");
  const statAssigned = document.getElementById("statAssigned");
  const statUnassigned = document.getElementById("statUnassigned");
  if (statTotal) statTotal.textContent = String(totalParticipants);
  if (statAssigned) statAssigned.textContent = String(assignedCount);
  if (statUnassigned) statUnassigned.textContent = String(Math.max(totalParticipants - assignedCount, 0));

  const sessionCards = document.getElementById("sessionCards");
  if (sessionCards) {
    sessionCards.innerHTML = sessions.data
      .map(
        (s) => `
        <div class="session-card">
          <div class="session-card-header">
            <div>
              <div class="session-name">${s.name}</div>
              <div class="session-time">Status: ${s.status}</div>
            </div>
            <div class="session-seats-badge">${s.max_participants} max</div>
          </div>
        </div>
      `
      )
      .join("");
  }

  renderManagerTable(filteredManagerParticipants);
}

async function initParticipantPage(user) {
  const participant = user?.data;
  if (!participant) return;

  const sessionsRes = await apiRequest(`/api/participants/${participant.participant_id}/sessions`);
  const currentSession = sessionsRes.data?.[0] || null;

  const fullName = `${participant.first_name} ${participant.last_name}`;
  const initials = `${participant.first_name?.[0] || ""}${participant.last_name?.[0] || ""}`.toUpperCase();

  setText("participantFirstName", participant.first_name || "-");
  setText("participantAvatar", initials || "-");
  setText("participantFullName", fullName.trim() || "-");
  setText("participantIdLabel", `Participant ID: ${participant.participant_id ?? "-"}`);
  setText("participantDeptBadge", currentSession?.division_name || "-");
  setText("pEmail", participant.email_address || "-");
  setText("pContact", participant.contact_no || "-");
  setText("pDept", currentSession?.division_name || "-");
  setText("pStatus", currentSession ? "Confirmed" : "Pending");
  setText("participantSession", currentSession?.session_name || "Not assigned");
  setText("participantTime", currentSession ? `Status: ${currentSession.status}` : "Awaiting allocation");
  setText("participantStatusText", currentSession ? "Confirmed" : "Pending");
}

async function initPage() {
  const pathname = window.location.pathname.toLowerCase();
  const user = JSON.parse(localStorage.getItem("seatg33k_user") || "null");

  if (pathname === "/manager") {
    if (!user || user.role !== "manager") {
      window.location.href = "/login";
      return;
    }
    await initManagerPage(user);
  }

  if (pathname === "/participant") {
    if (!user || user.role !== "participant") {
      window.location.href = "/login";
      return;
    }
    await initParticipantPage(user);
  }
}

initPage().catch((error) => {
  const errEl = document.getElementById("loginError");
  if (errEl) errEl.textContent = error.message;
});
