# flashpoint-template

The canonical Flashpoint History game. Every game is a clone of this template
with one file swapped: `src/gameData.js`. React 18 + Vite 4, deploys to Netlify.

## What changes per game
- **`src/gameData.js`** — the ONLY per-game file. A locked Game Brief becomes
  this object: `meta`, `meters`, `images` (slot wiring), `chapters`, `verdicts`.
- **`public/images/`** — the game's art drops into `portraits/`, `backdrops/`,
  `inserts/`. Slots with no file fall back to `_placeholder.svg`.

Everything else (`App.jsx`, `ImageSlot.jsx`, `index.css`, `treatment.css`) is
generic shell shared across all games — edit deliberately (changes propagate).

## Commands
```
npm install
npm run dev      # local preview
npm run build    # → dist/  (Netlify publish dir)
```

## Image system (new vs the original 1900 build)
Every title/chapter/insert renders through `<ImageSlot>` under a uniform
treatment layer (`src/styles/treatment.css`) so archival photos and generated
backdrops read as one world. Absent image keys → the exact text-only path.
Slot architecture and licensing rules: `docs/IMAGE-PLAN.md`.

## Conventions this template bakes in
- `#root` centering-bug override at the top of `index.css` (do not remove).
- Design tokens (amber `#C17700`, Cinzel/Playfair/Libre Baskerville, dark mode).
- Chapters always unlocked; `?chapter=N` deep-links; localStorage is a
  within-session convenience, never required (worksheet-as-save-file).

## Deploy
Connect the repo in the Netlify dashboard, or `netlify deploy --prod` after
`npm run build`. `netlify.toml` sets build = `npm run build`, publish = `dist`.
