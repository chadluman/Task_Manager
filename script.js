const TOKEN_KEY = "task-manager-token";
const API_ORIGIN =
  ["localhost", "127.0.0.1"].includes(window.location.hostname) &&
  window.location.port !== "5501"
    ? `${window.location.protocol}//${window.location.hostname}:5501`
    : "";

let token = localStorage.getItem(TOKEN_KEY);
let currentUser = null;
let tasks = [];
let archivedTasks = [];
let users = [];
let teams = [];
let currentFilter = "active";
let authMode = "login";
let dragged = null;

const authScreen = document.getElementById("auth-screen");
const authForm = document.getElementById("auth-form");
const authMessage = document.getElementById("auth-message");
const authSubmit = document.getElementById("auth-submit");
const appShell = document.getElementById("app-shell");
const appMessage = document.getElementById("app-message");
const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const priorityInput = document.getElementById("priority-input");
const dueInput = document.getElementById("due-input");
const assigneeInput = document.getElementById("assignee-input");
const teamInput = document.getElementById("team-input");
const taskList = document.getElementById("task-list");
const emptyTemplate = document.getElementById("empty-template");
const filters = document.querySelectorAll(".filter");
const activeCount = document.getElementById("active-count");
const doneCount = document.getElementById("done-count");
const subtaskCount = document.getElementById("subtask-count");
const focusTask = document.getElementById("focus-task");
const progressPercent = document.getElementById("progress-percent");
const progressRing = document.getElementById("progress-ring");

async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_ORIGIN}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error("Cannot reach the backend. Run npm start and open the URL it prints.");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 404 && path.startsWith("/api/")) {
      throw new Error(
        "Backend API not found. Run npm start and open the app from the server URL, not Live Server.",
      );
    }
    if (response.status === 401 && token) logout();
    throw new Error(data.message || "Request failed.");
  }
  return data;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatRole(role) {
  return role.replace("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDueDate(value) {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No due date";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function formatHistoryDate(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function showMessage(element, message, type = "error") {
  element.textContent = message;
  element.className = `form-message ${message ? type : ""}`;
}

function setAuthMode(mode) {
  authMode = mode;
  document.querySelectorAll(".auth-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.authMode === mode);
  });
  document.querySelectorAll(".register-field").forEach((field) => {
    field.classList.toggle("hidden", mode !== "register");
  });
  document.getElementById("auth-name").required = mode === "register";
  document.getElementById("auth-team").required = mode === "register";
  document.getElementById("auth-password").autocomplete =
    mode === "register" ? "new-password" : "current-password";
  authSubmit.textContent = mode === "register" ? "Create account" : "Sign in";
  showMessage(authMessage, "");
}

async function loadTeams() {
  const data = await api("/api/teams");
  teams = data.teams;
  document.getElementById("team-options").innerHTML = teams
    .map((team) => `<option value="${escapeHtml(team.name)}"></option>`)
    .join("");
}

function populateAssignmentOptions() {
  assigneeInput.innerHTML =
    '<option value="">Unassigned</option>' +
    users
      .map(
        (user) =>
          `<option value="${user._id}">${escapeHtml(user.name)} (${escapeHtml(user.team?.name || "No team")})</option>`,
      )
      .join("");
  teamInput.innerHTML =
    '<option value="">No team</option>' +
    teams.map((team) => `<option value="${team._id}">${escapeHtml(team.name)}</option>`).join("");
}

async function loadWorkspace() {
  const [taskData, userData, teamData] = await Promise.all([
    api("/api/tasks"),
    api("/api/users"),
    api("/api/teams"),
  ]);
  tasks = taskData.tasks;
  users = userData.users;
  teams = teamData.teams.filter((team) => team._id === currentUser.team?._id);
  populateAssignmentOptions();
  renderTasks();
}

async function enterApp(user) {
  currentUser = user;
  authScreen.classList.add("hidden");
  appShell.classList.remove("hidden");
  document.getElementById("account-name").textContent = user.name;
  document.getElementById("account-role").textContent = formatRole(user.role);
  document.getElementById("account-team").textContent = user.team?.name || "No team";
  await loadWorkspace();
}

function logout() {
  token = null;
  currentUser = null;
  tasks = [];
  archivedTasks = [];
  localStorage.removeItem(TOKEN_KEY);
  appShell.classList.add("hidden");
  authScreen.classList.remove("hidden");
  authForm.reset();
  setAuthMode("login");
}

function getVisibleTasks() {
  if (currentFilter === "active") return tasks.filter((task) => !task.completed);
  if (currentFilter === "completed") return tasks.filter((task) => task.completed);
  if (currentFilter === "archived") return archivedTasks;
  return tasks;
}

function renderStats() {
  const active = tasks.filter((task) => !task.completed);
  const done = tasks.filter((task) => task.completed);
  const totalSubtasks = tasks.reduce((sum, task) => sum + task.subtasks.length, 0);
  const completeUnits =
    done.length +
    tasks.reduce(
      (sum, task) => sum + task.subtasks.filter((subtask) => subtask.completed).length,
      0,
    );
  const totalUnits = tasks.length + totalSubtasks;
  const percent = totalUnits ? Math.round((completeUnits / totalUnits) * 100) : 0;

  activeCount.textContent = active.length;
  doneCount.textContent = done.length;
  subtaskCount.textContent = totalSubtasks;
  focusTask.textContent = active[0]?.title || "Board clear";
  progressPercent.textContent = `${percent}%`;
  progressRing.style.strokeDashoffset = 314 - (314 * percent) / 100;
}

function optionMarkup(items, selectedId, emptyLabel, label) {
  return (
    `<option value="">${emptyLabel}</option>` +
    items
      .map((item) => {
        const itemLabel = label(item);
        return `<option value="${item._id}" ${item._id === selectedId ? "selected" : ""}>${escapeHtml(itemLabel)}</option>`;
      })
      .join("")
  );
}

function createTaskCard(task) {
  const card = document.createElement("article");
  const done = task.subtasks.filter((subtask) => subtask.completed).length;
  const total = task.subtasks.length;
  const assignedToId = task.assignedTo?._id || "";
  const assignedTeamId = task.assignedTeam?._id || "";
  const subtaskItems = task.subtasks
    .map(
      (subtask) => `
        <li class="subtask-item ${subtask.completed ? "done" : ""}" draggable="${!task.archived}" data-subtask-id="${subtask._id}">
          <button type="button" class="check-button" data-action="toggle-subtask" aria-label="Toggle subtask">&#10003;</button>
          <span class="subtask-text ${subtask.completed ? "done" : ""}">${escapeHtml(subtask.text)}</span>
          ${
            task.archived
              ? ""
              : `<div class="subtask-actions">
                  <button type="button" class="task-action danger" data-action="delete-subtask">Delete</button>
                </div>`
          }
        </li>`,
    )
    .join("");
  const historyItems = [...task.history]
    .reverse()
    .map(
      (entry) => `
        <li>
          <strong>${escapeHtml(entry.actor?.name || "Former user")}</strong>
          ${escapeHtml(entry.detail)}
          <time>${formatHistoryDate(entry.at)}</time>
        </li>`,
    )
    .join("");

  card.className = `task-card ${task.completed ? "completed-card" : ""}`;
  card.dataset.priority = task.priority;
  card.dataset.taskId = task._id;
  card.innerHTML = `
    <div class="task-main">
      <div>
        <h3 class="task-title ${task.completed ? "completed" : ""}">${escapeHtml(task.title)}</h3>
        <div class="meta-row">
          <span class="badge priority">${task.priority}</span>
          <span class="badge">${formatDueDate(task.due)}</span>
          <span class="badge">${done}/${total} subtasks</span>
          <span class="badge">Owner: ${escapeHtml(task.owner?.name || "Unknown")}</span>
          ${task.assignedTo ? `<span class="badge">User: ${escapeHtml(task.assignedTo.name)}</span>` : ""}
          ${task.assignedTeam ? `<span class="badge">Team: ${escapeHtml(task.assignedTeam.name)}</span>` : ""}
        </div>
      </div>
      ${
        task.archived
          ? ""
          : `<div class="task-actions">
              <button type="button" class="task-action" data-action="toggle-task">${task.completed ? "Reopen" : "Done"}</button>
              <button type="button" class="task-action danger" data-action="delete-task">Archive</button>
            </div>`
      }
    </div>
    ${
      task.archived
        ? ""
        : `<form class="assignment-form" data-action="update-assignment">
            <label>
              <span>Assign user</span>
              <select name="assignedTo">${optionMarkup(users, assignedToId, "Unassigned", (user) => user.name)}</select>
            </label>
            <label>
              <span>Assign team</span>
              <select name="assignedTeam">${optionMarkup(teams, assignedTeamId, "No team", (team) => team.name)}</select>
            </label>
            <button type="submit" class="task-action">Save assignment</button>
          </form>`
    }
    <div class="subtask-panel">
      <ul class="subtask-list">${subtaskItems}</ul>
      ${
        !task.completed && !task.archived
          ? `<form class="subtask-add" data-action="add-subtask">
              <input type="text" placeholder="Add a subtask..." aria-label="Add a subtask" />
              <button type="submit">Add</button>
            </form>`
          : ""
      }
    </div>
    <details class="history-panel">
      <summary>Activity history (${task.history.length})</summary>
      <ul>${historyItems || "<li>No activity recorded.</li>"}</ul>
    </details>`;
  return card;
}

function renderTasks() {
  renderStats();
  taskList.innerHTML = "";
  const visibleTasks = getVisibleTasks();
  if (!visibleTasks.length) {
    taskList.appendChild(emptyTemplate.content.cloneNode(true));
    return;
  }
  visibleTasks.forEach((task) => taskList.appendChild(createTaskCard(task)));
}

async function refreshTasks() {
  const data = await api("/api/tasks");
  tasks = data.tasks;
  renderTasks();
}

async function createTask(title, priority = "medium", due = "", assignedTo = "", assignedTeam = "") {
  await api("/api/tasks", {
    method: "POST",
    body: JSON.stringify({ title, priority, due, assignedTo, assignedTeam }),
  });
  await refreshTasks();
}

document.querySelectorAll(".auth-tab").forEach((button) => {
  button.addEventListener("click", () => setAuthMode(button.dataset.authMode));
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage(authMessage, "");
  authSubmit.disabled = true;
  authSubmit.textContent = authMode === "register" ? "Creating account..." : "Signing in...";

  try {
    const payload = {
      email: document.getElementById("auth-email").value,
      password: document.getElementById("auth-password").value,
    };
    if (authMode === "register") {
      payload.name = document.getElementById("auth-name").value;
      payload.role = document.getElementById("auth-role").value;
      payload.teamName = document.getElementById("auth-team").value;
    }
    const data = await api(`/api/auth/${authMode}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    token = data.token;
    localStorage.setItem(TOKEN_KEY, token);
    await enterApp(data.user);
  } catch (error) {
    showMessage(authMessage, error.message);
  } finally {
    authSubmit.disabled = false;
    authSubmit.textContent = authMode === "register" ? "Create account" : "Sign in";
  }
});

document.getElementById("logout-button").addEventListener("click", logout);

taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = taskInput.value.trim();
  if (!title) return;
  try {
    await createTask(
      title,
      priorityInput.value,
      dueInput.value,
      assigneeInput.value,
      teamInput.value,
    );
    taskForm.reset();
    priorityInput.value = "medium";
    currentFilter = "active";
    updateFilterButtons();
    showMessage(appMessage, "Task added.", "success");
  } catch (error) {
    showMessage(appMessage, error.message);
  }
});

filters.forEach((button) => {
  button.addEventListener("click", async () => {
    currentFilter = button.dataset.filter;
    if (currentFilter === "archived") {
      try {
        archivedTasks = (await api("/api/tasks?archived=true")).tasks;
      } catch (error) {
        showMessage(appMessage, error.message);
      }
    }
    updateFilterButtons();
    renderTasks();
  });
});

function updateFilterButtons() {
  filters.forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === currentFilter);
  });
}

taskList.addEventListener("click", async (event) => {
  const actionTarget = event.target.closest("[data-action]");
  const card = event.target.closest(".task-card");
  if (!actionTarget || !card) return;
  const task = tasks.find((item) => item._id === card.dataset.taskId);
  if (!task) return;

  try {
    if (actionTarget.dataset.action === "toggle-task") {
      await api(`/api/tasks/${task._id}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: !task.completed }),
      });
    }
    if (actionTarget.dataset.action === "delete-task") {
      await api(`/api/tasks/${task._id}`, { method: "DELETE" });
    }
    if (actionTarget.dataset.action === "toggle-subtask") {
      const subtaskId = event.target.closest(".subtask-item")?.dataset.subtaskId;
      const subtask = task.subtasks.find((item) => item._id === subtaskId);
      await api(`/api/tasks/${task._id}/subtasks/${subtaskId}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: !subtask.completed }),
      });
    }
    if (actionTarget.dataset.action === "delete-subtask") {
      const subtaskId = event.target.closest(".subtask-item")?.dataset.subtaskId;
      await api(`/api/tasks/${task._id}/subtasks/${subtaskId}`, { method: "DELETE" });
    }
    await refreshTasks();
  } catch (error) {
    showMessage(appMessage, error.message);
  }
});

taskList.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  const card = form.closest(".task-card");
  if (!card) return;
  const taskId = card.dataset.taskId;

  try {
    if (form.dataset.action === "add-subtask") {
      const input = form.querySelector("input");
      if (!input.value.trim()) return;
      await api(`/api/tasks/${taskId}/subtasks`, {
        method: "POST",
        body: JSON.stringify({ text: input.value.trim() }),
      });
    }
    if (form.dataset.action === "update-assignment") {
      await api(`/api/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({
          assignedTo: new FormData(form).get("assignedTo"),
          assignedTeam: new FormData(form).get("assignedTeam"),
        }),
      });
      showMessage(appMessage, "Assignment updated.", "success");
    }
    await refreshTasks();
  } catch (error) {
    showMessage(appMessage, error.message);
  }
});

taskList.addEventListener("dragstart", (event) => {
  const item = event.target.closest(".subtask-item");
  const card = event.target.closest(".task-card");
  if (!item || !card) return;
  dragged = { taskId: card.dataset.taskId, subtaskId: item.dataset.subtaskId };
  item.classList.add("dragging");
  event.dataTransfer.effectAllowed = "move";
});

taskList.addEventListener("dragover", (event) => {
  if (dragged) event.preventDefault();
});

taskList.addEventListener("drop", async (event) => {
  if (!dragged) return;
  event.preventDefault();
  const targetItem = event.target.closest(".subtask-item");
  const card = event.target.closest(".task-card");
  if (!card || card.dataset.taskId !== dragged.taskId) return;
  const task = tasks.find((item) => item._id === dragged.taskId);
  const order = task.subtasks.map((subtask) => subtask._id);
  const fromIndex = order.indexOf(dragged.subtaskId);
  order.splice(fromIndex, 1);
  const toIndex = targetItem ? order.indexOf(targetItem.dataset.subtaskId) : order.length;
  order.splice(Math.max(toIndex, 0), 0, dragged.subtaskId);

  try {
    await api(`/api/tasks/${task._id}/subtasks`, {
      method: "PATCH",
      body: JSON.stringify({ order }),
    });
    await refreshTasks();
  } catch (error) {
    showMessage(appMessage, error.message);
  } finally {
    dragged = null;
  }
});

document.addEventListener("dragend", () => {
  document.querySelector(".dragging")?.classList.remove("dragging");
  dragged = null;
});

async function bootstrap() {
  try {
    await loadTeams();
    if (!token) return;
    const data = await api("/api/auth/me");
    await enterApp(data.user);
  } catch (error) {
    logout();
    showMessage(authMessage, error.message);
  }
}

bootstrap();
