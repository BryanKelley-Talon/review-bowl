// ============================================================
// THE DEALER — which question a gate asks.
//
// One cumulative pool (FULL-SPEC §3): every gate can draw from anything enabled,
// weighted by BK's lane weights in the manifest. Each lane is a shuffled deck, so a
// student sees the whole lane before anything repeats. The deck lives in memory
// only — it is a convenience, and a fresh page simply reshuffles.
// ============================================================
import { LANES } from '../game/ratings.js'

// Where each gate prefers to look. `only` is strict unless the lanes are empty.
const GATES = {
  coin:     { label: 'Coin toss' },
  xp:       { label: 'Extra point', only: ['sources'], scoring: true },
  timeout:  { label: 'Timeout' },
  live:     { label: 'Big moment', prefer: { sources: 2, context: 2 } },
  halftime: { label: 'Halftime' },
  press:    { label: 'Press conference', prefer: { context: 2, reading: 2 } },
  agency:   { label: 'Free agency' },
}

export function makeDealer(pool, course, rules = {}, random = Math.random) {
  const decks = {}
  let last = null

  const eligible = (lane, scoring) => (pool.lanes[lane] || []).filter(q =>
    !(scoring && q.answerVerified === false && !rules.unverified_in_scoring_gates))

  // ONE deck per lane, shared by every gate — a scoring gate just skips the items it
  // may not ask. (Separate decks per gate type let the same item come up twice a game.)
  function fromDeck(lane, scoring) {
    const ok = eligible(lane, scoring)
    if (!ok.length) return null
    const all = pool.lanes[lane]
    let deck = decks[lane] || []
    if (!deck.some(id => ok.some(q => q.id === id))) {
      deck = all.map(q => q.id)
      for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]] }
      if (deck.length > 1 && deck[deck.length - 1] === last) deck.unshift(deck.pop())
    }
    let at = deck.length - 1
    while (at >= 0 && !ok.some(q => q.id === deck[at])) at--
    const id = deck[at]
    deck.splice(at, 1)
    decks[lane] = deck
    last = id
    return ok.find(q => q.id === id)
  }

  function pickLane(weights, scoring) {
    const live = LANES.filter(l => (weights[l] || 0) > 0 && eligible(l, scoring).length)
    if (!live.length) return null
    const total = live.reduce((n, l) => n + weights[l], 0)
    let r = random() * total
    for (const l of live) { r -= weights[l]; if (r <= 0) return l }
    return live[live.length - 1]
  }

  return {
    emptyLanes: LANES.filter(l => !(pool.lanes[l] || []).length),
    size: LANES.reduce((n, l) => n + (pool.lanes[l] || []).length, 0),

    // gate: one of GATES. opts.lane forces a lane (free agency). opts.playoff marks
    // every gate as scoring — playoffs are summative.
    draw(gate, opts = {}) {
      const g = GATES[gate] || {}
      const scoring = !!(g.scoring || opts.playoff)
      const base = course.weights || {}
      const tryLanes = opts.lane ? [opts.lane] : g.only
      if (tryLanes) {
        const lane = pickLane(Object.fromEntries(tryLanes.map(l => [l, 1])), scoring)
        if (lane) return fromDeck(lane, scoring)
      }
      const weights = Object.fromEntries(LANES.map(l => [l, (base[l] ?? 1) * ((g.prefer || {})[l] || 1)]))
      const lane = pickLane(weights, scoring) || pickLane(Object.fromEntries(LANES.map(l => [l, 1])), scoring)
      return lane ? fromDeck(lane, scoring) : null
    },
  }
}

export const gateLabel = gate => (GATES[gate] || {}).label || gate
