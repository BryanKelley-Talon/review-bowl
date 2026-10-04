// Browser persistence — the CONVENIENCE layer (FULL-SPEC §4; canon §1).
// On a shared Chromebook cart this is the bonus case, not the plan: the save code is
// the real save. Everything here is wrapped, because a blocked or wiped store must
// still return a fully playable game. Only the team's state is kept — the same
// fields the save code carries, and nothing that identifies anyone.
import { decodeSaveFile, encodeSaveFile } from './saveCode.js'

const KEY = 'reviewBowlCareer'

export function readAutosave() {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    // Stored as the code itself: one format, already checksummed, nothing extra kept.
    return decodeSaveFile(JSON.parse(raw).code)    // the whole file: both sports (2026-10-04)
  } catch {
    return null
  }
}

export function writeAutosave(file) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ code: encodeSaveFile(file) }))
  } catch {
    /* storage unavailable — the save code is the real save, so carry on */
  }
}

export function clearAutosave() {
  try { window.localStorage.removeItem(KEY) } catch { /* nothing to clear */ }
}

// The save-code tip opens by itself once per computer (BK 2026-10-04). A convenience flag only:
// if storage is blocked, the tip just opens again next time.
const TIP_KEY = 'reviewBowlSaveTipSeen'
export function tipSeen() { try { return window.localStorage.getItem(TIP_KEY) === '1' } catch { return false } }
export function markTipSeen() { try { window.localStorage.setItem(TIP_KEY, '1') } catch { /* fine */ } }
