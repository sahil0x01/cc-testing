(function () {
  'use strict';

  var STORAGE_KEY = 'todos';
  var SORT_KEY = 'todos-sort';

  // Every sort mode the select offers; anything else stored is ignored.
  var SORT_MODES = ['created-asc', 'created-desc', 'updated-desc', 'updated-asc'];
  var DEFAULT_SORT = 'created-asc';

  var form = document.getElementById('new-todo-form');
  var input = document.getElementById('new-todo-input');
  var searchInput = document.getElementById('search-input');
  var searchClear = document.getElementById('search-clear');
  var sortSelect = document.getElementById('sort-select');
  var list = document.getElementById('todo-list');
  var emptyState = document.getElementById('empty-state');
  var countEl = document.getElementById('todo-count');

  // The todo being edited, or null when no row is in edit mode.
  var editingId = null;
  // Unsaved edit text, kept across the re-render caused by any other action.
  var editDraft = null;
  // Raw search box value; empty means "show everything".
  var query = '';
  // One of SORT_MODES: which timestamp orders the list, and in which direction.
  var sort = loadSort();
  var todos = load();

  /* ---------- storage ---------- */

  function loadSort() {
    var stored;
    try {
      stored = window.localStorage.getItem(SORT_KEY);
    } catch (err) {
      return DEFAULT_SORT;
    }
    return SORT_MODES.indexOf(stored) === -1 ? DEFAULT_SORT : stored;
  }

  function saveSort() {
    try {
      window.localStorage.setItem(SORT_KEY, sort);
    } catch (err) {
      // Storage can be unavailable (private mode, quota); sorting still works for this visit.
    }
  }

  function isTime(value) {
    return typeof value === 'number' && isFinite(value) && value > 0;
  }

  // Todos saved before timestamps existed were given ids of the form
  // Date.now().toString(36) + five random base-36 chars, so their creation time
  // can still be recovered from the id prefix. Unknown ids return 0 and fall back
  // to insertion order when sorting.
  function legacyTime(id) {
    if (id.length <= 5) return 0;
    var prefix = id.slice(0, -5);
    if (!/^[0-9a-z]+$/.test(prefix)) return 0;
    var stamped = parseInt(prefix, 36);
    return isFinite(stamped) && stamped > 0 ? stamped : 0;
  }

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
        var createdAt = isTime(todo.createdAt) ? todo.createdAt : legacyTime(todo.id);
        return {
          id: todo.id,
          text: todo.text,
          done: todo.done === true,
          createdAt: createdAt,
          updatedAt: isTime(todo.updatedAt) ? todo.updatedAt : createdAt,
        };
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
    var now = Date.now();
    var todo = { id: newId(), text: text, done: false, createdAt: now, updatedAt: now };
    todos.push(todo);
    save();
    render();
    return todo;
  }

  function updateTodo(id, text) {
    var todo = find(id);
    text = String(text || '').trim();
    if (!todo || !text) return null;
    // An unchanged text is not an edit, so it should not reshuffle the list.
    if (todo.text !== text) {
      todo.text = text;
      todo.updatedAt = Date.now();
    }
    save();
    render();
    return todo;
  }

  function toggleTodo(id) {
    var todo = find(id);
    if (!todo) return null;
    todo.done = !todo.done;
    todo.updatedAt = Date.now();
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
    if (editingId === id) stopEditing();
    save();
    render();
    return todo;
  }

  function stopEditing() {
    editingId = null;
    editDraft = null;
  }

  /* ---------- search ---------- */

  // Normalised query: trimmed and lower-cased, so matching ignores case and padding.
  function searchTerm() {
    return query.trim().toLowerCase();
  }

  function matchesQuery(todo) {
    var needle = searchTerm();
    return needle === '' || todo.text.toLowerCase().indexOf(needle) !== -1;
  }

  // Apply the filter by hiding rows in place instead of re-rendering them. The
  // nodes stay put, so an in-progress edit, its unsaved text and the focus in the
  // search box all survive every keypress.
  function applyFilter() {
    var searching = searchTerm() !== '';
    var shown = 0;
    var lastShown = null;
    var items = list.children;

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var todo = find(item.dataset.id);
      var visible = todo !== null && matchesQuery(todo);
      item.hidden = !visible;
      if (visible) {
        shown++;
        lastShown = item;
      }
    }

    // The dashed separator belongs under the last visible row, not the last DOM row.
    for (var j = 0; j < items.length; j++) {
      items[j].classList.toggle('is-last', items[j] === lastShown);
    }

    emptyState.textContent = searching
      ? 'No todos match "' + query.trim() + '".'
      : 'Nothing to do yet.';
    emptyState.hidden = shown > 0;

    var completed = todos.filter(function (todo) {
      return todo.done;
    }).length;
    var remaining = todos.length - completed;
    if (todos.length === 0) {
      countEl.textContent = '';
    } else if (searching) {
      countEl.textContent =
        'Showing ' + shown + ' of ' + todos.length + ' · ' + remaining + ' of ' + todos.length + ' left';
    } else {
      // Totals cover every todo, not just the rows currently shown.
      countEl.textContent = todos.length + ' todos, ' + completed + ' completed';
    }

    // Only offer Clear when the box holds something that actually filters.
    searchClear.hidden = !searching;
  }

  function setQuery(value) {
    query = String(value == null ? '' : value);
    applyFilter();
  }

  /* ---------- sorting ---------- */

  function sortField() {
    return sort.indexOf('created') === 0 ? 'createdAt' : 'updatedAt';
  }

  function sortDirection() {
    return sort.indexOf('-desc') !== -1 ? -1 : 1;
  }

  // Ties fall back to insertion order, so rows with identical (or unknown, for
  // todos saved before timestamps existed) timestamps never swap places.
  function compareEntries(a, b) {
    var field = sortField();
    var diff = a.todo[field] - b.todo[field];
    if (diff === 0) return a.index - b.index;
    return diff * sortDirection();
  }

  // A sorted copy: the stored array keeps insertion order, so only the rendered
  // order depends on the current sort mode.
  function sortedTodos() {
    return todos
      .map(function (todo, index) {
        return { todo: todo, index: index };
      })
      .sort(compareEntries)
      .map(function (entry) {
        return entry.todo;
      });
  }

  function setSort(value) {
    sort = SORT_MODES.indexOf(value) === -1 ? DEFAULT_SORT : value;
    sortSelect.value = sort;
    saveSort();
    render();
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

  // Timestamps are only shown as a native tooltip: the list itself stays plain.
  function formatTime(ms) {
    return ms > 0 ? new Date(ms).toLocaleString() : 'unknown';
  }

  function renderItem(todo) {
    var item = document.createElement('li');
    item.className = 'todo' + (todo.done ? ' done' : '');
    item.dataset.id = todo.id;
    item.title = 'Created ' + formatTime(todo.createdAt) + ' · Updated ' + formatTime(todo.updatedAt);

    if (editingId === todo.id) {
      var editRow = document.createElement('div');
      editRow.className = 'todo-edit';

      var editInput = document.createElement('input');
      editInput.type = 'text';
      editInput.className = 'edit-input';
      editInput.value = editDraft === null ? todo.text : editDraft;
      editInput.setAttribute('aria-label', 'Edit todo');
      editInput.addEventListener('input', function () {
        editDraft = editInput.value;
      });
      editInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
          event.preventDefault();
          commitEdit(todo.id, editInput.value);
        } else if (event.key === 'Escape') {
          stopEditing();
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
          stopEditing();
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
        editDraft = null;
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

  // Controls that a re-render must never pull focus away from.
  function focusIsElsewhere() {
    return document.activeElement === searchInput || document.activeElement === sortSelect;
  }

  function render() {
    list.textContent = '';
    sortedTodos().forEach(function (todo) {
      list.appendChild(renderItem(todo));
    });
    applyFilter();

    if (editingId) {
      var editInput = list.querySelector('.edit-input');
      // Don't steal focus from the search box or the sort menu, and never focus
      // a filtered-out row.
      if (editInput && !editInput.closest('.todo').hidden && !focusIsElsewhere()) {
        editInput.focus();
        editInput.select();
      }
    }
  }

  function commitEdit(id, text) {
    var todo = find(id);
    var next = String(text || '').trim();
    stopEditing();
    // An empty input leaves the todo unchanged, but still leaves edit mode.
    if (todo && next) {
      updateTodo(id, next);
    } else {
      render();
    }
  }

  /* ---------- events ---------- */

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var added = addTodo(input.value);
    // Don't let a new todo vanish into an active filter the user forgot about.
    if (added && !matchesQuery(added)) {
      searchInput.value = '';
      setQuery('');
    }
    input.value = '';
    input.focus();
  });

  searchInput.addEventListener('input', function () {
    setQuery(searchInput.value);
  });

  searchInput.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && searchInput.value !== '') {
      event.preventDefault();
      searchInput.value = '';
      setQuery('');
    }
  });

  searchClear.addEventListener('click', function () {
    searchInput.value = '';
    setQuery('');
    searchInput.focus();
  });

  sortSelect.addEventListener('change', function () {
    setSort(sortSelect.value);
  });

  // Reflect the stored sort mode in the select before the first render.
  sortSelect.value = sort;
  render();
})();
