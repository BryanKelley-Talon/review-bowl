// ============================================================
// GAME DAY — one game, start to press conference.
//
// Content fires ONLY at football's own stoppages (build-order rule 2):
//   coin toss · extra point · timeout · halftime · end of game (press conference)
//   + the rare "big moment" before a 3rd-and-long or red-zone snap — optional,
//     at most once a half, and only ever a bonus
// Live snaps never stop for a question (rule 3). What a student knows reaches the
// field as the stat layer — ratings → physics — recomputed after every answer.
// ============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Question from '../ui/Question.jsx'
import LedBoard from '../ui/LedBoard.jsx'
import { gateLabel } from '../content/dealer.js'
import { FieldEngine } from './field.js'
import { driveLine, simDrive, standLine } from './drive.js'
import { isBigMoment } from './threat.js'
import {
  applyDrive, applyPenalty, applyPlay, callTimeout, canKick, clockOf, extraPoint, fieldGoal, firstDown, goalToGo,
  halfOver, isPenaltySpot, kickChance, kickDistance, newGame, punt, startOvertime, startSecondHalf, twoPoint,
} from './matchRules.js'
import { STAT_OF, physics, ratings, values } from './ratings.js'
import { kits as makeKits, TEAMS } from './teams.js'
import { RESULT } from './season.js'

const ORD = ['', '1st', '2nd', '3rd', '4th']

function ballOnText(ballOn, opp) {
  if (ballOn === 50) return 'midfield'
  return ballOn < 50 ? `own ${ballOn}` : `${opp.abbr} ${100 - ballOn}`
}

function describe(res, outcome) {
  if (outcome.kind === 'td') return 'TOUCHDOWN — six points on the board.'
  switch (res.type) {
    case 'incomplete': return `Incomplete${res.why ? ` — ${res.why}` : ''}.`
    case 'sack': return `Sacked — ${Math.abs(res.gained)} yard loss.`
    case 'int': return 'Intercepted.'
    case 'fumble': return 'Fumble — they recover.'
    case 'safety': return 'Safety — two points to them.'
    case 'oob': return `Out of bounds — ${res.gained >= 0 ? `gain of ${res.gained}` : `loss of ${-res.gained}`}.`
    default: return res.gained >= 0 ? `Tackled — gain of ${res.gained}.` : `Tackled — loss of ${-res.gained}.`
  }
}

export default function Match({ career, dealer, manifest, opp, oppStrength, playoff, weekLabel, onAnswer, onFinish }) {
  const rules = manifest.rules || {}
  const you = TEAMS[career.team]
  const them = TEAMS[opp]
  const hints = playoff ? !!rules.hints_playoffs : rules.hints_regular_season !== false
  const kits = useMemo(() => makeKits(you, them), [you, them])

  const [g, setGState] = useState(() => newGame(manifest.season?.quarter_minutes || 8))
  const gRef = useRef(g)
  const commit = useCallback(next => { gRef.current = next; setGState(next) }, [])

  const [stage, setStage] = useState('intro')      // intro · presnap · live · drive · bigmoment · halftime · final · gate
  const [gate, setGate] = useState(null)           // { kind, q, stakes, then }
  const [drive, setDrive] = useState(null)
  const [toast, setToast] = useState(null)
  const [phase, setPhase] = useState(null)
  const [boost, setBoost] = useState({})           // halftime adjustments, second half only
  const [halftime, setHalftime] = useState(null)
  const [flash, setFlash] = useState(null)         // the stat layer, made visible: what an answer just moved
  const playBoost = useRef(null)                   // one snap: a timeout or big-moment read
  const [fieldVersion, setFieldVersion] = useState(0)
  const setRead = on => { playBoost.current = on ? { read: true } : null; setFieldVersion(n => n + 1) }
  const liveChecks = useRef({ 1: 0, 2: 0 })
  const flags = useRef({ 1: 0, 2: 0 })
  const hits = useRef({ 1: 0, 2: 0 })      // ball-security moments from a hard hit, per half
  const missedKicks = useRef(0)          // so the two-point card can say why it matters
  const tally = useRef({ right: 0, total: 0 })
  const bigMomentAsked = useRef(-1)

  const r = ratings({ form: career.form, levels: career.levels, facilities: career.facilities, boost })
  const v = values(r)

  // ── gates ──────────────────────────────────────────────────────────────────
  const ask = useCallback((kind, stakes, then, opts = {}) => {
    const q = dealer.draw(kind, { playoff, ...opts })
    if (!q) { then(null); return }
    setGate({ kind, q, stakes, then, serial: Math.random() })
  }, [dealer, playoff])

  const answered = ({ correct, hintsUsed, q }) => {
    const cur = gate
    if (!cur) return
    setGate(null)
    tally.current.total += 1
    if (correct) tally.current.right += 1
    const change = onAnswer(q.lane, correct, hintsUsed)
    if (change) setFlash({ stat: STAT_OF[q.lane], up: change.after > change.before, id: Date.now(),
      text: change.after !== change.before
        ? `${change.label} ${change.before} → ${change.after}`
        : `${change.label} form ${correct ? 'up' : 'down'} (still ${change.after})` })
    cur.then(correct, q)
  }

  // ── field direction (BK, 2026-09-23/26): pick a side, or flip every quarter ──────
  // Held for this game only. Nothing is stored: a setting is not worth a byte on a
  // student's machine (canon §1), and the default is the way the game has always played.
  const DIRS = ['ltr', 'rtl', 'flip']
  const DIR_LABEL = { ltr: 'Field: left → right', rtl: 'Field: right → left', flip: 'Field: flips each quarter' }
  const [dirMode, setDirMode] = useState('ltr')
  const dirFor = gs => {
    if (dirMode === 'ltr') return 1
    if (dirMode === 'rtl') return -1
    if (gs.ot) return 1
    const q = Number(clockOf(gs).label.slice(1)) || 1   // Q1 → right, Q2 → left, Q3 → right, Q4 → left
    return q % 2 ? 1 : -1
  }

  // ── full screen (BK, 2026-09-26: "make the playable space bigger") ───────────────
  // The whole page goes full screen, not just the field, so every question card, the
  // badge and the controls come with it. Esc (or the button) comes back out.
  //
  // PHONES (BK 2026-09-29 11:38, "full screen option on phones doesnt work"). An iPhone's
  // Safari has no full-screen API for a page at all (only for video), so the old button
  // did nothing there. Now: where the browser allows it (Chromebooks, Android, iPad with
  // the webkit prefix) the page goes truly full screen and an Android phone also turns the
  // field sideways. Where it doesn't (iPhone), the same button fills the page with the
  // field instead ("page mode"): same layout, the browser's own bars stay. Nothing stored.
  const [realFull, setRealFull] = useState(false)
  const [pageFull, setPageFull] = useState(false)
  const full = realFull || pageFull
  const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement || null
  useEffect(() => {
    const on = () => { const f = !!fsElement(); setRealFull(f); if (f) setPageFull(false) }
    document.addEventListener('fullscreenchange', on)
    document.addEventListener('webkitfullscreenchange', on)
    return () => {
      document.removeEventListener('fullscreenchange', on)
      document.removeEventListener('webkitfullscreenchange', on)
    }
  }, [])
  useEffect(() => {
    document.body.classList.toggle('rb-full', full)
    if (pageFull) window.scrollTo(0, 0)
    return () => document.body.classList.remove('rb-full')
  }, [full, pageFull])
  const toggleFull = e => {
    e.stopPropagation()
    if (full) {
      setPageFull(false)
      if (fsElement()) {
        try {
          const out = (document.exitFullscreen || document.webkitExitFullscreen).call(document)
          if (out && out.catch) out.catch(() => {})
        } catch { /* already out */ }
      }
      return
    }
    const el = document.documentElement
    const req = el.requestFullscreen || el.webkitRequestFullscreen
    if (!req) { setPageFull(true); return }
    try {
      Promise.resolve(req.call(el, { navigationUI: 'hide' }))
        // Android turns the field sideways; everywhere else this quietly does nothing.
        .then(() => screen.orientation?.lock?.('landscape')?.catch?.(() => {}))
        .catch(() => setPageFull(true))
    } catch { setPageFull(true) }
  }

  // ── the field ──────────────────────────────────────────────────────────────
  const canvasRef = useRef(null)
  const engine = useRef(null)
  const handlers = useRef({})
  useEffect(() => {
    engine.current = new FieldEngine(canvasRef.current, {
      onPlayEnd: res => handlers.current.playEnd(res),
      onPhase: p => setPhase(p),
      onEvent: e => { if (e.type === 'broken') setToast('Broke a tackle!') },
    })
    engine.current.setStadium(you, them)
    return () => engine.current.destroy()
  }, [])

  const setupField = useCallback(gs => {
    const pb = playBoost.current
    engine.current.setDirection(dirFor(gs))
    engine.current.setup({
      ballOn: gs.ballOn, toGo: gs.toGo, goal: goalToGo(gs), kits,
      phys: physics(values(ratings({ form: career.form, levels: career.levels, facilities: career.facilities, boost })),
                    oppStrength, !!(pb && pb.read)),
    })
  }, [kits, career, boost, oppStrength, dirMode])

  // Re-set the formation when ratings change between snaps (an answer just landed).
  useEffect(() => { if (stage === 'presnap') setupField(gRef.current) }, [stage, setupField, fieldVersion])

  const toPresnap = useCallback(gs => {
    commit(gs)
    // The rare big moment: 3rd-and-long or the red zone, once a half at most.
    const key = gs.half * 1000 + gs.ballOn * 10 + gs.down
    const eligible = !gs.ot && isBigMoment(gs)
    if (eligible && bigMomentAsked.current !== key && liveChecks.current[gs.half] < (rules.live_checks_per_half ?? 1) &&
        Math.random() < (rules.live_check_chance ?? 0.3)) {
      bigMomentAsked.current = key
      liveChecks.current[gs.half] += 1
      setStage('bigmoment')
      return
    }
    setStage('presnap')
  }, [commit, rules])

  const snap = useCallback(() => {
    if (stage !== 'presnap') return
    setToast(null)
    setStage('live')
    engine.current.snap()
  }, [stage])

  useEffect(() => {
    // SPACE snaps (BK's playtest: easier to hit under pressure than Enter). Enter still
    // works as a quiet fallback. `repeat` is ignored so holding the key cannot snap and
    // then immediately hand the ball to a scrambling quarterback.
    const onKey = e => {
      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat && stage === 'presnap' && !gate) { e.preventDefault(); snap() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stage, gate, snap])

  // ── flow ───────────────────────────────────────────────────────────────────
  const finish = useCallback(gs => {
    commit(gs)
    setStage('final')
  }, [commit])

  const oppOvertime = useCallback(gs => {
    const d = simDrive({ opp: oppStrength, defense: v.defense, start: 75, ot: true })
    defenseCut(d)
    setDrive({ d, line: driveLine(them.name, d), stand: standLine(d, v.defense), after: () => {
      const g2 = { ...gs, opp: gs.opp + d.points }
      if (g2.you !== g2.opp || (!playoff && g2.ot >= 2)) return finish(g2)
      const g3 = startOvertime(g2)
      setToast(`Still tied. Overtime ${g3.ot}: your ball at the ${them.abbr} 25.`)
      toPresnap(g3)
    } })
    setStage('drive')
  }, [oppStrength, v.defense, them, playoff, finish, toPresnap])

  const endHalfRef = useRef(null)

  // The defense's moments get a cut-in (BK 2026-10-03 15:46): TAKEAWAY! and STOPPED!.
  const defenseCut = d => {
    // STOPPED! only when they leave with nothing (a field goal still counts against you).
    if (d.result === 'TURNOVER') { setToast(null); engine.current?.celebrate('TAKEAWAY!', 'DEFENSE', 'long') }
    else if (d.stand && d.points === 0) { setToast(null); engine.current?.celebrate('STOPPED!', 'DEFENSE', 'long') }
  }

  const oppDrive = useCallback((gs, start) => {
    if (gs.ot) return oppOvertime(gs)
    if (halfOver(gs)) return endHalfRef.current(gs)
    const d = simDrive({ opp: oppStrength, defense: v.defense, start, secondsLeft: gs.halfLeft })
    defenseCut(d)
    setDrive({ d, line: driveLine(them.name, d), stand: standLine(d, v.defense), after: () => {
      const g2 = applyDrive(gs, d)
      if (d.result === 'END' || halfOver(g2)) return endHalfRef.current(g2)
      toPresnap(g2)
    } })
    setStage('drive')
  }, [oppStrength, v.defense, them, toPresnap, oppOvertime])

  const secondHalf = useCallback(gs => {
    const g2 = startSecondHalf(gs)
    if (gs.firstRecv === 'you') { commit(g2); oppDrive(g2, 25) }
    else toPresnap(firstDown(g2, 25))
  }, [commit, oppDrive, toPresnap])

  const endHalf = useCallback(gs => {
    commit(gs)
    if (gs.half === 1) {
      // Halftime: the locker room. Each right answer is an adjustment for the second half.
      const n = rules.halftime_questions ?? 3
      const results = []
      // The Locker Room (BK, 2026-09-27) takes the FIRST of the halftime questions, once a
      // game, never in the playoffs: no extra taps. Its words are BK's, from the manifest.
      const locker = !playoff && dealer.hasCulture && manifest.culture?.prompt
      // The halftime show (BK 2026-10-03, "a nod to the marching band"): the band crosses the
      // field first, then the questions. A tap skips it.
      const show = then => { setStage('show'); engine.current ? engine.current.band('HALFTIME SHOW', you.colors, then) : then() }
      const next = i => {
        if (i >= n) { setHalftime(results); setStage('halftime'); return }
        if (i === 0 && locker) {
          ask('locker', manifest.culture.prompt, (correct, q) => {
            if (q) results.push({ lane: q.lane, correct })
            if (correct && q) setBoost(b => ({ ...b, [STAT_OF[q.lane]]: Math.min(2, (b[STAT_OF[q.lane]] || 0) + 1) }))
            next(i + 1)
          })
          return
        }
        ask('halftime', `Halftime adjustments — question ${i + 1} of ${n}. A right answer gives that unit +1 for the second half.`,
          (correct, q) => {
            if (q) results.push({ lane: q.lane, correct })
            if (correct && q) setBoost(b => ({ ...b, [STAT_OF[q.lane]]: Math.min(2, (b[STAT_OF[q.lane]] || 0) + 1) }))
            next(i + 1)
          })
      }
      show(() => next(0))
      return
    }
    if (gs.you !== gs.opp) return finish(gs)
    const g3 = startOvertime(gs)
    setToast(`Tied at the end of regulation. Overtime: your ball at the ${them.abbr} 25.`)
    toPresnap(g3)
  }, [commit, rules, ask, finish, toPresnap, them, playoff, dealer, manifest, you])
  endHalfRef.current = endHalf

  // After a score of yours: kick off to them (or the next overtime step).
  const afterYourScore = useCallback(gs => {
    if (gs.ot) return oppOvertime(gs)
    if (halfOver(gs)) return endHalf(gs)
    oppDrive(gs, 25)
  }, [oppOvertime, endHalf, oppDrive])

  // What happens once a play (and any flag on it) is settled.
  const settle = (res, g2, outcome, before) => {
    commit(g2)
    if (outcome.kind === 'td') {
      // Six are banked already (matchRules). What is left is the try, and the student
      // chooses which bet to take: one question for one point, or two for two.
      // The cut-in first (BK 2026-10-03 15:46): TOUCHDOWN!, then the try.
      setStage('show')
      engine.current.celebrate('TOUCHDOWN!', `${you.abbr} SCORES`, 'long', () => setStage('convert'))
      return
    }
    if (outcome.kind === 'safety') return oppDrive(g2, 35)
    if (outcome.kind === 'turnover' || outcome.kind === 'downs') {
      if (outcome.kind === 'downs') setToast('Turnover on downs.')
      else setToast(outcome.why)
      return g2.ot ? oppOvertime(g2) : oppDrive(g2, outcome.oppStart)
    }
    if (halfOver(g2)) return endHalf(g2)
    // BIG PLAY! on 20 yards or more; FIRST DOWN! (the short one) when the chains move.
    const moved = !!outcome.firstDown
    if (res.gained >= 20) {
      setStage('show'); engine.current.celebrate('BIG PLAY!', `+${res.gained} YARDS`, 'long', () => toPresnap(g2)); return
    }
    if (moved) { setStage('show'); engine.current.celebrate('FIRST DOWN!', null, 'short', () => toPresnap(g2)); return }
    toPresnap(g2)
  }

  handlers.current.playEnd = res => {
    const gs = gRef.current
    playBoost.current = null
    const { g: g2, outcome } = applyPlay(gs, res)
    setToast(describe(res, outcome))
    commit(g2)

    // BALL SECURITY (BK 2026-09-29; words approved 11:42). A hard hit (the old fumble roll,
    // rarer for tough players, at most rules.security_per_half a half) or ANY hit just after
    // a jump brings a short question at the dead ball: answer it and you hold on, miss it and
    // it's a fumble. A dive is never one. A touchdown never gets here. One moment per play,
    // so a hit that asks this question can't also draw a flag.
    const hitCap = rules.security_per_half ?? 2
    if (res.type === 'tackle' && !res.dive && (res.afterJump || (res.shaky && hits.current[gs.ot ? 2 : gs.half] < hitCap))) {
      if (!res.afterJump) hits.current[gs.ot ? 2 : gs.half] += 1
      setStage('flag')
      ask('fumble', 'Big hit! Answer this and you hold on to the ball. Miss it and it’s a fumble.',
        correct => {
          if (correct === false) {
            const { g: gf, outcome: of } = applyPlay(gs, { ...res, type: 'fumble' })
            commit(gf)
            return settle(res, gf, of)
          }
          setToast('Ball secured. The tackle stands.')
          settle(res, g2, outcome, gs)
        })
      return
    }

    // FLAG ON THE PLAY (BK, 2026-09-22). A big gain draws a quick check: answer it and
    // the play stands, miss it and it comes back with a penalty and the down replayed.
    // Never on a touchdown — those six are banked and stay banked.
    const half = gs.ot ? 2 : gs.half
    const cap = rules.penalties_per_half ?? 1
    if (isPenaltySpot(res, outcome, rules) && flags.current[half] < cap &&
        Math.random() < (rules.penalty_chance ?? 0.35)) {
      flags.current[half] += 1
      setStage('flag')
      ask('penalty', `Flag down on a ${res.gained}-yard gain. Answer this and the play stands. Miss it and it comes back — ${rules.penalty_yards ?? 10} yards and the down replayed.`,
        correct => {
          if (correct === false) {
            const pg = applyPenalty(gs, g2, rules)
            commit(pg)
            setToast(`Flag on the play — ${pg.penaltyYards} yards. The gain comes back, ${ORD[pg.down]} down again.`)
            if (halfOver(pg)) return endHalf(pg)
            return toPresnap(pg)
          }
          setToast('No flag — the play stands.')
          settle(res, g2, outcome, gs)
        })
      return
    }
    settle(res, g2, outcome, gs)
  }

  // ── the try, after a touchdown (v5, BK) ────────────────────────────────────
  const kickTry = () => {
    setStage('live')
    ask('xp', 'Extra point. Get it right and the kick is good. Miss it and you keep your six — you just don’t get the seventh.',
      correct => {
        const made = correct !== false
        if (!made) missedKicks.current += 1
        const g3 = extraPoint(gRef.current, made)
        commit(g3)
        setToast(made ? 'The kick is good.' : 'Kick is no good. The touchdown stands.')
        afterYourScore(g3)
      })
  }

  // All or nothing, the way the real decision is: every question right, or the try is
  // worth nothing. The touchdown is banked either way.
  const twoPointTry = () => {
    setStage('live')
    const want = rules.two_point_questions ?? 2
    const run = (i, ok) => {
      if (i >= want || !ok) {
        const g3 = twoPoint(gRef.current, ok)
        commit(g3)
        setToast(ok ? 'They got it \u2014 two points.' : 'No good. The touchdown stands, the two does not.')
        return afterYourScore(g3)
      }
      ask('xp', `Going for two \u2014 question ${i + 1} of ${want}. Both have to be right, or the try is worth nothing.`,
        correct => run(i + 1, ok && correct !== false))
    }
    run(0, true)
  }

  // ── pre-snap choices ───────────────────────────────────────────────────────
  const doPunt = () => { const { g: g2, oppStart } = punt(gRef.current); setToast('Punt.'); commit(g2); oppDrive(g2, oppStart) }
  const doKick = () => {
    const { g: g2, good, oppStart } = fieldGoal(gRef.current)
    setToast(good ? `Field goal is good from ${kickDistance(gRef.current)}.` : `Field goal from ${kickDistance(gRef.current)} is no good.`)
    commit(g2)
    if (g2.ot) return oppOvertime(g2)
    if (halfOver(g2)) return endHalf(g2)
    oppDrive(g2, good ? 25 : oppStart)
  }
  const doTimeout = () => {
    ask('timeout', 'Timeout. The clock stops either way. Get it right and your coaches spot something: your receivers get a step on the next snap.',
      correct => {
        const g2 = callTimeout(gRef.current)
        if (correct) setRead(true)
        setToast(correct ? 'Adjustment made — watch your receivers get open.' : 'Clock stopped. No adjustment this time.')
        commit(g2)
        setStage('presnap')
      })
  }
  const takeBigMoment = () => {
    setStage('presnap')
    ask('live', 'Big moment. Read this right and your receivers get a step on this snap. Miss it and you just run the play.',
      correct => { if (correct) setRead(true); setToast(correct ? 'You read it. Go.' : 'Run the play.') })
  }

  const start = () => {
    ask('coin', 'Coin toss. Get it right and you win the toss and receive. Miss it and they get the ball first.', correct => {
      const recv = correct === false ? 'opp' : 'you'
      const g2 = { ...gRef.current, firstRecv: recv }
      commit(g2)
      setToast(recv === 'you' ? 'You won the toss. Your ball at the 25.' : `${them.name} won the toss and will receive.`)
      if (recv === 'you') toPresnap(firstDown(g2, 25))
      else oppDrive(g2, 25)
    })
  }

  const final = () => {
    // Regular season: Leo's culture question at the podium (BK, 2026-09-28, Plan A). Playoffs: history.
    // Leo's podium set (BK 2026-09-29 12:35) is asked by result: a tie counts as a loss.
    const g0 = gRef.current
    const after = g0.you > g0.opp ? 'win' : 'loss'
    ask(!playoff && (dealer.hasPodium || dealer.hasCulture) ? 'podium' : 'press', 'Press conference. The room wants an answer. A good one earns the fans’ trust and a bonus.', correct => {
      const gs = gRef.current
      onFinish({
        you: gs.you, opp: gs.opp,
        result: gs.you > gs.opp ? RESULT.W : gs.you < gs.opp ? RESULT.L : RESULT.T,
        press: correct === true,
        right: tally.current.right, total: tally.current.total,
      })
    }, { after })
  }

  // ── render ─────────────────────────────────────────────────────────────────
  const clock = clockOf(g)
  const fourth = g.down === 4
  const kickable = canKick(g) && (fourth || g.halfLeft <= 40 || g.ot)
  const statCells = [['throwing', 'Throw'], ['hands', 'Hands'], ['speed', 'Speed'], ['blocking', 'Block'], ['toughness', 'Tough'], ['defense', 'Def']]
  const help = {
    dropback: 'Pull back and release to throw · tap a receiver to throw to him · tap the field to run · keys 1–4 throw · Space runs',   // BK approved 2026-09-28 13:53
    air: 'Ball in the air…',
    run: 'Hold and point to steer · tap or Space to juke · D to dive · J to jump',   // BK approved 2026-09-29 11:42
  }[phase]
  // Phones have no keys: a shorter dropback tip on narrow screens (BK 2026-09-28 13:58, "yes").
  const helpShort = {
    dropback: 'Pull back to throw · tap a receiver · tap the field to run',
    run: 'Steer with your finger · tap to juke · Dive or Jump',   // BK approved 2026-09-29 11:42
  }[phase]

  return (
    <div className="match">
      {/* The LED board (the 16-bit reskin, 2026-10-03): same facts as before, drawn in lights. */}
      <LedBoard left={{ abbr: you.abbr, score: g.you, color: you.colors[1] === '#FFFFFF' ? you.colors[0] : you.colors[1] }}
                right={{ abbr: them.abbr, score: g.opp, color: them.colors[1] === '#FFFFFF' ? them.colors[0] : them.colors[1] }}
                mid1={`${clock.label} · ${clock.time}`}
                mid2={stage === 'presnap' || stage === 'live'
                  ? `${ORD[g.down]} & ${goalToGo(g) ? 'Goal' : g.toGo} · ${ballOnText(g.ballOn, them)}`
                  : weekLabel}
                label={`${you.abbr} ${g.you}, ${them.abbr} ${g.opp}. ${clock.label}, ${clock.time}.`} />

      <div className="field-wrap" onClick={() => { if (stage === 'presnap' && !gate) snap() }}>
        <canvas ref={canvasRef} className="field" aria-label="The field. Live play." />
        <button type="button" className="fs-btn" onClick={toggleFull} aria-pressed={full}>
          {full ? 'Exit full screen' : 'Full screen'}
        </button>
        {stage === 'live' && phase === 'run' && !gate && (
          <div className="run-moves">
            <button type="button" className="move-btn dive" onPointerDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); engine.current?.dive() }}>Dive</button>
            <button type="button" className="move-btn jump" onPointerDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); engine.current?.jump() }}>Jump</button>
          </div>
        )}
        {toast && stage !== 'show' && <div className="toast" role="status">{toast}</div>}
        {stage === 'presnap' && !gate && <div className="snap-hint">Tap the field or press Space to snap</div>}
        {stage === 'live' && help && (helpShort
          ? <div className="snap-hint"><span className="tip-full">{help}</span><span className="tip-short">{helpShort}</span></div>
          : <div className="snap-hint">{help}</div>)}
      </div>
      {/* Under the field, never on it (BK approved the words 2026-09-29 11:42). */}
      {full && <div className="turn-tip" role="note">Turn your phone sideways for a bigger field.</div>}

      <div className="stat-flash-slot">
        {flash && <div key={flash.id} className={`stat-flash ${flash.up ? 'up' : ''}`} role="status">{flash.text}</div>}
      </div>
      <div className="stat-strip" aria-label="Your team's stats, built from your answers">
        {statCells.map(([k, label]) => (
          <div className={`stat-cell${flash && flash.stat === k ? ' lit' : ''}`} key={k} title={k === 'defense' ? 'Trained in Practice Week' : undefined}>
            <span className="stat-name">{label}</span>
            <span className="stat-bar"><i style={{ width: `${r[k].value * 10}%` }} /></span>
            <b>{r[k].value}</b>
            {boost[k] ? <em className="stat-boost">+{boost[k]}</em> : null}
          </div>
        ))}
      </div>

      {stage === 'presnap' && !gate && (
        <div className="controls">
          <button type="button" className="btn-primary" onClick={snap}>Snap</button>
          {fourth && !g.ot && <button type="button" className="btn-secondary" onClick={doPunt}>Punt</button>}
          {kickable && (
            <button type="button" className="btn-secondary" onClick={doKick}>
              Field goal · {kickDistance(g)} yds · {Math.round(kickChance(g) * 100)}%
            </button>
          )}
          {!g.ot && (
            <button type="button" className="btn-ghost" disabled={g.timeouts <= 0} onClick={doTimeout}>
              Timeout ({g.timeouts} left)
            </button>
          )}
          <button type="button" className="btn-ghost" onClick={() => setDirMode(m => DIRS[(DIRS.indexOf(m) + 1) % DIRS.length])}>
            {DIR_LABEL[dirMode]}
          </button>
          {fourth && <span className="controls-note">4th down: go for it with Snap, or kick.</span>}
        </div>
      )}

      {stage === 'intro' && (
        <div className="panel center">
          <div className="eyebrow">{weekLabel}</div>
          <h2 className="h2">{you.name} vs {them.name}</h2>
          <p className="sub">{playoff ? 'Playoffs run cold: no hints on any question today.' : 'Two hints are available on every question this regular season.'}</p>
          <button type="button" className="btn-primary" onClick={start}>Coin toss</button>
        </div>
      )}

      {stage === 'convert' && (
        <div className="panel center">
          <div className="eyebrow">Touchdown — six on the board</div>
          <h2 className="h2">{you.abbr} {g.you} – {g.opp} {them.abbr}</h2>
          <p className="sub">
            The six are yours either way. Now take the kick, or go for two.
            {missedKicks.current > 0 && <b> You have missed {missedKicks.current === 1 ? 'a kick' : `${missedKicks.current} kicks`} today — two would get {missedKicks.current === 1 ? 'it' : 'some of it'} back.</b>}
          </p>
          <div className="row center">
            <button type="button" className="btn-primary" autoFocus onClick={kickTry}>Kick it · 1 question for 1 point</button>
            <button type="button" className="btn-secondary" onClick={twoPointTry}>
              Go for two · {rules.two_point_questions ?? 2} questions for 2 points
            </button>
          </div>
          <p className="sub small">Going for two is all or nothing: miss either question and the try is worth nothing.</p>
        </div>
      )}

      {stage === 'bigmoment' && (
        <div className="panel center">
          <div className="eyebrow">Big moment</div>
          <p className="sub">{g.down === 3 && g.toGo >= 8 ? `3rd and ${g.toGo}.` : 'Red zone.'} Answer one question for a better read on this snap — or just run it.</p>
          <div className="row">
            <button type="button" className="btn-primary" onClick={takeBigMoment}>Take the question</button>
            <button type="button" className="btn-ghost" onClick={() => setStage('presnap')}>Just snap it</button>
          </div>
        </div>
      )}

      {stage === 'drive' && drive && (
        <div className="panel center">
          <div className="eyebrow">{them.name} have the ball</div>
          <p className="drive-line">{drive.line}</p>
          {drive.stand
            ? <p className="sub stand-line">{drive.stand}</p>
            : <p className="sub">Your Defense rating ({v.defense}) comes out of Practice Week film study, and it counts for most when they get close.</p>}
          <button type="button" className="btn-primary" autoFocus onClick={() => { const a = drive.after; setDrive(null); a() }}>Continue</button>
        </div>
      )}

      {stage === 'halftime' && (
        <div className="panel center">
          <div className="eyebrow">Halftime · {you.abbr} {g.you} – {g.opp} {them.abbr}</div>
          {halftime && halftime.length ? (
            <ul className="ht-list">
              {halftime.map((h, i) => (
                <li key={i}>{h.correct
                  ? `${manifest.lanes[h.lane]?.stat_label}: +1 for the second half`
                  : `${manifest.lanes[h.lane]?.label}: no adjustment`}</li>
              ))}
            </ul>
          ) : <p className="sub">No adjustments.</p>}
          <button type="button" className="btn-primary" autoFocus onClick={() => { setHalftime(null); secondHalf(gRef.current) }}>Second half</button>
        </div>
      )}

      {stage === 'final' && (
        <div className="panel center">
          <div className="eyebrow">Final{g.ot ? ` · ${clockOf(g).label}` : ''}</div>
          <h2 className="h2">{you.abbr} {g.you} – {g.opp} {them.abbr}</h2>
          <p className="sub">{g.you > g.opp ? 'A win.' : g.you < g.opp ? 'A loss.' : 'A tie.'} Questions today: {tally.current.total} answered.</p>
          <button type="button" className="btn-primary" autoFocus onClick={final}>Press conference</button>
        </div>
      )}

      {gate && (
        <Question key={gate.serial} q={gate.q} gate={gateLabel(gate.kind)} stakes={gate.stakes} hints={hints}
                  statLine={gate.q.culture ? `Builds ${manifest.lanes[gate.q.lane]?.stat_label} · Be a Hawk` : `Builds ${manifest.lanes[gate.q.lane]?.stat_label} · ${manifest.lanes[gate.q.lane]?.label}`}
                  chip={gate.q.size === 'long' ? manifest.culture?.long_chip : null}
                  onDone={answered} />
      )}
    </div>
  )
}
