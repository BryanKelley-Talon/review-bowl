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
export function dealBoard(pool, alreadyDealt = []) {
  const fresh = shuffle(pool.filter(c => !alreadyDealt.includes(c.key)))
  const used = shuffle(pool.filter(c => alreadyDealt.includes(c.key)))
  return [...fresh, ...used].slice(0, BOARD_COLS).map(c => c.key)
}

// TOP ANSWERS: #1 is worth the most. Six answers run 60, 50 … 10; four run 40 … 10.
export const rankValue = (rank, n) => (n - rank) * 10
