// The screen remembers the board through a reload or the mid-period lunch bell (periods 6 and 7):
// which squares are gone, which lists were played, the team totals. Nothing about a student, ever.
// Storage is a convenience (canon §1): if it's blocked or wiped, Review Day starts clean and works.
const KEY = 'review-day-v1'

export function readState() {
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function writeState(s) {
  try { window.localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* convenience only */ }
}

export function clearState() {
  try { window.localStorage.removeItem(KEY) } catch { /* convenience only */ }
}
