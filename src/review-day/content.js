// REVIEW DAY content: the manifest names each course's unit files; each unit file is the desks'
// template (OUTPUTS/review-day/review-day-template-v1.json). Josh reshapes nothing here; the screen
// shows the desks' words as written.

export async function loadManifest() {
  const r = await fetch('/review-day/manifest.json', { cache: 'no-cache' })
  if (!r.ok) throw new Error('manifest')
  return r.json()
}

const cache = new Map()
export async function loadUnit(file) {
  if (cache.has(file)) return cache.get(file)
  const r = await fetch(`/review-day/${file}`, { cache: 'no-cache' })
  if (!r.ok) throw new Error(file)
  const d = await r.json()
  cache.set(file, d)
  return d
}

export function shuffle(arr, rand = Math.random) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Every category from every picked unit, each tagged with its unit, by a stable key.
export function categoryPool(units) {
  const out = []
  for (const u of units) {
    (u.board || []).forEach((c, i) => out.push({ key: `${u.unit}#${i}`, unit: u.unit, sample: !!u._sample, ...c }))
  }
  return out
}

export function listPool(units) {
  const out = []
  for (const u of units) {
    (u.top_answers || []).forEach((l, i) => out.push({ key: `${u.unit}#${i}`, unit: u.unit, sample: !!u._sample, ...l }))
  }
  return out
}

export const BOARD_COLS = 5
export const VALUES = [100, 200, 300, 400, 500]

// Deal a board: five categories, preferring ones not dealt yet this session.
// Run length (BK 2026-10-24 23:00, "yes to all"): 40 minutes = the full board, 5 categories × 5 squares, every list;
// 20 minutes = a half board, 4 categories × the 100 · 300 · 500 squares, and 3 lists.
export const RUNS = {
  40: { cols: 5, rows: [0, 1, 2, 3, 4], lists: Infinity },
  20: { cols: 4, rows: [0, 2, 4], lists: 3 },
}
export const runOf = setup => RUNS[setup?.run] || RUNS[40]

export function dealBoard(pool, alreadyDealt = [], cols = BOARD_COLS) {
  const fresh = shuffle(pool.filter(c => !alreadyDealt.includes(c.key)))
  const used = shuffle(pool.filter(c => alreadyDealt.includes(c.key)))
  return [...fresh, ...used].slice(0, cols).map(c => c.key)
}

// TOP ANSWERS: #1 is worth the most. Six answers run 60, 50 … 10; four run 40 … 10.
export const rankValue = (rank, n) => (n - rank) * 10

// ── the Arena's own blessed content, imported word for word (scripts/import-arena-refs.py) ──
const arenaCache = new Map()
export async function loadArena(name) {
  if (arenaCache.has(name)) return arenaCache.get(name)
  const p = fetch(`/review-day/arena/${name}`, { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null)).catch(() => null)
  arenaCache.set(name, p)
  return p
}

// Everything a course's modes can draw on: its unit files and the Arena's maps, stops and cards.
export async function loadCourse(manifest, course) {
  const cdef = manifest.courses.find(c => c.id === course)
  const units = await Promise.all((cdef?.units || []).map(async u => ({ ...u, data: u.file ? await loadUnit(u.file).catch(() => null) : null })))
  const us = course === 'us11r'
  const [civic, umbrellas, threads, ei, atlas] = await Promise.all([
    us ? loadArena('civic-us11r.json') : null,
    us ? null : loadArena('umbrellas-gs10r.json'),
    us ? loadArena('threads-us11r.json') : null,
    us ? null : loadArena('ei-gs10r.json'),
    loadArena(`atlas-${course}.json`),
  ])
  return { course, units, arena: { civic, umbrellas, threads, ei, atlas } }
}

// The year an event starts, for IN ORDER. "1600s"-style decades and centuries are left out: too loose to order.
export function startYear(when) {
  const s = String(when || '')
  if (/\d{3,4}s\b/.test(s)) return null
  const m = s.match(/\b(\d{4})\b/)
  return m ? Number(m[1]) : null
}
