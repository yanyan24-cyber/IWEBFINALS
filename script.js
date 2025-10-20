const calendar = document.getElementById("calendar");
const todoList = document.getElementById("todoList");
const completedList = document.getElementById("completedList");
const taskInput = document.getElementById("taskInput");
const addBtn = document.getElementById("addBtn");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const footer = document.getElementById("footer");
const emptyMessage = document.getElementById("emptyMessage");

let tasks = JSON.parse(localStorage.getItem("tasks")) || {};
let currentDate = new Date().toDateString();
let undoStack = [];
let redoStack = [];

/* ----------- Calendar ----------- */
function renderCalendar() {
  calendar.innerHTML = "";
  const today = new Date();
  for (let i = -3; i <= 4; i++) {
    const date = new Date();
    date.setDate(today.getDate() + i);
    const pill = document.createElement("div");
    pill.classList.add("date-pill");
    if (date.toDateString() === currentDate) pill.classList.add("selected");
    pill.innerHTML = `
      <div class="day">${date.toLocaleDateString("en", { weekday: "short" }).toUpperCase()}</div>
      <div class="num">${date.getDate()}</div>
    `;
    pill.addEventListener("click", () => {
      currentDate = date.toDateString();
      renderCalendar();
      renderTasks();
    });
    calendar.appendChild(pill);
  }
}

/* ----------- Tasks ----------- */
function renderTasks() {
  todoList.innerHTML = "";
  completedList.innerHTML = "";
  const dayTasks = tasks[currentDate] || [];

  dayTasks.forEach((task, index) => {
    const div = document.createElement("div");
    div.className = "task" + (task.done ? " completed" : "");
    div.innerHTML = `
      <div class="task-left">
        <input type="checkbox" ${task.done ? "checked" : ""}>
        <span>${task.text}</span>
      </div>
      <span class="del">✕</span>
    `;
    div.querySelector("input").addEventListener("change", () => toggleTask(index));
    div.querySelector(".del").addEventListener("click", () => deleteTask(index));
    (task.done ? completedList : todoList).appendChild(div);
  });

  // Show or hide empty message
  const hasTasks = dayTasks.length > 0;
  emptyMessage.style.display = hasTasks ? "none" : "block";

  updateUndoRedo();
}

function addTask() {
  const text = taskInput.value.trim();
  if (!text) return;
  pushUndo();
  if (!tasks[currentDate]) tasks[currentDate] = [];
  tasks[currentDate].push({ text, done: false });
  taskInput.value = "";
  save();
}

function toggleTask(index) {
  pushUndo();
  tasks[currentDate][index].done = !tasks[currentDate][index].done;
  save();
}

function deleteTask(index) {
  pushUndo();
  tasks[currentDate].splice(index, 1);
  save();
}

/* ----------- Storage ----------- */
function save() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
  renderTasks();
}

/* ----------- Undo / Redo ----------- */
function pushUndo() {
  undoStack.push(JSON.stringify(tasks));
  redoStack = [];
  updateUndoRedo();
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(JSON.stringify(tasks));
  tasks = JSON.parse(undoStack.pop());
  save();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(JSON.stringify(tasks));
  tasks = JSON.parse(redoStack.pop());
  save();
}

function updateUndoRedo() {
  undoBtn.disabled = !undoStack.length;
  redoBtn.disabled = !redoStack.length;
}

window.addEventListener("scroll", () => {
  const bottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 10;
  footer.classList.toggle("visible", bottom);
});

/* ----------- Events ----------- */
addBtn.addEventListener("click", addTask);
taskInput.addEventListener("keypress", e => {
  if (e.key === "Enter") addTask();
});
undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);

/* ----------- Init ----------- */
renderCalendar();
renderTasks();
updateUndoRedo();
