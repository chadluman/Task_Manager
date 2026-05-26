const STORAGE_KEY = "portfolio-task-manager-v2";

let tasks = loadTasks();
let currentFilter = "active";
let dragged = null;

const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const priorityInput = document.getElementById("priority-input");
const dueInput = document.getElementById("due-input");
const taskList = document.getElementById("task-list");
const emptyTemplate = document.getElementById("empty-template");
const filters = document.querySelectorAll(".filter");
const activeCount = document.getElementById("active-count");
const doneCount = document.getElementById("done-count");
const subtaskCount = document.getElementById("subtask-count");
const focusTask = document.getElementById("focus-task");
const progressPercent = document.getElementById("progress-percent");
const progressRing = document.getElementById("progress-ring");

function loadTasks() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (Array.isArray(stored)) return stored;
  } catch {
    return [];
  }

  return [];
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function createTask(title, priority = "medium", due = "") {
  return {
    id: crypto.randomUUID(),
    title,
    priority,
    due,
    completed: false,
    createdAt: Date.now(),
    subtasks: [],
  };
}

function formatDueDate(value) {
  if (!value) return "No due date";

  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "No due date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function getVisibleTasks() {
  if (currentFilter === "active") return tasks.filter((task) => !task.completed);
  if (currentFilter === "completed") return tasks.filter((task) => task.completed);
  return tasks;
}

function getSubtaskStats(task) {
  const total = task.subtasks.length;
  const done = task.subtasks.filter((subtask) => subtask.completed).length;
  return { done, total };
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
  const focus = active[0]?.title || "Board clear";

  activeCount.textContent = active.length;
  doneCount.textContent = done.length;
  subtaskCount.textContent = totalSubtasks;
  focusTask.textContent = focus;
  progressPercent.textContent = `${percent}%`;
  progressRing.style.strokeDashoffset = 314 - (314 * percent) / 100;
}

function renderEmptyState() {
  taskList.innerHTML = "";
  taskList.appendChild(emptyTemplate.content.cloneNode(true));
}

function renderTasks() {
  renderStats();
  taskList.innerHTML = "";

  const visibleTasks = getVisibleTasks();

  if (!visibleTasks.length) {
    renderEmptyState();
    return;
  }

  visibleTasks.forEach((task) => {
    taskList.appendChild(createTaskCard(task));
  });
}

function createTaskCard(task) {
  const card = document.createElement("article");
  const { done, total } = getSubtaskStats(task);
  card.className = `task-card ${task.completed ? "completed-card" : ""}`;
  card.dataset.priority = task.priority;
  card.dataset.taskId = task.id;

  const subtaskItems = task.subtasks
    .map(
      (subtask) => `
        <li class="subtask-item ${subtask.completed ? "done" : ""}" draggable="true" data-subtask-id="${subtask.id}">
          <button type="button" class="check-button" data-action="toggle-subtask" aria-label="Toggle subtask">✓</button>
          <span class="subtask-text ${subtask.completed ? "done" : ""}">${escapeHtml(subtask.text)}</span>
          <div class="subtask-actions">
            <button type="button" class="task-action danger" data-action="delete-subtask">Delete</button>
          </div>
        </li>
      `,
    )
    .join("");

  card.innerHTML = `
    <div class="task-main">
      <div>
        <h3 class="task-title ${task.completed ? "completed" : ""}">${escapeHtml(task.title)}</h3>
        <div class="meta-row">
          <span class="badge priority">${task.priority}</span>
          <span class="badge">${formatDueDate(task.due)}</span>
          <span class="badge">${done}/${total} subtasks</span>
        </div>
      </div>
      <div class="task-actions">
        <button type="button" class="task-action" data-action="toggle-task">${task.completed ? "Reopen" : "Done"}</button>
        <button type="button" class="task-action danger" data-action="delete-task">Delete</button>
      </div>
    </div>
    <div class="subtask-panel">
      <ul class="subtask-list">${subtaskItems}</ul>
      ${
        task.completed
          ? ""
          : `<form class="subtask-add" data-action="add-subtask">
              <input type="text" placeholder="Add a subtask..." aria-label="Add a subtask" />
              <button type="submit">Add</button>
            </form>`
      }
    </div>
  `;

  return card;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function findTask(taskId) {
  return tasks.find((task) => task.id === taskId);
}

function handleTaskAction(event) {
  const actionTarget = event.target.closest("[data-action]");
  if (!actionTarget) return;

  const card = event.target.closest(".task-card");
  if (!card) return;

  const task = findTask(card.dataset.taskId);
  if (!task) return;

  const action = actionTarget.dataset.action;

  if (action === "toggle-task") {
    const unfinishedSubtasks = task.subtasks.some((subtask) => !subtask.completed);
    if (!task.completed && unfinishedSubtasks) {
      task.subtasks = task.subtasks.map((subtask) => ({
        ...subtask,
        completed: true,
      }));
    }
    task.completed = !task.completed;
  }

  if (action === "delete-task") {
    tasks = tasks.filter((item) => item.id !== task.id);
  }

  if (action === "toggle-subtask") {
    const subtaskId = event.target.closest(".subtask-item")?.dataset.subtaskId;
    const subtask = task.subtasks.find((item) => item.id === subtaskId);
    if (subtask) subtask.completed = !subtask.completed;
  }

  if (action === "delete-subtask") {
    const subtaskId = event.target.closest(".subtask-item")?.dataset.subtaskId;
    task.subtasks = task.subtasks.filter((item) => item.id !== subtaskId);
  }

  saveTasks();
  renderTasks();
}

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = taskInput.value.trim();
  if (!title) return;

  tasks.unshift(createTask(title, priorityInput.value, dueInput.value));
  taskInput.value = "";
  dueInput.value = "";
  currentFilter = "active";
  updateFilterButtons();
  saveTasks();
  renderTasks();
});

document.querySelectorAll(".quick-actions button").forEach((button) => {
  button.addEventListener("click", () => {
    tasks.unshift(createTask(button.dataset.template, button.dataset.priority));
    currentFilter = "active";
    updateFilterButtons();
    saveTasks();
    renderTasks();
  });
});

filters.forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    updateFilterButtons();
    renderTasks();
  });
});

function updateFilterButtons() {
  filters.forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === currentFilter);
  });
}

taskList.addEventListener("click", handleTaskAction);

taskList.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-action='add-subtask']");
  if (!form) return;

  event.preventDefault();

  const card = form.closest(".task-card");
  const task = findTask(card?.dataset.taskId);
  const input = form.querySelector("input");
  const text = input.value.trim();

  if (!task || !text) return;

  task.subtasks.push({
    id: crypto.randomUUID(),
    text,
    completed: false,
  });
  input.value = "";
  saveTasks();
  renderTasks();
});

taskList.addEventListener("dragstart", (event) => {
  const item = event.target.closest(".subtask-item");
  const card = event.target.closest(".task-card");
  if (!item || !card) return;

  dragged = {
    taskId: card.dataset.taskId,
    subtaskId: item.dataset.subtaskId,
  };
  item.classList.add("dragging");
  event.dataTransfer.effectAllowed = "move";
});

taskList.addEventListener("dragover", (event) => {
  if (!dragged) return;
  event.preventDefault();
});

taskList.addEventListener("drop", (event) => {
  if (!dragged) return;
  event.preventDefault();

  const targetItem = event.target.closest(".subtask-item");
  const card = event.target.closest(".task-card");
  if (!card || card.dataset.taskId !== dragged.taskId) return;

  const task = findTask(dragged.taskId);
  if (!task) return;

  const fromIndex = task.subtasks.findIndex((subtask) => subtask.id === dragged.subtaskId);
  if (fromIndex < 0) return;

  const [moved] = task.subtasks.splice(fromIndex, 1);
  const toIndex = targetItem
    ? task.subtasks.findIndex((subtask) => subtask.id === targetItem.dataset.subtaskId)
    : task.subtasks.length;

  task.subtasks.splice(Math.max(toIndex, 0), 0, moved);
  dragged = null;
  saveTasks();
  renderTasks();
});

document.addEventListener("dragend", () => {
  document.querySelector(".dragging")?.classList.remove("dragging");
  dragged = null;
});

if (!tasks.length) {
  tasks = [
    createTask("Sketch a sharper project demo", "high"),
    createTask("Refactor one rough component", "medium"),
  ];
  tasks[0].subtasks = [
    { id: crypto.randomUUID(), text: "Define the before and after", completed: true },
    { id: crypto.randomUUID(), text: "Add screenshots or notes", completed: false },
  ];
  saveTasks();
}

renderTasks();
