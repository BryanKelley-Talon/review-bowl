// REVIEW DAY — the modes, sorted by purpose and time (BK 2026-10-24 23:14: "organized by time and by Opener,
// closer, Test Review, Regents Review"). Each mode says where its content comes from:
//   file:<section>  the desks' unit files (template)        arena:<kind>  the Arena's blessed maps, stops, cards
// draft: true = built overnight 10/24, words not yet approved; shown only when the manifest has "lab": true.
import { W, D } from './words.js'
import { VALUES, startYear } from './content.js'

export const PURPOSES = ['opener', 'closer', 'test', 'regents']
export const TIMES = [5, 10, 20, 30, 40]

// THE BOARD and TOP ANSWERS scale with time (the 10/24 23:00 run length, extended to BK's time list).
export const BOARD_BY_TIME = { 20: { cols: 4, rows: [0, 2, 4] }, 30: { cols: 4, rows: [0, 1, 2, 3, 4] }, 40: { cols: 5, rows: [0, 1, 2, 3, 4] } }
export const LISTS_BY_TIME = { 10: 2, 20: 3, 30: 4, 40: Infinity }
export const boardRun = setup => BOARD_BY_TIME[setup?.minutes] || BOARD_BY_TIME[setup?.run] || BOARD_BY_TIME[40]

const inUnits = (items, unitIds) => (items || []).filter(x => unitIds.includes(x.unit))
const fromFiles = (ctx, unitIds, section) =>
  ctx.units.filter(u => unitIds.includes(u.unit) && u.data).flatMap(u => (u.data[section] || []).map((x, i) => ({ ...x, unit: u.unit, sample: !!u.data._sample, key: `${u.unit}#${section}#${i}` })))

export const MODES = [
  { id: 'board', name: () => W.board, sub: () => W.boardSub, purposes: ['test', 'regents'], times: [20, 30, 40],
    count: (ctx, ids) => fromFiles(ctx, ids, 'board').length },
  { id: 'top', name: () => W.top, sub: () => W.topSub, purposes: ['test', 'regents'], times: [10, 20, 30, 40],
    count: (ctx, ids) => fromFiles(ctx, ids, 'top_answers').length },
  { id: 'final', draft: true, name: () => D.final, sub: () => D.finalSub, purposes: ['closer'], times: [5],
    count: (ctx, ids) => fromFiles(ctx, ids, 'board').length },
  { id: 'lightning', draft: true, name: () => D.lightning, sub: () => D.lightningSub, purposes: ['opener', 'closer'], times: [5],
    count: (ctx, ids) => fromFiles(ctx, ids, 'board').flatMap(c => (c.clues || []).slice(0, 2).filter(k => !k.document)).length },
  { id: 'order', draft: true, name: () => D.order, sub: () => D.orderSub, purposes: ['opener', 'test', 'regents'], times: [5],
    count: (ctx, ids) => stopsFor(ctx, ids).filter(s => startYear(s.when)).length >= 4 ? 1 : 0 },
  { id: 'who', draft: true, cumulative: true, name: () => D.who, sub: () => D.whoSub, purposes: ['opener', 'regents'], times: [5],
    count: (ctx, ids) => fromFiles(ctx, ids, 'who_am_i').length },
  { id: 'odd', draft: true, name: () => D.odd, sub: () => D.oddSub, purposes: ['opener', 'test'], times: [5],
    count: (ctx, ids) => fromFiles(ctx, ids, 'odd_one_out').length },
  { id: 'detective', draft: true, name: () => D.detective, sub: () => D.detectiveSub, purposes: ['opener', 'test', 'regents'], times: [10],
    count: (ctx, ids) => fromFiles(ctx, ids, 'detective').length },
  { id: 'principle', draft: true, courses: ['us11r'], name: () => D.principle, sub: () => D.principleSub, purposes: ['opener', 'test', 'regents'], times: [10],
    count: (ctx, ids) => fromFiles(ctx, ids, 'name_it').length },
  { id: 'issue', draft: true, courses: ['gs10r'], name: () => D.issue, sub: () => D.issueSub, purposes: ['opener', 'test', 'regents'], times: [10],
    count: (ctx, ids) => stopsFor(ctx, ids).length },
  { id: 'threads', draft: true, courses: ['us11r'], name: () => D.threads, sub: () => D.threadsSub, purposes: ['test', 'regents'], times: [10],
    count: (ctx, ids) => stopsFor(ctx, ids).length },
  { id: 'map', draft: true, name: () => D.map, sub: () => D.mapSub, purposes: ['opener', 'test', 'regents'], times: [10],
    count: (ctx, ids) => inUnits(ctx.arena.atlas?.maps, ids).reduce((n, m) => n + m.steps.length, 0) },
]
export const modeById = id => MODES.find(m => m.id === id)

export function stopsFor(ctx, ids) {
  const src = ctx.course === 'us11r' ? ctx.arena.threads : ctx.arena.ei
  return inUnits(src?.stops, ids)
}
export { fromFiles, inUnits }

// Which modes the front shows: course fits, lab allows, purpose and time match.
export function modesFor({ course, purpose, minutes, lab }) {
  return MODES.filter(m => (!m.courses || m.courses.includes(course)) && (lab || !m.draft)
    && (!purpose || m.purposes.includes(purpose)) && (!minutes || m.times.includes(minutes)))
}

// How many rounds a short mode plays in its time.
export const ROUNDS = { final: 1, lightning: 1, order: 3, who: 3, odd: 4, detective: 2, principle: 6, issue: 6, threads: 6, map: 6 }
export { VALUES }
