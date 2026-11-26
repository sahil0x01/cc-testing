# cc-testing

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
- Delete: the Delete button on each row
