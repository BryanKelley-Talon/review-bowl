# Skills Review Bowl — Flashpoint History

Arcade football where what you know builds your team. Under the Arena umbrella; its own build and (after BK
reviews) its own Netlify beta site. Cloned from `template/` (Vite + React, `#root` fix, netlify.toml); the
narrative-game shell was replaced. **Local only. Never deployed from here.**

Contract: `_BRIEFCASE/skills-review-bowl-2026-09-22-FULL-SPEC.md` · build order:
`_BRIEFCASE/josh-reviewbowl-build-order-v2-2026-09-22.md`.

## Run it

```
npm run dev      # http://localhost:5197
npm test         # rule + pipeline checks against the real content (no framework)
npm run build    # dist/ — ~2 MB, under the school-wifi rule
npm run stage    # re-copy content from In/ + the Arena, re-gate the crops
```

## Where things live

| File | What it is |
|---|---|
| `public/bowl.manifest.json` | **BK's control.** Lane weights, which packs are on, hints/playoff rules. Edit, save, reload — no code. |
| `public/content/` | Staged copies of Sam's and Will's packs + gated crops (`_crops.json` says what was served or held and why). |
| `scripts/stage-content.mjs` | Copies packs, gates every crop (`blessed === true` per crop, on the owning desk), converts to WebP. |
| `src/content/pool.js` | Reads every desk's file shape into one question shape. Carries `licence` and `answer_verified`. |
| `src/content/dealer.js` | Which question a gate asks. One deck per lane; scoring gates skip unverified keys. |
| `src/game/ratings.js` | The stat layer: answers → form → ratings → field physics. |
| `src/game/field.js` | The canvas engine. Never asks a question. |
| `src/game/matchRules.js` | Downs, clock, scoring — pure, tested. The six bank before the XP question. |
| `src/game/Match.jsx` | Game day: the dead-ball gates and the flow. |
| `src/game/season.js` | Schedule, league, playoffs, firing, free agency — all derived from the career seed. |
| `src/save/saveCode.js` | Adapted from Nation Builder's; here the 22-character code IS the whole save. |
| `src/shared/DisclaimerBadge.jsx` | The standing badge, approved wording verbatim. Built to lift into the Arena as-is. |

## Adding content

1. Sam or Will drop a pack in `In/`. 2. Add it to `PACKS` in `scripts/stage-content.mjs` and run `npm run stage`.
3. Add a line to the course's `packs` in `public/bowl.manifest.json` with its lane. The pool is cumulative: it is
live in every game from then on.

No accounts, no server, no analytics. Players and numbers are generated, never real names. Original Flashpoint
code; no third-party libraries beyond React and Vite (MIT).
