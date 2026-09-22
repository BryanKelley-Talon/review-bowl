// Browser persistence — the CONVENIENCE layer (FULL-SPEC §4; canon §1).
// On a shared Chromebook cart this is the bonus case, not the plan: the save code is
// the real save. Everything here is wrapped, because a blocked or wiped store must
// still return a fully playable game. Only the team's state is kept — the same
// fields the save code carries, and nothing that identifies anyone.
import { decodeSaveCode, encodeSaveCode } from './saveCode.js'

const KEY = 'reviewBowlCareer'

export function readAutosave() {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    // Stored as the code itself: one format, already checksummed, nothing extra kept.
    return decodeSaveCode(JSON.parse(raw).code)
  } catch {
    return null
  }
}

export function writeAutosave(career) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ code: encodeSaveCode(career) }))
  } catch {
    /* storage unavailable — the save code is the real save, so carry on */
  }
}

export function clearAutosave() {
  try { window.localStorage.removeItem(KEY) } catch { /* nothing to clear */ }
}
