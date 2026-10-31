// ============================================================
// GAME DAY, BASKETBALL — one game, tip-off to press conference.
//
// BK, 2026-10-31 18:25–18:38: the third Review Bowl sport, same league, save file, question pipeline
// and Locker Room as football and volleyball; boys' and girls' both offered; the gym and the
// halftime band in the home team's colours. Questions only at basketball's own stoppages: the
// tip-off, timeouts, the quarter breaks, halftime (the band, then the Locker Room first), the last
// trip of a one-score game (the optional big moment) and the press conference. A possession never
// stops for a question. Same gates, same dealer, same stat layer: what a student knows reaches the
// floor as ratings → hoopsRules.js → hoops.js.
//
// ENGINE PASS (2026-10-31): reachable from the dev lab only (#hoops). Every word is PROPOSED (sport.js BB).
// ============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Question from '../ui/Question.jsx'
import LedBoard from '../ui/LedBoard.jsx'
import { gateLabel } from '../content/dealer.js'
import { createHoops } from './hoops.js'
import { LANE_OF, STAT_OF, ratings, values } from './ratings.js'
import { TEAMS, roster } from './teams.js'
import { RESULT } from './season.js'
import { BB, VB, statLabel } from './sport.js'

export default function HoopsMatch({ career, dealer, manifest, opp, oppStrength, playoff, weekLabel, onAnswer, onFinish,
  howtoSeen, onHowtoSeen, girls = false, home = 'you' }) {
  const rules = manifest.rules || {}
  const you = TEAMS[career.team]
  const them = TEAMS[opp]
  const hints = playoff ? !!rules.hints_playoffs : rules.hints_regular_season !== false
  const label = s => statLabel('basketball', manifest, s, LANE_OF)

  const [stage, setStage] = useState('intro')        // intro · howto · play · break · final
  const [gate, setGate] = useState(null)
  const gateRef = useRef(null)
  const [ui, setUi] = useState({ text: '', buttons: [] })
  const [coach, setCoach] = useState(null)
  const [big, setBig] = useState(null)               // the last trip of a one-score game: { who, ot, go }
  const [help, setHelp] = useState(false)
  const [toast, setToast] = useState(null)
  const [flash, setFlash] = useState(null)
  const [boost, setBoost] = useState({})             // break adjustments, the next quarter only
  const [breakResults, setBreakResults] = useState(null)
  const [board, setBoard] = useState({ score: [0, 0], periodName: 'Q1', clock: '8:00', period: 1 })
  const [steady, setSteady] = useState(false)
  const tally = useRef({ right: 0, total: 0 })
  const finalInfo = useRef(null)

  const r = ratings({ form: career.form, levels: career.levels, facilities: career.facilities, boost })
  const v = values(r)
  const tutorial = !playoff && career.season === 1 && career.week === 0 && career.phase === 'regular'

  // ── the court ───────────────────────────────────────────────────────────────
  const canvasRef = useRef(null)
  const court = useRef(null)
  const h = useRef({})
  const numbers = useMemo(() => {
    const ro = roster(career.seed, career.team, career.season, career.levels, 'basketball', girls)
    return { PG: ro.throwing.number, SG: ro.hands.number, SF: ro.speed.number, PF: ro.blocking.number, C: ro.toughness.number }
  }, [career.seed, career.team, career.season, career.levels, girls])

  useEffect(() => {
    court.current = createHoops(canvasRef.current, {
      you: career.team, opp, stats: v, oppStrength, numbers, girls, home,
      // Auto-play is a test harness for the dev build only (#hoops-auto); a student's build never has it.
      auto: import.meta.env.DEV && typeof location !== 'undefined' && location.hash === '#hoops-auto',
      onUI: x => setUi(x),
      onCoach: k => setCoach(k),
      onTimeout: () => h.current.timeout(),
      beforePossession: (info, go) => setBig({ ...info, go }),
      onScore: x => setBoard(x),
      onPeriodEnd: info => h.current.periodEnd(info),
      onGameEnd: info => h.current.gameEnd(info),
      blocked: () => !!gateRef.current,
    })
    court.current.intro()
    if (import.meta.env.DEV) window.__hoops = court.current
    return () => court.current.destroy()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // An answer just landed, or a break adjustment: the floor plays with the new numbers.
  useEffect(() => { court.current?.setStats(v, oppStrength) }, [JSON.stringify(v), oppStrength])
  useEffect(() => { court.current?.setSteady(steady) }, [steady])

  // ── gates ──────────────────────────────────────────────────────────────────
  const ask = useCallback((kind, stakes, then, opts = {}) => {
    const q = dealer.draw(kind, { playoff, ...opts })
    if (!q) { then(null); return }
    const g = { kind, q, stakes, then, serial: Math.random() }
    gateRef.current = g
    setGate(g)
  }, [dealer, playoff])

  const answered = ({ correct, hintsUsed, q }) => {
    const cur = gateRef.current
    if (!cur) return
    gateRef.current = null
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

  const startPlay = first => { setStage('play'); court.current.start(first, tutorial) }

  const tipOff = () => {
    ask('tipoff', BB.tipStake, correct => {
      const first = correct === false ? 'them' : 'you'
      setToast(first === 'you' ? BB.tipYou : BB.tipThem(them.name))
      if (!howtoSeen) { setStage('howto'); h.current.afterHowto = () => startPlay(first) }
      else startPlay(first)
    })
  }

  h.current.timeout = () => {
    ask('timeout', BB.timeoutStake, correct => {
      setToast(correct ? BB.timeoutRight : BB.timeoutWrong)
      court.current.timeoutTaken(!!correct)
    })
  }
  // A break: one question between quarters; at halftime the band, the Locker Room, then the rest.
  h.current.periodEnd = info => {
    setToast(null)
    setBoost({})
    const results = []
    const plus = q => setBoost(b => ({ ...b, [STAT_OF[q.lane]]: Math.min(2, (b[STAT_OF[q.lane]] || 0) + 1) }))
    const done = () => { setBreakResults({ results, info }); setStage('break') }
    if (!info.half) {
      ask('qbreak', BB.quarterStake(info.period), (correct, q) => { if (q) { results.push({ lane: q.lane, correct }); if (correct) plus(q) } done() })
      return
    }
    const n = rules.halftime_questions ?? 3
    const locker = !playoff && dealer.hasCulture && manifest.culture?.prompt
    const next = i => {
      if (i >= n) { done(); return }
      if (i === 0 && locker) {
        ask('locker', BB.locker, (correct, q) => { if (q) { results.push({ lane: q.lane, correct }); if (correct) plus(q) } next(i + 1) })
        return
      }
      ask('halftime', BB.halfStake(i + 1, n), (correct, q) => { if (q) { results.push({ lane: q.lane, correct }); if (correct) plus(q) } next(i + 1) })
    }
    court.current.band(() => next(0))
  }
  h.current.gameEnd = info => { finalInfo.current = info; setStage('final') }

  const takeBig = () => {
    const b = big; setBig(null)
    ask('live', BB.bigMomentStake, correct => {
      court.current.setReadBoost(!!correct)
      setToast(correct ? BB.readYes : BB.readNo)
      b.go()
    })
  }
  const skipBig = () => { const b = big; setBig(null); b.go() }

  const nextPeriod = () => {
    setBreakResults(null)
    setStage('play')
    court.current.nextPeriod()
  }

  const final = () => {
    const [a, b] = finalInfo.current?.score || board.score
    const after = a > b ? 'win' : 'loss'
    ask(!playoff && (dealer.hasPodium || dealer.hasCulture) ? 'podium' : 'press', 'Press conference. The room wants an answer. A good one earns the fans’ trust and a bonus.', correct => {
      onFinish({ you: a, opp: b, result: a > b ? RESULT.W : RESULT.L, press: correct === true, right: tally.current.right, total: tally.current.total })
    }, { after })
  }

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3200); return () => clearTimeout(t) }, [toast])

  // ── full screen: the same behaviour as the other two sports ─────────────────
  const [realFull, setRealFull] = useState(false)
  const [pageFull, setPageFull] = useState(false)
  const full = realFull || pageFull
  const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement || null
  useEffect(() => {
    const on = () => { const f = !!fsElement(); setRealFull(f); if (f) setPageFull(false) }
    document.addEventListener('fullscreenchange', on)
    document.addEventListener('webkitfullscreenchange', on)
    return () => { document.removeEventListener('fullscreenchange', on); document.removeEventListener('webkitfullscreenchange', on) }
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
      if (fsElement()) { try { const out = (document.exitFullscreen || document.webkitExitFullscreen).call(document); if (out && out.catch) out.catch(() => {}) } catch { /* out */ } }
      return
    }
    const el = document.documentElement
    const req = el.requestFullscreen || el.webkitRequestFullscreen
    if (!req) { setPageFull(true); return }
    try {
      Promise.resolve(req.call(el, { navigationUI: 'hide' }))
        .then(() => screen.orientation?.lock?.('landscape')?.catch?.(() => {}))
        .catch(() => setPageFull(true))
    } catch { setPageFull(true) }
  }

  const playing = stage === 'play' && !gate && !big && !coach && !help
  const openHelp = () => { if (!playing) return; court.current.pause(); setHelp(true) }
  const closeHelp = () => { setHelp(false); court.current.resume() }
  const coachCard = coach && BB.coach[coach]
  const ledColor = t => (t.colors[1] === '#FFFFFF' ? t.colors[0] : t.colors[1])

  return (
    <div className="match vb bb">
      <LedBoard left={{ abbr: you.abbr, score: board.score[0], color: ledColor(you) }}
                right={{ abbr: them.abbr, score: board.score[1], color: ledColor(them) }}
                mid1={board.periodName}
                mid2={stage === 'intro' ? weekLabel : board.clock}
                label={`${you.abbr} ${board.score[0]}, ${them.abbr} ${board.score[1]}. ${board.periodName}, ${board.clock} left.`} />

      <div className="field-wrap court-wrap">
        <canvas ref={canvasRef} className="field court" width="480" height="270"
                aria-label="Basketball court. Use the call bar or the keyboard to play." />
        <button type="button" className="fs-btn" onClick={toggleFull} aria-pressed={full}>
          {full ? 'Exit full screen' : 'Full screen'}
        </button>
        {toast && <div className="toast" role="status">{toast}</div>}

        {(stage === 'howto' || help) && (
          <div className="vb-over" role="dialog" aria-modal="true" aria-labelledby="bb-howto">
            <div className="vb-card">
              <h2 className="h2" id="bb-howto">{BB.howtoTitle}</h2>
              <ul className="vb-howto">{BB.howto.map(([a, b]) => <li key={a}><b>{a}</b> {b}</li>)}</ul>
              <p className="vb-note">{BB.howtoNote}</p>
              <p className="vb-turn">{BB.howtoTurn}</p>
              <button type="button" className="btn-primary" autoFocus onClick={() => {
                if (stage === 'howto') { onHowtoSeen?.(); const f = h.current.afterHowto; h.current.afterHowto = null; f && f() }
                else closeHelp()
              }}>{BB.howtoGo}</button>
            </div>
          </div>
        )}

        {coachCard && !gate && (
          <div className="vb-over coach" role="dialog" aria-modal="true" aria-labelledby="bb-coach">
            <div className="vb-card">
              <div className="eyebrow" id="bb-coach">{coachCard[0]}</div>
              <p className="vb-coach-line">{coachCard[1]}</p>
              <div className="row">
                <button type="button" className="btn-primary" autoFocus onClick={() => court.current.coachDone(false)}>{BB.coachGo}</button>
                {coach !== 'wrap' && <button type="button" className="btn-ghost" onClick={() => court.current.coachDone(true)}>{BB.coachSkip}</button>}
              </div>
            </div>
          </div>
        )}
      </div>
      <p className="vb-turn-strip">{BB.howtoTurn}</p>

      {stage === 'play' && (
        <div className="controls vb-bar" aria-live="polite">
          <p className="vb-prompt">{ui.text}</p>
          <div className="vb-calls">
            {ui.buttons.map((b, i) => (
              <button key={b.label + i} type="button" className={b.timeout ? 'btn-ghost' : 'btn-secondary'}
                      disabled={b.disabled || !playing} title={b.disabled ? b.why : undefined}
                      onClick={() => court.current.call(i)}>
                {b.label}{b.key && <span className="vb-key" aria-hidden="true">{b.key}</span>}
              </button>
            ))}
          </div>
          <div className="vb-tools">
            <button type="button" className="btn-ghost vb-steady" aria-pressed={steady} onClick={() => setSteady(s => !s)}>
              {steady ? BB.steadyOn : BB.steady}
            </button>
            <button type="button" className="btn-ghost vb-help" aria-label={BB.howtoTitle} title={BB.howtoTitle} onClick={openHelp}>?</button>
          </div>
        </div>
      )}

      <div className="stat-flash-slot">
        {flash && <div key={flash.id} className={`stat-flash ${flash.up ? 'up' : ''}`} role="status">{flash.text}</div>}
      </div>
      <div className="stat-strip" aria-label="Your team's stats, built from your answers">
        {BB.cells.map(([k, short]) => (
          <div className={`stat-cell${flash && flash.stat === k ? ' lit' : ''}`} key={k} title={label(k)}>
            <span className="stat-name">{short}</span>
            <span className="stat-bar"><i style={{ width: `${r[k].value * 10}%` }} /></span>
            <b>{r[k].value}</b>
            {boost[k] ? <em className="stat-boost">+{boost[k]}</em> : null}
          </div>
        ))}
      </div>

      {stage === 'intro' && (
        <div className="panel center">
          <div className="eyebrow">{weekLabel}</div>
          <h2 className="h2">{you.name} vs {them.name}</h2>
          <p className="sub">{BB.rulesLine} {playoff ? VB.matchIntroCold : VB.matchIntroHints}</p>
          <button type="button" className="btn-primary" onClick={tipOff}>{BB.tipButton}</button>
        </div>
      )}

      {big && !gate && (
        <div className="panel center">
          <div className="eyebrow">{BB.bigMomentHead}</div>
          <p className="sub">{BB.bigMomentBody(big.who, big.ot)}</p>
          <div className="row center">
            <button type="button" className="btn-primary" autoFocus onClick={takeBig}>{BB.bigMomentTake}</button>
            <button type="button" className="btn-ghost" onClick={skipBig}>{BB.bigMomentSkip}</button>
          </div>
        </div>
      )}

      {stage === 'break' && breakResults && (
        <div className="panel center">
          <div className="eyebrow">{BB.breakHead(BB.breakLabel(breakResults.info.period), you.abbr, breakResults.info.score[0], breakResults.info.score[1], them.abbr)}</div>
          {breakResults.results.length ? (
            <ul className="ht-list">
              {breakResults.results.map((x, i) => (
                <li key={i}>{x.correct ? BB.breakPlus(label(STAT_OF[x.lane])) : BB.breakNone(manifest.lanes[x.lane]?.label)}</li>
              ))}
            </ul>
          ) : <p className="sub">{BB.noAdjust}</p>}
          <button type="button" className="btn-primary" autoFocus onClick={nextPeriod}>{BB.nextPeriod(breakResults.info.period + 1)}</button>
        </div>
      )}

      {stage === 'final' && (
        <div className="panel center">
          <div className="eyebrow">{BB.finalHead}</div>
          <h2 className="h2">{you.abbr} {board.score[0]} – {board.score[1]} {them.abbr}</h2>
          <p className="sub">{board.score[0] > board.score[1] ? 'A win.' : 'A loss.'} Questions today: {tally.current.total} answered.</p>
          <button type="button" className="btn-primary" autoFocus onClick={final}>{BB.pressButton}</button>
        </div>
      )}

      {gate && (
        <Question key={gate.serial} q={gate.q} gate={gateLabel(gate.kind)} stakes={gate.stakes} hints={hints}
                  statLine={gate.q.culture ? `Builds ${label(STAT_OF[gate.q.lane])} · Be a Hawk` : `Builds ${label(STAT_OF[gate.q.lane])} · ${manifest.lanes[gate.q.lane]?.label}`}
                  chip={gate.q.size === 'long' ? manifest.culture?.long_chip : null}
                  onDone={answered} />
      )}
    </div>
  )
}
