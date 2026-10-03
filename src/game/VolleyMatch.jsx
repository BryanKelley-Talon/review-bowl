// ============================================================
// MATCH DAY, VOLLEYBALL — one match, coin toss to press conference.
//
// BK's rulings, 2026-10-03: a sport pick inside the Review Bowl (01:14), the feel as built (01:08),
// best of 3 sets to 15, girls' season, 16-bit from day one (01:55), phone playability matters.
// Questions only at the sport's own stoppages: the coin toss, timeouts, the set break (volleyball's
// halftime, with the Locker Room first), set point (the optional big moment) and the press
// conference. A rally never stops for a question. Same gates, same dealer, same stat layer as
// football: what a student knows reaches the court as ratings → court.js.
// ============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Question from '../ui/Question.jsx'
import LedBoard from '../ui/LedBoard.jsx'
import { gateLabel } from '../content/dealer.js'
import { createCourt } from './court.js'
import { LANE_OF, STAT_OF, ratings, values } from './ratings.js'
import { TEAMS, roster } from './teams.js'
import { RESULT } from './season.js'
import { SHARED_VB, VB, statLabel } from './sport.js'

const CELLS = [['throwing', 'Set'], ['hands', 'Pass'], ['speed', 'Hit'], ['blocking', 'Block'], ['toughness', 'Serve'], ['defense', 'Dig']]

export default function VolleyMatch({ career, dealer, manifest, opp, oppStrength, playoff, weekLabel, onAnswer, onFinish,
  howtoSeen, onHowtoSeen }) {
  const rules = manifest.rules || {}
  const you = TEAMS[career.team]
  const them = TEAMS[opp]
  const hints = playoff ? !!rules.hints_playoffs : rules.hints_regular_season !== false
  const label = s => statLabel('volleyball', manifest, s, LANE_OF)

  const [stage, setStage] = useState('intro')        // intro · howto · play · setbreak · final
  const [gate, setGate] = useState(null)
  const gateRef = useRef(null)
  const [ui, setUi] = useState({ text: '', buttons: [] })
  const [coach, setCoach] = useState(null)
  const [big, setBig] = useState(null)               // set point: { who, go }
  const [help, setHelp] = useState(false)
  const [toast, setToast] = useState(null)
  const [flash, setFlash] = useState(null)
  const [boost, setBoost] = useState({})             // set-break adjustments, next set only
  const [breakResults, setBreakResults] = useState(null)
  const [board, setBoard] = useState({ score: [0, 0], sets: [0, 0], setNo: 1 })
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
    const ro = roster(career.seed, career.team, career.season, career.levels, 'volleyball')
    return { S: ro.throwing.number, LI: ro.hands.number, OH: ro.speed.number, MB: ro.blocking.number, DS: ro.toughness.number }
  }, [career.seed, career.team, career.season, career.levels])

  useEffect(() => {
    court.current = createCourt(canvasRef.current, {
      you: career.team, opp, stats: v, oppStrength, numbers, target: 15,
      // Auto-play is a test harness for the dev build only (#auto); a student's build never has it.
      auto: import.meta.env.DEV && typeof location !== 'undefined' && location.hash === '#auto',
      onUI: x => setUi(x),
      onCoach: k => setCoach(k),
      onTimeout: () => h.current.timeout(),
      beforeRally: (info, go) => h.current.setPoint(info, go),
      onScore: x => setBoard(b => ({ ...b, score: x.score, sets: x.sets, setNo: x.setNo })),
      onSetEnd: info => h.current.setEnd(info),
      onMatchEnd: info => h.current.matchEnd(info),
      blocked: () => !!gateRef.current,
    })
    // Dev only: lets a test script reach the court. Never in a build.
    if (import.meta.env.DEV) window.__vbCourt = court.current
    return () => court.current.destroy()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // An answer just landed, or a set-break adjustment: the court plays with the new numbers.
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

  const startPlay = first => {
    setStage('play')
    court.current.start(first, tutorial)
  }

  const coinToss = () => {
    ask('coin', VB.coin, correct => {
      const first = correct === false ? 'them' : 'you'
      setToast(first === 'you' ? VB.coinYou : VB.coinThem(them.name))
      if (!howtoSeen) { setStage('howto'); h.current.afterHowto = () => startPlay(first) }
      else startPlay(first)
    })
  }

  h.current.timeout = () => {
    ask('timeout', VB.timeoutStake, correct => {
      setToast(correct ? VB.timeoutRight : VB.timeoutWrong)
      court.current.timeoutTaken(!!correct)
    })
  }
  h.current.setPoint = (info, go) => setBig({ who: info.who, go })
  h.current.setEnd = info => {
    setToast(null)
    setBoard(b => ({ ...b, sets: info.sets }))
    setBoost({})
    const n = rules.halftime_questions ?? 3
    const results = []
    const locker = !playoff && dealer.hasCulture && manifest.culture?.prompt
    const plus = q => setBoost(b => ({ ...b, [STAT_OF[q.lane]]: Math.min(2, (b[STAT_OF[q.lane]] || 0) + 1) }))
    const next = i => {
      if (i >= n) { setBreakResults({ results, info }); setStage('setbreak'); return }
      if (i === 0 && locker) {
        ask('locker', VB.locker, (correct, q) => { if (q) results.push({ lane: q.lane, correct }); if (correct && q) plus(q); next(i + 1) })
        return
      }
      ask('setbreak', VB.setBreakStake(i + 1, n), (correct, q) => {
        if (q) results.push({ lane: q.lane, correct }); if (correct && q) plus(q); next(i + 1)
      })
    }
    // The pep band crosses the court first, then the questions.
    court.current.band(you.colors, () => next(0))
  }
  h.current.matchEnd = info => { finalInfo.current = info; setBoard(b => ({ ...b, sets: info.sets })); setStage('final') }

  const takeBig = () => {
    const b = big; setBig(null)
    ask('live', VB.bigMomentStake, correct => {
      court.current.setReadBoost(!!correct)
      setToast(correct ? VB.readYes : VB.readNo)
      b.go()
    })
  }
  const skipBig = () => { const b = big; setBig(null); b.go() }

  const nextSet = () => {
    setBreakResults(null)
    setStage('play')
    setBoard(b => ({ ...b, score: [0, 0], setNo: b.setNo + 1 }))
    court.current.nextSet()
  }

  const final = () => {
    const [a, b] = finalInfo.current?.sets || board.sets
    const after = a > b ? 'win' : 'loss'
    ask(!playoff && (dealer.hasPodium || dealer.hasCulture) ? 'podium' : 'press', 'Press conference. The room wants an answer. A good one earns the fans’ trust and a bonus.', correct => {
      onFinish({
        you: a, opp: b,
        result: a > b ? RESULT.W : RESULT.L,
        press: correct === true,
        right: tally.current.right, total: tally.current.total,
      })
    }, { after })
  }

  // Toasts clear themselves.
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3200); return () => clearTimeout(t) }, [toast])

  // ── full screen: the same behaviour as football's (BK 2026-09-26 / 09-29) ───
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
  // The court holds still while the help card is open (only offered mid-rally, never over a card).
  const openHelp = () => { if (!playing) return; court.current.pause(); setHelp(true) }
  const closeHelp = () => { setHelp(false); court.current.resume() }

  const coachCard = coach && VB.coach[coach]

  return (
    <div className="match vb">
      <LedBoard left={{ abbr: you.abbr, score: board.score[0], color: you.colors[1] === '#FFFFFF' ? you.colors[0] : you.colors[1] }}
                right={{ abbr: them.abbr, score: board.score[1], color: them.colors[1] === '#FFFFFF' ? them.colors[0] : them.colors[1] }}
                mid1={`Set ${board.setNo}`}
                mid2={stage === 'intro' ? weekLabel : `Sets ${board.sets[0]}-${board.sets[1]}`}
                label={`${you.abbr} ${board.score[0]}, ${them.abbr} ${board.score[1]}. Set ${board.setNo}. Sets ${board.sets[0]} to ${board.sets[1]}.`} />

      <div className="field-wrap court-wrap">
        <canvas ref={canvasRef} className="field court" width="384" height="216"
                aria-label="Volleyball court. Use the call bar or the keyboard to play." />
        <button type="button" className="fs-btn" onClick={toggleFull} aria-pressed={full}>
          {full ? 'Exit full screen' : 'Full screen'}
        </button>
        {toast && <div className="toast" role="status">{toast}</div>}

        {(stage === 'howto' || help) && (
          <div className="vb-over" role="dialog" aria-modal="true" aria-labelledby="vb-howto">
            <div className="vb-card">
              <h2 className="h2" id="vb-howto">{VB.howtoTitle}</h2>
              <ul className="vb-howto">{VB.howto.map(([a, b]) => <li key={a}><b>{a}</b> {b}</li>)}</ul>
              <p className="vb-note">{VB.howtoNote}</p>
              <p className="vb-turn">{VB.howtoTurn}</p>
              <button type="button" className="btn-primary" autoFocus onClick={() => {
                if (stage === 'howto') { onHowtoSeen?.(); const f = h.current.afterHowto; h.current.afterHowto = null; f && f() }
                else closeHelp()
              }}>{VB.howtoGo}</button>
            </div>
          </div>
        )}

        {coachCard && !gate && (
          <div className="vb-over coach" role="dialog" aria-modal="true" aria-labelledby="vb-coach">
            <div className="vb-card">
              <div className="eyebrow" id="vb-coach">{coachCard[0]}</div>
              <p className="vb-coach-line">{coachCard[1]}</p>
              <div className="row">
                <button type="button" className="btn-primary" autoFocus onClick={() => court.current.coachDone(false)}>{VB.coachGo}</button>
                {coach !== 'wrap' && <button type="button" className="btn-ghost" onClick={() => court.current.coachDone(true)}>{VB.coachSkip}</button>}
              </div>
            </div>
          </div>
        )}
      </div>
      <p className="vb-turn-strip">{VB.howtoTurn}</p>

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
              {steady ? VB.steadyOn : VB.steady}
            </button>
            <button type="button" className="btn-ghost vb-help" aria-label={VB.howtoTitle} title={VB.howtoTitle} onClick={openHelp}>?</button>
          </div>
        </div>
      )}

      <div className="stat-flash-slot">
        {flash && <div key={flash.id} className={`stat-flash ${flash.up ? 'up' : ''}`} role="status">{flash.text}</div>}
      </div>
      <div className="stat-strip" aria-label="Your team's stats, built from your answers">
        {CELLS.map(([k, short]) => (
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
          <p className="sub">{VB.firstTo} {playoff ? VB.matchIntroCold : VB.matchIntroHints}</p>
          <button type="button" className="btn-primary" onClick={coinToss}>Coin toss</button>
        </div>
      )}

      {big && !gate && (
        <div className="panel center">
          <div className="eyebrow">{VB.bigMomentHead}</div>
          <p className="sub">{VB.bigMomentBody(big.who)}</p>
          <div className="row center">
            <button type="button" className="btn-primary" autoFocus onClick={takeBig}>{VB.bigMomentTake}</button>
            <button type="button" className="btn-ghost" onClick={skipBig}>{VB.bigMomentSkip}</button>
          </div>
        </div>
      )}

      {stage === 'setbreak' && breakResults && (
        <div className="panel center">
          <div className="eyebrow">{VB.setBreakHead(you.abbr, breakResults.info.sets[0], breakResults.info.sets[1], them.abbr)}</div>
          {breakResults.results.length ? (
            <ul className="ht-list">
              {breakResults.results.map((x, i) => (
                <li key={i}>{x.correct ? VB.setBreakPlus(label(STAT_OF[x.lane])) : VB.setBreakNone(manifest.lanes[x.lane]?.label)}</li>
              ))}
            </ul>
          ) : <p className="sub">{VB.noAdjust}</p>}
          <button type="button" className="btn-primary" autoFocus onClick={nextSet}>{VB.nextSet(board.setNo + 1)}</button>
        </div>
      )}

      {stage === 'final' && (
        <div className="panel center">
          <div className="eyebrow">Final</div>
          <h2 className="h2">{you.abbr} {board.sets[0]} – {board.sets[1]} {them.abbr}</h2>
          <p className="sub">{board.sets[0] > board.sets[1] ? 'A win.' : 'A loss.'} Questions today: {tally.current.total} answered.</p>
          <button type="button" className="btn-primary" autoFocus onClick={final}>Press conference</button>
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
