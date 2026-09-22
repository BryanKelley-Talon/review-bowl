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
import { gateLabel } from '../content/dealer.js'
import { FieldEngine } from './field.js'
import { driveLine, simDrive } from './drive.js'
import {
  applyDrive, applyPlay, callTimeout, canKick, clockOf, extraPoint, fieldGoal, firstDown, goalToGo,
  halfOver, kickChance, kickDistance, newGame, punt, startOvertime, startSecondHalf,
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
  const tally = useRef({ right: 0, total: 0 })
  const bigMomentAsked = useRef(-1)

  const r = ratings({ form: career.form, stars: career.stars, facilities: career.facilities, boost })
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
    return () => engine.current.destroy()
  }, [])

  const setupField = useCallback(gs => {
    const pb = playBoost.current
    engine.current.setup({
      ballOn: gs.ballOn, toGo: gs.toGo, goal: goalToGo(gs), kits,
      phys: physics(values(ratings({ form: career.form, stars: career.stars, facilities: career.facilities, boost })),
                    oppStrength, !!(pb && pb.read)),
    })
  }, [kits, career, boost, oppStrength])

  // Re-set the formation when ratings change between snaps (an answer just landed).
  useEffect(() => { if (stage === 'presnap') setupField(gRef.current) }, [stage, setupField, fieldVersion])

  const toPresnap = useCallback(gs => {
    commit(gs)
    // The rare big moment: 3rd-and-long or the red zone, once a half at most.
    const key = gs.half * 1000 + gs.ballOn * 10 + gs.down
    const eligible = !gs.ot && ((gs.down === 3 && gs.toGo >= 8) || gs.ballOn >= 80)
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
    const onKey = e => { if (e.key === 'Enter' && stage === 'presnap' && !gate) { e.preventDefault(); snap() } }
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
    setDrive({ d, line: driveLine(them.name, d), after: () => {
      const g2 = { ...gs, opp: gs.opp + d.points }
      if (g2.you !== g2.opp || (!playoff && g2.ot >= 2)) return finish(g2)
      const g3 = startOvertime(g2)
      setToast(`Still tied. Overtime ${g3.ot}: your ball at the ${them.abbr} 25.`)
      toPresnap(g3)
    } })
    setStage('drive')
  }, [oppStrength, v.defense, them, playoff, finish, toPresnap])

  const endHalfRef = useRef(null)

  const oppDrive = useCallback((gs, start) => {
    if (gs.ot) return oppOvertime(gs)
    if (halfOver(gs)) return endHalfRef.current(gs)
    const d = simDrive({ opp: oppStrength, defense: v.defense, start, secondsLeft: gs.halfLeft })
    setDrive({ d, line: driveLine(them.name, d), after: () => {
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
      const next = i => {
        if (i >= n) { setHalftime(results); setStage('halftime'); return }
        ask('halftime', `Halftime adjustments — question ${i + 1} of ${n}. A right answer gives that unit +1 for the second half.`,
          (correct, q) => {
            if (q) results.push({ lane: q.lane, correct })
            if (correct && q) setBoost(b => ({ ...b, [STAT_OF[q.lane]]: Math.min(2, (b[STAT_OF[q.lane]] || 0) + 1) }))
            next(i + 1)
          })
      }
      next(0)
      return
    }
    if (gs.you !== gs.opp) return finish(gs)
    const g3 = startOvertime(gs)
    setToast(`Tied at the end of regulation. Overtime: your ball at the ${them.abbr} 25.`)
    toPresnap(g3)
  }, [commit, rules, ask, finish, toPresnap, them])
  endHalfRef.current = endHalf

  // After a score of yours: kick off to them (or the next overtime step).
  const afterYourScore = useCallback(gs => {
    if (gs.ot) return oppOvertime(gs)
    if (halfOver(gs)) return endHalf(gs)
    oppDrive(gs, 25)
  }, [oppOvertime, endHalf, oppDrive])

  handlers.current.playEnd = res => {
    const gs = gRef.current
    playBoost.current = null
    const { g: g2, outcome } = applyPlay(gs, res)
    setToast(describe(res, outcome))
    commit(g2)
    if (outcome.kind === 'td') {
      // Six are banked already. The question can only add the seventh.
      ask('xp', 'Extra point. Get it right and the kick is good. Miss it and you keep your six — you just don’t get the seventh.',
        correct => {
          const g3 = extraPoint(gRef.current, correct !== false)
          commit(g3)
          setToast(correct === false ? 'Kick is no good. The touchdown stands.' : 'The kick is good.')
          afterYourScore(g3)
        })
      return
    }
    if (outcome.kind === 'safety') return oppDrive(g2, 35)
    if (outcome.kind === 'turnover' || outcome.kind === 'downs') {
      if (outcome.kind === 'downs') setToast('Turnover on downs.')
      else setToast(outcome.why)
      return g2.ot ? oppOvertime(g2) : oppDrive(g2, outcome.oppStart)
    }
    if (halfOver(g2)) return endHalf(g2)
    toPresnap(g2)
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
    ask('press', 'Press conference. The room wants an answer. A good one earns the fans’ trust and a bonus.', correct => {
      const gs = gRef.current
      onFinish({
        you: gs.you, opp: gs.opp,
        result: gs.you > gs.opp ? RESULT.W : gs.you < gs.opp ? RESULT.L : RESULT.T,
        press: correct === true,
        right: tally.current.right, total: tally.current.total,
      })
    })
  }

  // ── render ─────────────────────────────────────────────────────────────────
  const clock = clockOf(g)
  const fourth = g.down === 4
  const kickable = canKick(g) && (fourth || g.halfLeft <= 40 || g.ot)
  const statCells = [['throwing', 'Throw'], ['hands', 'Hands'], ['speed', 'Speed'], ['blocking', 'Block'], ['toughness', 'Tough'], ['defense', 'Def']]
  const help = {
    dropback: 'Drag back and release to throw · tap to run · keys 1–4 throw · Space runs',
    air: 'Ball in the air…',
    run: 'Hold and point to steer · tap or Space to juke · ↑/↓ steer',
  }[phase]

  return (
    <div className="match">
      <div className="scoreboard" aria-live="polite">
        <div className="sb-team" style={{ borderColor: you.colors[1] === '#FFFFFF' ? you.colors[0] : you.colors[1] }}>
          <span className="sb-abbr">{you.abbr}</span><span className="sb-score">{g.you}</span>
        </div>
        <div className="sb-mid">
          <div className="sb-clock">{clock.label} · {clock.time}</div>
          <div className="sb-down">
            {stage === 'presnap' || stage === 'live'
              ? `${ORD[g.down]} & ${goalToGo(g) ? 'Goal' : g.toGo} · ${ballOnText(g.ballOn, them)}`
              : weekLabel}
          </div>
        </div>
        <div className="sb-team right" style={{ borderColor: them.colors[1] === '#FFFFFF' ? them.colors[0] : them.colors[1] }}>
          <span className="sb-score">{g.opp}</span><span className="sb-abbr">{them.abbr}</span>
        </div>
      </div>

      <div className="field-wrap" onClick={() => { if (stage === 'presnap' && !gate) snap() }}>
        <canvas ref={canvasRef} className="field" aria-label="The field. Live play." />
        {toast && <div className="toast" role="status">{toast}</div>}
        {stage === 'presnap' && !gate && <div className="snap-hint">Tap the field or press Enter to snap</div>}
        {stage === 'live' && help && <div className="snap-hint">{help}</div>}
      </div>

      {flash && <div key={flash.id} className={`stat-flash ${flash.up ? 'up' : ''}`} role="status">{flash.text}</div>}
      <div className="stat-strip" aria-label="Your team's stats, built from your answers">
        {statCells.map(([k, label]) => (
          <div className={`stat-cell${flash && flash.stat === k ? ' lit' : ''}`} key={k} title={k === 'defense' ? 'Average of the five' : undefined}>
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
          <p className="sub">Your Defense rating ({v.defense}) is the average of your five stats — every lane of content holds them.</p>
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
          <p className="sub">{g.you > g.opp ? 'A win.' : g.you < g.opp ? 'A loss.' : 'A tie.'} Questions today: {tally.current.right} of {tally.current.total} right.</p>
          <button type="button" className="btn-primary" autoFocus onClick={final}>Press conference</button>
        </div>
      )}

      {gate && (
        <Question key={gate.serial} q={gate.q} gate={gateLabel(gate.kind)} stakes={gate.stakes} hints={hints}
                  statLine={`Builds ${manifest.lanes[gate.q.lane]?.stat_label} · ${manifest.lanes[gate.q.lane]?.label}`}
                  onDone={answered} />
      )}
    </div>
  )
}
