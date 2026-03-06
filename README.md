# Chess Predictor

Interactive single-page chess analysis board with move mode, place mode, attack overlays, and move history.

## Live App

GitHub Pages deployment:

- https://dudedex.github.io/chess-predictor

## What the app does

- **Move mode** with legal move generation and turn enforcement.
- **Place mode** to build/edit positions by placing, moving, or removing pieces.
- **Attack overlays**:
  - Green for squares capturable by your selected side.
  - Red for squares capturable by the opponent.
  - Striped mixed overlay when both sides attack the same square.
- **Hover previews** for attacked squares.
- **Undo/forward history** with SAN-like notation display.
- **Check/checkmate detection** and status indicator.
- **Board utilities**: switch turn, reset/clear board, flip X/Y in place mode.
- **URL sharing** of board + side-to-move state via `?board=...`.
- **Responsive/mobile UI** with collapsible menu and overlay history drawer.

## Run locally

This is a static app (HTML/CSS/JS), so you can serve it with any static server:

```bash
python3 -m http.server 4173
```

Then open:

- http://localhost:4173

## Deploy

The repository includes a GitHub Pages workflow in:

- `.github/workflows/deploy-gh-pages.yml`

It deploys the static site from this repo to GitHub Pages.
