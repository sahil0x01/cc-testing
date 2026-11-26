(function () {
  'use strict';

  var STORAGE_KEY = 'todos';

  var form = document.getElementById('new-todo-form');
  var input = document.getElementById('new-todo-input');
  var searchInput = document.getElementById('search-input');
  var searchClear = document.getElementById('search-clear');
  var list = document.getElementById('todo-list');
  var emptyState = document.getElementById('empty-state');
  var countEl = document.getElementById('todo-count');

  // The todo being edited, or null when no row is in edit mode.
  var editingId = null;
  // Unsaved edit text, kept across re-renders (searching re-renders on every keypress).
  var editDraft = null;
  // Raw search box value; empty means "show everything".
  var query = '';
  var todos = load();

  /* ---------- storage ---------- */

  function load() {
    var raw;
    try {
      raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (err) {
      return [];
    }
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(function (todo) {
        return todo && typeof todo.text === 'string' && typeof todo.id === 'string';
      })
      .map(function (todo) {
        return { id: todo.id, text: todo.text, done: todo.done === true };
      });
  }

  function save() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch (err) {
      // Storage can be unavailable (private mode, quota); the app still works in memory.
    }
  }

  /* ---------- crud ---------- */

  function find(id) {
    for (var i = 0; i < todos.length; i++) {
      if (todos[i].id === id) return todos[i];
    }
    return null;
  }

  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function addTodo(text) {
    text = String(text || '').trim();
    if (!text) return null;
    var todo = { id: newId(), text: text, done: false };
    todos.push(todo);
    save();
    render();
    return todo;
  }

  function updateTodo(id, text) {
    var todo = find(id);
    text = String(text || '').trim();
    if (!todo || !text) return null;
    todo.text = text;
    save();
    render();
    return todo;
  }

  function toggleTodo(id) {
    var todo = find(id);
    if (!todo) return null;
    todo.done = !todo.done;
    save();
    render();
    return todo;
  }

  function deleteTodo(id) {
    var todo = find(id);
    if (!todo) return null;
    todos = todos.filter(function (item) {
      return item.id !== id;
    });
    if (editingId === id) editingId = null;
    save();
    render();
    return todo;
  }

  /* ---------- rendering ---------- */

  function makeButton(label, className, onClick) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
  }

  function renderItem(todo) {
    var item = document.createElement('li');
    item.className = 'todo' + (todo.done ? ' done' : '');
    item.dataset.id = todo.id;

    if (editingId === todo.id) {
      var editRow = document.createElement('div');
      editRow.className = 'todo-edit';

      var editInput = document.createElement('input');
      editInput.type = 'text';
      editInput.className = 'edit-input';
      editInput.value = todo.text;
      editInput.setAttribute('aria-label', 'Edit todo');
      editInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
          event.preventDefault();
          commitEdit(todo.id, editInput.value);
        } else if (event.key === 'Escape') {
          editingId = null;
          render();
        }
      });

      editRow.appendChild(editInput);
      editRow.appendChild(
        makeButton('Save', 'btn btn-primary', function () {
          commitEdit(todo.id, editInput.value);
        })
      );
      editRow.appendChild(
        makeButton('Cancel', 'btn', function () {
          editingId = null;
          render();
        })
      );
      item.appendChild(editRow);
      return item;
    }

    var checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'todo-checkbox';
    checkbox.checked = todo.done;
    checkbox.setAttribute('aria-label', 'Mark "' + todo.text + '" as ' + (todo.done ? 'not done' : 'done'));
    checkbox.addEventListener('change', function () {
      toggleTodo(todo.id);
    });

    var text = document.createElement('span');
    text.className = 'todo-text';
    text.textContent = todo.text;

    var actions = document.createElement('div');
    actions.className = 'todo-actions';
    actions.appendChild(
      makeButton('Edit', 'btn', function () {
        editingId = todo.id;
        render();
      })
    );
    actions.appendChild(
      makeButton('Delete', 'btn btn-danger', function () {
        deleteTodo(todo.id);
      })
    );

    item.appendChild(checkbox);
    item.appendChild(text);
    item.appendChild(actions);
    return item;
  }

  function render() {
    list.textContent = '';
    todos.forEach(function (todo) {
      list.appendChild(renderItem(todo));
    });

    emptyState.hidden = todos.length > 0;

    var remaining = todos.filter(function (todo) {
      return !todo.done;
    }).length;
    countEl.textContent = todos.length === 0 ? '' : remaining + ' of ' + todos.length + ' left';

    if (editingId) {
      var editInput = list.querySelector('.edit-input');
      if (editInput) {
        editInput.focus();
        editInput.select();
      }
    }
  }

  function commitEdit(id, text) {
    if (updateTodo(id, text)) {
      editingId = null;
      render();
    } else {
      // Empty input: keep the todo unchanged and leave edit mode.
      editingId = null;
      render();
    }
  }

  /* ---------- events ---------- */

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    addTodo(input.value);
    input.value = '';
    input.focus();
  });

  render();
})();
