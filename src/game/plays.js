// ============================================================
// PLAY CALL — Tecmo-style play selection (BK 2026-10-03 15:51; words and rules 16:06).
//
// Before every snap the student calls one of four designed plays. The words are BK's
// ("yes", 16:06). The stats still decide how it goes: Speed, Blocking and Toughness carry
// the runs; Throwing and Hands carry the passes.
//
// THE TECMO GUESS (BK 16:06: "more trained up you are in between games dictates frequency
// of their right guesses"). The other side secretly calls a play too. How often they guess
// yours depends on the squad's average player LEVEL, which is trained in Practice Week:
// about 2 in 5 at level 1, under 1 in 6 at level 4. A right guess means one defender beats
// his block at the snap. Nothing about it is stored.
// ============================================================

export const PLAYS = [
  { id: 'sweep', name: 'Sweep', kind: 'run', line: 'Run outside. Your blockers lead the way to the sideline.' },
  { id: 'dive', name: 'Dive', kind: 'run', line: 'Run up the middle. Short, tough yards.' },
  { id: 'slants', name: 'Slants', kind: 'pass', line: 'Quick passes. Receivers 1 and 2 cut inside fast.' },
  { id: 'deep', name: 'Deep Shot', kind: 'pass', line: 'Go long. Your receivers run deep, so the line has to hold.' },
]
export const playById = id => PLAYS.find(p => p.id === id) || null

// The designed routes. Runs send everyone else out to clear the way.
export const ROUTES_OF = {
  sweep: { wr1: 'go', wr2: 'go', te: 'go' },
  dive: { wr1: 'go', wr2: 'go', te: 'go' },
  slants: { wr1: 'slant', wr2: 'slant', te: 'curl', rb: 'check' },
  deep: { wr1: 'post', wr2: 'go', te: 'seam', rb: 'block' },
}

const STATS = ['throwing', 'hands', 'speed', 'blocking', 'toughness']
export function squadLevel(levels = {}) {
  return STATS.reduce((n, s) => n + (levels[s] ?? 2), 0) / STATS.length
}
// Level 1 → 0.40 · 2 → 0.32 · 3 → 0.24 · 4 → 0.16
export function guessChance(levels) {
  return Math.max(0.12, Math.min(0.40, 0.40 - 0.08 * (squadLevel(levels) - 1)))
}

export const PLAY_WORDS = {
  head: 'Play Call',
  readIt: 'They read it!',
  change: 'Change play',
}
