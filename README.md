# Prefill Todos

A basic client-side todo app: plain HTML, CSS and JavaScript with no build step or dependencies.

The interface is deliberately pixelated: square corners, chunky 3px borders, hard offset
shadows, a dithered checkerboard background, no font smoothing, and a hand-plotted 5x5
pixel checkbox tick. All of it is CSS plus one tiny inline SVG, so there are no webfonts
or image files to load.

## Run

Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Features

- Create: type in the input and press Add (or Enter)
- Read: the list is rendered from `localStorage`, so todos survive reloads
- Update: check the box to toggle done, or use Edit (Enter saves, Escape cancels)
- Bulk toggle: Mark all done completes every todo at once; once nothing is left
  open the button reads Mark all not done and reopens them all instead. It always
  acts on the whole list (an active search only hides rows, it never limits the
  toggle), and its label states what the next click will do. It is hidden while
  the list is empty.
- Delete: the Delete button on each row, or Clear completed to drop every
  finished todo at once. The button only appears when something is completed,
  never touches open todos, and leaves an active search untouched
- Undo: the footer button puts back whatever the last delete removed, whether
  that was one row or a whole Clear completed batch, at the same place in the
  list. It is a single step and lives in memory only: deleting again replaces
  it, and reloading the page forgets it. Anything else done in the meantime
  (adding, toggling, editing, sorting) is kept, since only the removed rows are
  restored; the button's label counts the rows for a batch (Undo (3))
- Search: the search box filters the list by text as you type (case-insensitive
  substring match). Rows are hidden in place rather than re-rendered, so typing a
  query never disturbs an edit in progress or the focus in the box. Clear empties
  it, Escape in the box does the same, and the status line reports how many rows
  are showing. Adding a todo that does not match the active filter clears the
  filter so the new row is never invisible.
- Sort: the Sort menu orders the list by creation date (newest or oldest first)
  or last-updated date (newest or oldest first). Every todo stores when it was
  created and when it was last changed (text edits and done/undone toggles bump
  the updated time), the choice is remembered in `localStorage`, and the sort is
  display-only: the saved data keeps insertion order. Hovering a row shows its
  created/updated timestamps as a tooltip. Todos saved before timestamps existed
  are not lost: their creation time is recovered from the old id and they keep
  insertion order when it cannot be.
