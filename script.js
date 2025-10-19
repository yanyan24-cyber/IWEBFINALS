// script.js - Taskify main todo logic
// Saves tasks per date into localStorage with key "tasks_YYYY-MM-DD"
// Implements undo/redo stacks for simple operations (snapshot-based)

(() => {
  // Utilities
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  // Elements
  const calendarWrap = document.getElementById('calendarWrap');
  const todoList = document.getElementById('todoList');
  const completedList = document.getElementById('completedList');
  const emptyState = document.getElementById('emptyState');
  const taskInput = document.getElementById('taskInput');
  const addBtn = document.getElementById('addBtn');
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');

  // State
  let selectedDate = new Date(); // default today
  let tasks = []; // tasks for selectedDate
  let undoStack = [];
  let redoStack = [];

  // Helpers
  function dateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `tasks_${y}-${m}-${day}`;
  }

  function formatPillDate(d) {
    const weekday = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
    return { weekday, day: d.getDate() };
  }

  // Generate a horizontal range of dates centered on today (14 days shown)
  function buildCalendar(centerDate = new Date(), total = 14) {
    calendarWrap.innerHTML = '';
    const start = new Date(centerDate);
    start.setDate(centerDate.getDate() - Math.floor(total/2));

    for (let i=0;i<total;i++){
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const pill = document.createElement('button');
      pill.className = 'date-pill';
      if (isSameDate(d, selectedDate)) pill.classList.add('active');

      pill.innerHTML = `<div class="day">${formatPillDate(d).weekday}</div>
                        <div class="num">${formatPillDate(d).day}</div>`;
      pill.dataset.date = d.toISOString();
      pill.addEventListener('click', () => {
        selectDate(new Date(pill.dataset.date));
      });
      calendarWrap.appendChild(pill);
    }
  }

  function isSameDate(a,b){
    return a.getFullYear()===b.getFullYear()
      && a.getMonth()===b.getMonth()
      && a.getDate()===b.getDate();
  }

  // Persistence
  function loadTasksForDate(d) {
    const key = dateKey(d);
    const raw = localStorage.getItem(key);
    try {
      const parsed = raw ? JSON.parse(raw) : [];
      tasks = Array.isArray(parsed) ? parsed : [];
    } catch(e) {
      tasks = [];
    }
    renderTasks();
  }

  function saveTasksForDate(d) {
    const key = dateKey(d);
    localStorage.setItem(key, JSON.stringify(tasks));
  }

  // Undo/redo (snapshot)
  function pushStateForUndo(){
    undoStack.push({
      dateKey: dateKey(selectedDate),
      tasks: JSON.parse(JSON.stringify(tasks))
    });
    // cap stack length
    if (undoStack.length > 50) undoStack.shift();
    // clear redo on new change
    redoStack = [];
    updateUndoRedoButtons();
  }

  function undo(){
    if(!undoStack.length) return;
    const snapshot = undoStack.pop();
    // push current to redo
    redoStack.push({
      dateKey: dateKey(selectedDate),
      tasks: JSON.parse(JSON.stringify(tasks))
    });
    // apply snapshot only if same date, otherwise load snapshot date then save current
    if(snapshot.dateKey === dateKey(selectedDate)){
      tasks = snapshot.tasks;
      saveTasksForDate(selectedDate);
      renderTasks();
    } else {
      // snapshot belongs to another date: save current then load snapshot date
      localStorage.setItem(snapshot.dateKey, JSON.stringify(snapshot.tasks));
      // load current date state from storage (if exists)
      loadTasksForDate(selectedDate);
    }
    updateUndoRedoButtons();
  }

  function redo(){
    if(!redoStack.length) return;
    const snapshot = redoStack.pop();
    undoStack.push({
      dateKey: dateKey(selectedDate),
      tasks: JSON.parse(JSON.stringify(tasks))
    });
    if(snapshot.dateKey === dateKey(selectedDate)){
      tasks = snapshot.tasks;
      saveTasksForDate(selectedDate);
      renderTasks();
    } else {
      localStorage.setItem(snapshot.dateKey, JSON.stringify(snapshot.tasks));
      loadTasksForDate(selectedDate);
    }
    updateUndoRedoButtons();
  }

  function updateUndoRedoButtons(){
    undoBtn.disabled = undoStack.length === 0;
    redoBtn.disabled = redoStack.length === 0;
    undoBtn.style.opacity = undoBtn.disabled ? 0.45 : 1;
    redoBtn.style.opacity = redoBtn.disabled ? 0.45 : 1;
  }

  // Render
  function renderTasks(){
    todoList.innerHTML = '';
    completedList.innerHTML = '';

    const todos = tasks.filter(t => !t.completed);
    const comps = tasks.filter(t => t.completed);

    if(tasks.length === 0){
      emptyState.style.display = 'block';
    } else {
      emptyState.style.display = 'none';
    }

    todos.forEach((t) => {
      const card = createTaskCard(t);
      todoList.appendChild(card);
    });

    comps.forEach((t) => {
      const card = createTaskCard(t);
      completedList.appendChild(card);
    });
  }

  function createTaskCard(taskObj){
    const card = document.createElement('div');
    card.className = 'task-card';
    // left: checkbox + text
    const left = document.createElement('div');
    left.className = 'task-left';

    const cb = document.createElement('div');
    cb.className = 'checkbox' + (taskObj.completed ? ' checked' : '');
    cb.setAttribute('role','button');
    cb.title = taskObj.completed ? 'Mark as incomplete' : 'Mark as complete';
    cb.innerHTML = taskObj.completed ? '✓' : '';
    cb.addEventListener('click', () => toggleComplete(taskObj.id));

    const txt = document.createElement('div');
    txt.className = 'task-text' + (taskObj.completed ? ' completed' : '');
    txt.textContent = taskObj.text;

    left.appendChild(cb);
    left.appendChild(txt);

    // right: delete button
    const right = document.createElement('div');
    right.className = 'task-right';
    const del = document.createElement('button');
    del.className = 'delete-btn';
    del.title = 'Delete task';
    del.innerHTML = '✕';
    del.addEventListener('click', () => deleteTask(taskObj.id));
    right.appendChild(del);

    card.appendChild(left);
    card.appendChild(right);
    return card;
  }

  // Actions
  function addTask(text){
    if(!text || !text.trim()) return;
    pushStateForUndo();
    const newTask = {
      id: Date.now() + Math.random().toString(36).slice(2,7),
      text: text.trim(),
      completed: false,
      createdAt: Date.now()
    };
    tasks.push(newTask);
    saveTasksForDate(selectedDate);
    renderTasks();
    taskInput.value = '';
    taskInput.focus();
  }

  function toggleComplete(id){
    pushStateForUndo();
    tasks = tasks.map(t => t.id === id ? {...t, completed: !t.completed} : t);
    saveTasksForDate(selectedDate);
    renderTasks();
  }

  function deleteTask(id){
    pushStateForUndo();
    tasks = tasks.filter(t => t.id !== id);
    saveTasksForDate(selectedDate);
    renderTasks();
  }

  // Select date
  function selectDate(d){
    selectedDate = new Date(d);
    // update active pill
    $$('.date-pill').forEach(p => {
      const pd = new Date(p.dataset.date);
      if(isSameDate(pd, selectedDate)) p.classList.add('active');
      else p.classList.remove('active');
    });
    // clear stacks when date changes (common UX) but we keep ability to undo across dates lightly
    undoStack = [];
    redoStack = [];
    updateUndoRedoButtons();
    loadTasksForDate(selectedDate);
  }

  // Event binding
  addBtn.addEventListener('click', () => addTask(taskInput.value));
  taskInput.addEventListener('keydown', (e) => {
    if(e.key === 'Enter') {
      e.preventDefault();
      addTask(taskInput.value);
    }
  });

  undoBtn.addEventListener('click', undo);
  redoBtn.addEventListener('click', redo);

  // Initialize
  function init(){
    buildCalendar(new Date(), 14);
    selectDate(selectedDate);

    // initial button state
    updateUndoRedoButtons();
  }

  // Run init
  init();

})();
