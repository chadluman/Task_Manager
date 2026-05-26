let activeTasks = [];
let completedTasks = [];

function addTask() {
  let input = document.getElementById("task-input");
  let text = input.value.trim();

  if (text === "") return;

  activeTasks.push({ title: text, subtasks: [] });
  input.value = "";
  renderTasks();
}

function renderTasks() {
  renderActiveTasks();
  renderCompletedTasks();
  updateCount();
}

function renderActiveTasks() {
  let list = document.getElementById("task-list");
  list.innerHTML = "";

  activeTasks.forEach((task, index) => {
    let li = document.createElement("li");
    li.className = "task-item";

    let subtasksHtml = "";
    if (task.subtasks.length > 0) {
      subtasksHtml = `
        <ul class="subtask-list" ondrop="dropSubtask(event, ${index})" ondragover="allowDrop(event)">
          ${task.subtasks.map((subtask, subIndex) => `
            <li class="subtask-item" draggable="true" ondragstart="dragSubtask(event, ${index}, ${subIndex})">
              <span class="task-text ${subtask.completed ? 'completed' : ''}">${subtask.text}</span>
              <div class="subtask-buttons">
                <button onclick="completeSubtask(${index}, ${subIndex})">Done</button>
                <button onclick="deleteSubtask(${index}, ${subIndex})">Delete</button>
              </div>
            </li>
          `).join('')}
        </ul>
      `;
    }

    li.innerHTML = `
      <div class="task-content">
        <span class="task-text">${task.title}</span>
        <div class="task-buttons">
          <button onclick="addSubtask(${index})">Add Subtask</button>
          <button onclick="completeTask(${index})">Done</button>
          <button onclick="deleteTask(${index})">Delete</button>
        </div>
      </div>
      ${subtasksHtml}
    `;

    list.appendChild(li);
  });
}

function renderCompletedTasks() {
  let list = document.getElementById("completed-task-list");
  list.innerHTML = "";

  completedTasks.forEach((task, index) => {
    let li = document.createElement("li");
    li.className = "task-item completed-task";

    let subtasksHtml = "";
    if (task.subtasks.length > 0) {
      subtasksHtml = `
        <ul class="subtask-list">
          ${task.subtasks.map((subtask) => `
            <li class="subtask-item">
              <span class="task-text completed">${subtask.text}</span>
            </li>
          `).join('')}
        </ul>
      `;
    }

    li.innerHTML = `
      <div class="task-content">
        <span class="task-text completed">${task.title}</span>
        <div class="task-buttons">
          <button onclick="uncompleteTask(${index})">Not Done</button>
          <button onclick="deleteCompletedTask(${index})">Delete</button>
        </div>
      </div>
      ${subtasksHtml}
    `;

    list.appendChild(li);
  });
}

function deleteTask(index) {
  activeTasks.splice(index, 1);
  renderTasks();
}

function uncompleteTask(index) {
  // Move task back to active tasks
  activeTasks.push(completedTasks.splice(index, 1)[0]);
  renderTasks();
}

function deleteCompletedTask(index) {
  completedTasks.splice(index, 1);
  renderTasks();
}

function completeTask(index) {
  const task = activeTasks[index];

  // Check if all subtasks are completed
  const allSubtasksCompleted = task.subtasks.length === 0 ||
    task.subtasks.every(subtask => subtask.completed);

  if (!allSubtasksCompleted) {
    alert("Please complete all subtasks before marking the main task as done.");
    return;
  }

  // Move task to completed tasks
  completedTasks.push(activeTasks.splice(index, 1)[0]);
  renderTasks();
}

function addSubtask(taskIndex) {
  let subtaskText = prompt("Enter subtask:");
  if (subtaskText && subtaskText.trim() !== "") {
    activeTasks[taskIndex].subtasks.push({ text: subtaskText.trim(), completed: false });
    renderTasks();
  }
}

function deleteSubtask(taskIndex, subtaskIndex) {
  activeTasks[taskIndex].subtasks.splice(subtaskIndex, 1);
  renderTasks();
}

function completeSubtask(taskIndex, subtaskIndex) {
  activeTasks[taskIndex].subtasks[subtaskIndex].completed = !activeTasks[taskIndex].subtasks[subtaskIndex].completed;
  renderTasks();
}

// Drag and drop functionality
let draggedTaskIndex = null;
let draggedSubtaskIndex = null;

function dragSubtask(event, taskIndex, subtaskIndex) {
  draggedTaskIndex = taskIndex;
  draggedSubtaskIndex = subtaskIndex;
  event.dataTransfer.effectAllowed = 'move';

  // Add visual feedback
  event.target.classList.add('dragging');
}

function allowDrop(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
}

function dropSubtask(event, targetTaskIndex) {
  event.preventDefault();

  if (draggedTaskIndex === null || draggedSubtaskIndex === null) return;

  // Only allow reordering within the same task
  if (draggedTaskIndex !== targetTaskIndex) return;

  const draggedSubtask = activeTasks[draggedTaskIndex].subtasks.splice(draggedSubtaskIndex, 1)[0];

  // Find the target position based on the drop location
  const subtaskList = event.target.closest('.subtask-list');
  const subtaskItems = subtaskList.querySelectorAll('.subtask-item');
  let targetIndex = activeTasks[targetTaskIndex].subtasks.length;

  for (let i = 0; i < subtaskItems.length; i++) {
    const rect = subtaskItems[i].getBoundingClientRect();
    if (event.clientY < rect.top + rect.height / 2) {
      targetIndex = i;
      break;
    }
  }

  activeTasks[targetTaskIndex].subtasks.splice(targetIndex, 0, draggedSubtask);

  draggedTaskIndex = null;
  draggedSubtaskIndex = null;

  renderTasks();
}

// Add drag end handler to remove visual feedback
document.addEventListener('dragend', function(event) {
  const draggingElement = document.querySelector('.dragging');
  if (draggingElement) {
    draggingElement.classList.remove('dragging');
  }
});

function updateCount() {
  document.getElementById("task-count").textContent =
    activeTasks.length + " tasks remaining";
}

document.getElementById("task-input").addEventListener("keydown", function(e) {
  if (e.key === "Enter") addTask();
});
