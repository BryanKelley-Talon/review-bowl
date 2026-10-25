// ============================================================
// REVIEW DAY — the whole-class review formats, on the classroom touch display.
// Leo's order 2026-10-24 22:18; BK ruled the concept 22:30:
//   1 · REVIEW DAY · THE BOARD · TOP ANSWERS (no show names, no "game" on screen)
//   2 · team points show — "a team style review game and it's not related to student grades"
//   3 · every team answers every clue — "maximizes engagement"
//   4 · units are single choices, each on or off — "choose exactly what units to cover or one at a time"
//   5 · the desks fill one template file per unit
// Then: random gym team names (22:47); and at 22:52, "yes to all": Undo ("select the move you want to undo"),
// a teacher-run timer, New class, TOP ANSWERS in two modes (everyone writes is the default), How to play cards.
// LAWS: no student data, no log-ins, nothing sent. Storage only remembers the board through a reload or
// the lunch bell, and the screen works with it wiped. Every word on screen lives in words.js or the desks' files.
// ============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import DisclaimerBadge from '../shared/DisclaimerBadge.jsx'
import { TEAM_NAMES, W } from './words.js'
import { VALUES, categoryPool, dealBoard, listPool, loadManifest, loadUnit, rankValue, shuffle } from './content.js'
import { clearState, readState, writeState } from './persist.js'
import './review-day.css'

// Teams are told apart by name and shape first, colour second (CONVENTIONS §6, Feel Floor).
const TEAM_LOOK = [
  { shape: '●', color: '#E3B341' },
  { shape: '▲', color: '#7FB2D9' },
  { shape: '■', color: '#7FCFA0' },
  { shape: '◆', color: '#F09A80' },
  { shape: '★', color: '#C3A8F0' },
  { shape: '✚', color: '#F4F6FA' },
]
const TIMER_CHOICES = [15, 30, 45, 60, 0] // 0 = off
const UNDO_DEPTH = 10

const pickNames = n => shuffle(TEAM_NAMES).slice(0, n)

function TeamTag({ i, name, score }) {
  const t = TEAM_LOOK[i]
  return (
    <span className="rd-team" style={{ '--team': t.color }}>
      <span className="rd-shape" aria-hidden="true">{t.shape}</span>
      <span className="rd-team-name">{name || W.team(i + 1)}</span>
      {score !== undefined && <span className="rd-score">{score}</span>}
    </span>
  )
}

function TeamPicker({ teams, names, had, setHad }) {
  return (
    <div className="rd-row center">
      {Array.from({ length: teams }, (_, t) => {
        const on = had.includes(t)
        return (
          <button key={t} type="button" className={`rd-teambtn${on ? ' on' : ''}`} aria-pressed={on}
                  style={{ '--team': TEAM_LOOK[t].color }}
                  onClick={() => setHad(h => (h.includes(t) ? h.filter(x => x !== t) : [...h, t]))}>
            <span aria-hidden="true">{on ? '✓ ' : ''}{TEAM_LOOK[t].shape}</span> {names[t]}
          </button>
        )
      })}
    </div>
  )
}

function DocumentBox({ doc }) {
  if (!doc) return null
  return (
    <figure className="rd-doc">
      <figcaption className="rd-doc-source">{doc.source}{doc.adapted ? ` ${W.adapted}` : ''}</figcaption>
      <blockquote className="rd-doc-text">{doc.text}</blockquote>
    </figure>
  )
}

// ── the timer: the teacher starts it; at zero it says "Boards up." and never reveals anything itself ──
function chime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.type = 'sine'; o.frequency.value = 880
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.9)
    o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 1)
  } catch { /* no sound is fine */ }
}

function Timer({ seconds, withChime }) {
  const [left, setLeft] = useState(seconds)
  const [total, setTotal] = useState(seconds)
  const [running, setRunning] = useState(false)
  const [started, setStarted] = useState(false)
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setLeft(l => {
      if (l <= 1) { setRunning(false); if (withChime) chime(); return 0 }
      return l - 1
    }), 1000)
    return () => clearInterval(id)
  }, [running, withChime])
  if (!seconds) return null
  const done = started && left === 0
  const frac = total ? left / total : 0
  return (
    <div className={`rd-timer${done ? ' done' : ''}`}>
      <div className="rd-ring" style={{ '--frac': frac }} role="timer" aria-live="off" aria-label={`${left} seconds`}>
        <span>{done ? '0' : left}</span>
      </div>
      {done && <p className="rd-boardsup" role="status">{W.boardsUp}</p>}
      <div className="rd-row center">
        {!running && !done && (
          <button type="button" className="rd-btn" onClick={() => { setStarted(true); setRunning(true) }}>{W.startTimer}</button>
        )}
        {running && <button type="button" className="rd-btn" onClick={() => setRunning(false)}>{W.pause}</button>}
        {started && (
          <button type="button" className="rd-btn" onClick={() => { setLeft(l => l + 10); setTotal(t => Math.max(t, left + 10)); if (done) setRunning(true) }}>{W.plus10}</button>
        )}
      </div>
    </div>
  )
}

function Choice({ on, onClick, children, cls = '' }) {
  return (
    <button type="button" className={`rd-choice ${cls}${on ? ' on' : ''}`} aria-pressed={on} onClick={onClick}>{children}</button>
  )
}

// ── the front: course · units · format · settings · teams ────────────────────
function Front({ manifest, saved, onStart, onResume }) {
  const courses = manifest.courses || []
  const [course, setCourse] = useState(saved?.setup?.course || courses[0]?.id || null)
  const cdef = courses.find(c => c.id === course)
  const unitIds = (cdef?.units || []).map(u => u.unit)
  // Default: the newest unit only. A unit day reviews that unit (BK 22:30).
  const [picked, setPicked] = useState(() => unitIds.length ? [unitIds[unitIds.length - 1]] : [])
  const [format, setFormat] = useState('board')
  const [timer, setTimer] = useState(saved?.setup?.timer ?? 30)
  const [withChime, setChime] = useState(saved?.setup?.chime ?? false)
  const [topMode, setTopMode] = useState(saved?.setup?.topMode ?? 'write')
  const [teams, setTeams] = useState(4)
  const [names, setNames] = useState(() => pickNames(6))
  const reroll = i => setNames(ns => {
    const free = TEAM_NAMES.filter(n => !ns.includes(n))
    const next = ns.slice(); next[i] = free[Math.floor(Math.random() * free.length)]
    return next
  })
  const chooseCourse = id => {
    setCourse(id)
    const ids = (courses.find(c => c.id === id)?.units || []).map(u => u.unit)
    setPicked(ids.length ? [ids[ids.length - 1]] : [])
  }
  const toggle = u => setPicked(p => (p.includes(u) ? p.filter(x => x !== u) : [...p, u]))
  const ready = course && picked.length > 0

  return (
    <main className="rd-front">
      <h1 className="rd-title">{W.title}</h1>
      {saved && (
        <div className="rd-resume">
          <button type="button" className="rd-btn primary" onClick={onResume}>{W.resume}</button>
        </div>
      )}

      <section className="rd-step">
        <h2>{W.pickCourse}</h2>
        <div className="rd-row">
          {courses.map(c => <Choice key={c.id} on={course === c.id} onClick={() => chooseCourse(c.id)}>{c.name}</Choice>)}
        </div>
      </section>

      <section className="rd-step">
        <h2>{W.pickUnits}</h2>
        {unitIds.length === 0 ? <p className="rd-note">{W.noUnits}</p> : (
          <div className="rd-row">
            {cdef.units.map(u => {
              const on = picked.includes(u.unit)
              return (
                <Choice key={u.unit} on={on} cls="unit" onClick={() => toggle(u.unit)}>
                  <span className="rd-check" aria-hidden="true">{on ? '✓' : ''}</span>
                  <span>{u.unit} · {u.title}</span>
                  {u.sample && <span className="rd-sample">{W.sample}</span>}
                </Choice>
              )
            })}
          </div>
        )}
        {unitIds.length > 0 && !picked.length && <p className="rd-note" role="status">{W.needUnit}</p>}
      </section>

      <section className="rd-step">
        <h2>{W.pickFormat}</h2>
        <div className="rd-row formats">
          {[['board', W.board, W.boardSub], ['top', W.top, W.topSub]].map(([id, name, sub]) => (
            <Choice key={id} on={format === id} cls="format" onClick={() => setFormat(id)}>
              <span className="rd-format-name">{name}</span>
              <span className="rd-format-sub">{sub}</span>
            </Choice>
          ))}
        </div>
        <div className="rd-settings">
          <div className="rd-setting">
            <span className="rd-setting-label">{W.topModeLabel}</span>
            <Choice on={topMode === 'write'} cls="small" onClick={() => setTopMode('write')}>{W.modeWrite}</Choice>
            <Choice on={topMode === 'turns'} cls="small" onClick={() => setTopMode('turns')}>{W.modeTurns}</Choice>
          </div>
          <div className="rd-setting">
            <span className="rd-setting-label">{W.timerLabel}</span>
            {TIMER_CHOICES.map(s => (
              <Choice key={s} on={timer === s} cls="small" onClick={() => setTimer(s)}>{s ? W.secs(s) : W.timerOff}</Choice>
            ))}
          </div>
          {timer > 0 && (
            <div className="rd-setting">
              <span className="rd-setting-label">{W.chimeLabel}</span>
              <Choice on={!withChime} cls="small" onClick={() => setChime(false)}>{W.off}</Choice>
              <Choice on={withChime} cls="small" onClick={() => setChime(true)}>{W.on}</Choice>
            </div>
          )}
        </div>
      </section>

      <section className="rd-step">
        <h2>{W.teams}</h2>
        <div className="rd-row">
          {[2, 3, 4, 5, 6].map(n => <Choice key={n} on={teams === n} cls="num" onClick={() => setTeams(n)}>{n}</Choice>)}
        </div>
        <ul className="rd-names">
          {names.slice(0, teams).map((nm, i) => (
            <li key={i} style={{ '--team': TEAM_LOOK[i].color }}>
              <span className="rd-shape" aria-hidden="true">{TEAM_LOOK[i].shape}</span>
              <span className="rd-name">{nm}</span>
              <button type="button" className="rd-btn small" onClick={() => reroll(i)} aria-label={`${W.newName} for ${nm}`}>{W.newName}</button>
            </li>
          ))}
        </ul>
      </section>

      <div className="rd-go">
        <button type="button" className="rd-btn primary big" disabled={!ready}
                onClick={() => onStart({ course, units: picked, format, teams, names: names.slice(0, teams), timer, chime: withChime, topMode })}>
          {W.start}
        </button>
      </div>
    </main>
  )
}

// ── THE BOARD ────────────────────────────────────────────────────────────────
function Board({ cats, game, names, commit }) {
  const { board, setup } = game
  const [open, setOpen] = useState(null) // { key, i }
  const [revealed, setRevealed] = useState(false)
  const [had, setHad] = useState([])

  const byKey = useMemo(() => Object.fromEntries(cats.map(c => [c.key, c])), [cats])
  const dealt = board.dealt.map(k => byKey[k]).filter(Boolean)
  const used = new Set(board.used)
  const total = dealt.reduce((n, c) => n + Math.min(c.clues?.length || 0, VALUES.length), 0)
  const cleared = dealt.length > 0 && dealt.every(c => (c.clues || []).slice(0, VALUES.length).every((_, i) => used.has(`${c.key}:${i}`)))

  const openClue = (key, i) => { setOpen({ key, i }); setRevealed(false); setHad([]) }
  const close = () => {
    const value = VALUES[open.i]
    const cat = byKey[open.key]
    const sq = `${open.key}:${open.i}`
    commit(W.mvSquare(value, had.map(t => names[t]), cat.category), g => {
      const scores = g.scores.slice(); had.forEach(t => { scores[t] += value })
      return { ...g, scores, board: { ...g.board, used: [...g.board.used, sq] } }
    })
    setOpen(null)
  }
  const deal = () => commit(W.mvDeal, g => {
    const next = dealBoard(cats, g.board.history)
    return { ...g, board: { dealt: next, used: [], history: [...new Set([...g.board.history, ...next])] } }
  })

  if (open) {
    const cat = byKey[open.key]
    const clue = cat.clues[open.i]
    return (
      <section className="rd-clue" aria-live="polite">
        <div className="rd-clue-head">
          <span className="rd-cat-name">{cat.category}</span>
          {cat.sample && <span className="rd-sample">{W.sample}</span>}
          <span className="rd-value">{VALUES[open.i]}</span>
        </div>
        <DocumentBox doc={clue.document} />
        <p className="rd-clue-text">{clue.clue}</p>
        {!revealed ? (
          <>
            <p className="rd-prompt">{W.write}</p>
            <Timer seconds={setup.timer} withChime={setup.chime} />
            <button type="button" className="rd-btn primary big" onClick={() => setRevealed(true)}>{W.show}</button>
          </>
        ) : (
          <div className="rd-reveal">
            <p className="rd-answer">{clue.answer}</p>
            {clue.also?.length > 0 && <p className="rd-also"><b>{W.alsoRight}</b> {clue.also.join(' · ')}</p>}
            {clue.why && <p className="rd-why">{clue.why}</p>}
            <p className="rd-prompt small">{W.whoHad}</p>
            <TeamPicker teams={setup.teams} names={names} had={had} setHad={setHad} />
            <button type="button" className="rd-btn primary big" onClick={close}>{W.back}</button>
          </div>
        )}
      </section>
    )
  }

  return (
    <section className="rd-board-wrap">
      <div className="rd-board" style={{ '--cols': Math.max(dealt.length, 1) }}>
        {dealt.map(c => (
          <div key={c.key} className="rd-col">
            <div className="rd-cat">
              <span>{c.category}</span>
              {c.sample && <span className="rd-sample">{W.sample}</span>}
            </div>
            {VALUES.map((v, i) => {
              const has = !!c.clues?.[i]
              const gone = used.has(`${c.key}:${i}`)
              return (
                <button key={v} type="button" className={`rd-tile${gone ? ' gone' : ''}`} disabled={!has || gone}
                        aria-label={gone ? `${c.category}, ${v}, done` : `${c.category}, ${v}`}
                        onClick={() => openClue(c.key, i)}>
                  {gone ? '' : v}
                </button>
              )
            })}
          </div>
        ))}
      </div>
      {(cleared || total === 0) && (
        <div className="rd-cleared">
          <p className="rd-prompt">{W.cleared}</p>
          <button type="button" className="rd-btn primary big" onClick={deal}>{W.deal}</button>
        </div>
      )}
    </section>
  )
}

// ── TOP ANSWERS ──────────────────────────────────────────────────────────────
function Bars({ list, flipped, onTap }) {
  const n = list.answers.length
  return (
    <ol className={`rd-bars${n >= 4 ? ' two' : ''}`} style={{ '--rows': Math.ceil(n / 2) }}>
      {list.answers.map((a, r) => {
        const up = flipped.has(r)
        return (
          <li key={r}>
            <button type="button" className={`rd-bar${up ? ' up' : ''}${onTap ? '' : ' still'}`}
                    onClick={onTap ? () => onTap(r) : undefined} aria-disabled={up || !onTap}
                    aria-label={up ? `${r + 1}: ${a.text}` : `Answer ${r + 1}, face down`}>
              <span className="rd-bar-num">{r + 1}</span>
              <span className="rd-bar-text">
                {up ? a.text : ''}
                {up && a.also?.length > 0 && <span className="rd-bar-also">{W.alsoRight} {a.also.join(' · ')}</span>}
              </span>
              <span className="rd-bar-val">{up ? rankValue(r, n) : ''}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

function TopAnswers({ lists, game, names, commit }) {
  const { top, setup } = game
  const teams = setup.teams
  const byKey = useMemo(() => Object.fromEntries(lists.map(l => [l.key, l])), [lists])
  const list = byKey[top.order[top.idx]]
  const [had, setHad] = useState([])
  useEffect(() => { setHad([]) }, [top.idx, top.flipped.length])
  if (!list) return <section className="rd-top"><p className="rd-prompt">{W.listsDone}</p></section>

  const n = list.answers.length
  const tag = W.listTag(list.unit, Number(list.key.split('#')[1]) + 1)
  const flipped = new Set(top.flipped)
  const nextTop = t => ({ ...t, idx: t.idx + 1, flipped: [], misses: 0, pot: 0, phase: 'play', msg: '', atPlay: (t.atPlay + 1) % teams })

  const head = (who) => (
    <>
      <div className="rd-clue-head">
        <span className="rd-cat-name">{W.top}</span>
        <span className="rd-listtag">{tag}</span>
        {list.sample && <span className="rd-sample">{W.sample}</span>}
        {who !== undefined && <TeamTag i={who} name={names[who]} />}
      </div>
      <p className="rd-clue-text">{list.prompt}</p>
    </>
  )

  // A · everyone writes (the default): the bars flip from the bottom to the top; tap every team that had each one.
  if (setup.topMode !== 'turns') {
    const lastUp = top.flipped.length ? top.flipped[top.flipped.length - 1] : null
    const awardPending = g => {
      if (lastUp === null || !had.length) return g
      const pts = rankValue(lastUp, n); const scores = g.scores.slice(); had.forEach(t => { scores[t] += pts })
      return { ...g, scores }
    }
    const pendingLabel = () => W.mvAward(lastUp + 1, rankValue(lastUp, n), had.map(t => names[t]), tag)
    const flipNext = () => {
      const r = n - 1 - top.flipped.length
      if (lastUp !== null && had.length) commit(pendingLabel(), awardPending)
      commit(W.mvFlip(r + 1, tag), g => ({ ...g, top: { ...g.top, flipped: [...g.top.flipped, r] } }))
    }
    const next = () => {
      if (lastUp !== null && had.length) commit(pendingLabel(), awardPending)
      commit(W.mvNext(tag), g => ({ ...g, top: nextTop(g.top) }))
    }
    const allUp = top.flipped.length >= n
    return (
      <section className="rd-top">
        {head()}
        {top.flipped.length === 0 && (
          <>
            <p className="rd-prompt">{W.writeMany}</p>
            <Timer key={top.idx} seconds={setup.timer} withChime={setup.chime} />
          </>
        )}
        <Bars list={list} flipped={flipped} />
        {lastUp !== null && (
          <>
            <p className="rd-prompt small">{W.whoHad}</p>
            <TeamPicker teams={teams} names={names} had={had} setHad={setHad} />
          </>
        )}
        <div className="rd-row center">
          {!allUp && <button type="button" className="rd-btn primary big" onClick={flipNext}>{W.flipNext}</button>}
          {allUp && <button type="button" className="rd-btn primary big" onClick={next}>{W.nextList}</button>}
        </div>
      </section>
    )
  }

  // B · turns and steals
  const stealer = (top.atPlay + 1) % teams
  const flip = r => {
    if (flipped.has(r)) return
    if (top.phase === 'done') { commit(W.mvFlip(r + 1, tag), g => ({ ...g, top: { ...g.top, flipped: [...g.top.flipped, r] } })); return }
    const pot = top.pot + rankValue(r, n)
    const nowFlipped = [...top.flipped, r]
    if (top.phase === 'steal') {
      commit(W.mvSteal(names[stealer], pot, tag), g => {
        const scores = g.scores.slice(); scores[stealer] += pot
        return { ...g, scores, top: { ...g.top, flipped: nowFlipped, pot, phase: 'done', msg: W.stealWon(names[stealer]) } }
      })
    } else if (nowFlipped.length === n) {
      commit(W.mvKeep(names[top.atPlay], pot, tag), g => {
        const scores = g.scores.slice(); scores[top.atPlay] += pot
        return { ...g, scores, top: { ...g.top, flipped: nowFlipped, pot, phase: 'done', msg: W.allFound(names[top.atPlay]) } }
      })
    } else {
      commit(W.mvFlip(r + 1, tag), g => ({ ...g, top: { ...g.top, flipped: nowFlipped, pot } }))
    }
  }
  const miss = () => {
    if (top.phase === 'steal') {
      commit(W.mvKeep(names[top.atPlay], top.pot, tag), g => {
        const scores = g.scores.slice(); scores[top.atPlay] += top.pot
        return { ...g, scores, top: { ...g.top, phase: 'done', msg: W.stealLost(names[top.atPlay]) } }
      })
      return
    }
    const misses = top.misses + 1
    commit(W.mvMiss(tag), g => ({
      ...g, top: misses >= 3
        ? { ...g.top, misses, phase: 'steal', msg: `${W.steal} ${W.stealBy(names[stealer])}` }
        : { ...g.top, misses },
    }))
  }
  const showRest = () => commit(W.mvRest(tag), g => ({ ...g, top: { ...g.top, flipped: list.answers.map((_, r) => r) } }))
  const next = () => commit(W.mvNext(tag), g => ({ ...g, top: nextTop(g.top) }))

  return (
    <section className="rd-top">
      {head(top.phase === 'steal' ? stealer : top.atPlay)}
      <p className="rd-prompt small" role="status">{top.msg || W.atPlay(names[top.atPlay])}</p>
      <Bars list={list} flipped={flipped} onTap={flip} />
      <div className="rd-strikes" aria-label={`${top.misses} of 3 misses`}>
        {[0, 1, 2].map(i => <span key={i} className={`rd-x${i < top.misses ? ' on' : ''}`} aria-hidden="true">✕</span>)}
      </div>
      <div className="rd-row center">
        {top.phase !== 'done' && <button type="button" className="rd-btn big miss" onClick={miss}>{W.miss}</button>}
        {top.phase === 'done' && flipped.size < n && <button type="button" className="rd-btn big" onClick={showRest}>{W.showRest}</button>}
        {top.phase === 'done' && <button type="button" className="rd-btn primary big" onClick={next}>{W.nextList}</button>}
      </div>
    </section>
  )
}

// ── pop-ups ──────────────────────────────────────────────────────────────────
function Modal({ label, children, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    ref.current?.querySelector('button')?.focus()
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="rd-scrim" onClick={onClose}>
      <div className="rd-modal" role="dialog" aria-modal="true" aria-label={label} ref={ref} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

function HowTo({ game, onClose }) {
  const s = game.setup.timer
  const card = game.format === 'board' ? W.howBoard(s) : game.setup.topMode === 'turns' ? W.howTopTurns() : W.howTopWrite(s)
  return (
    <Modal label={card.title} onClose={onClose}>
      <h2 className="rd-modal-title">{card.title}</h2>
      <p className="rd-how"><b>{W.setUp}</b> {card.setup}</p>
      <p className="rd-how"><b>{game.format === 'board' ? W.everyClue : W.everyList}</b></p>
      <ol className="rd-how-steps">{card.steps.map((t, i) => <li key={i}>{t}</li>)}</ol>
      {card.rule && <p className="rd-how rule">{card.rule}</p>}
      <div className="rd-row center"><button type="button" className="rd-btn primary big" onClick={onClose}>{W.letsGo}</button></div>
    </Modal>
  )
}

// ── the host ─────────────────────────────────────────────────────────────────
function freshPlay(setup, data, names) {
  const cats = categoryPool(data)
  const lists = listPool(data)
  const dealt = dealBoard(cats, [])
  return {
    setup: { ...setup, names }, format: setup.format, scores: Array(setup.teams).fill(0),
    board: { dealt, used: [], history: dealt },
    top: { order: shuffle(lists.map(l => l.key)), idx: 0, flipped: [], misses: 0, pot: 0, phase: 'play', msg: '', atPlay: 0 },
    history: [], rev: 0, showHelp: true,
  }
}

export default function ReviewDay() {
  const [manifest, setManifest] = useState(null)
  const [failed, setFailed] = useState(false)
  const [saved] = useState(readState)
  const [game, setGame] = useState(null)     // persisted: setup, scores, board, top, format, history
  const [units, setUnits] = useState(null)   // the picked units' files (refetched after a reload)
  const [pop, setPop] = useState(null)       // 'undo' | 'newclass' | null

  useEffect(() => { loadManifest().then(setManifest).catch(() => setFailed(true)) }, [])
  useEffect(() => { document.title = 'Review Day · Flashpoint History' }, [])
  useEffect(() => { if (game) writeState(game) }, [game])

  const fileFor = useCallback((course, unit) =>
    manifest?.courses?.find(c => c.id === course)?.units?.find(u => u.unit === unit)?.file, [manifest])
  const loadPicked = useCallback(async setup => {
    const files = setup.units.map(u => fileFor(setup.course, u)).filter(Boolean)
    return Promise.all(files.map(loadUnit))
  }, [fileFor])

  const start = async setup => {
    const data = await loadPicked(setup)
    clearState()
    setUnits(data)
    setGame(freshPlay(setup, data, setup.names))
  }
  const resume = async () => {
    try { setUnits(await loadPicked(saved.setup)); setGame({ history: [], rev: 0, ...saved, showHelp: false }) }
    catch { clearState() }
  }
  const menu = () => { setGame(null); setUnits(null) }
  const newClass = () => {
    setGame(g => freshPlay(g.setup, units, pickNames(g.setup.teams)))
    setPop(null)
  }

  // Every scoring move goes through here, so Undo can put the screen back exactly as it was.
  const commit = useCallback((label, mutate) => setGame(g => {
    const snap = { scores: g.scores, board: g.board, top: g.top }
    const history = [...(g.history || []), { label, snap }].slice(-UNDO_DEPTH)
    return { ...mutate(g), history }
  }), [])
  const undoTo = i => {
    setGame(g => ({ ...g, ...g.history[i].snap, history: g.history.slice(0, i), rev: (g.rev || 0) + 1 }))
    setPop(null)
  }

  const cats = useMemo(() => (units ? categoryPool(units) : []), [units])
  const lists = useMemo(() => (units ? listPool(units) : []), [units])
  const names = useMemo(() => (game ? Array.from({ length: game.setup.teams }, (_, i) => game.setup.names?.[i] || W.team(i + 1)) : []), [game])

  if (failed) return <div className="rd"><main className="rd-front"><h1 className="rd-title">{W.title}</h1><p className="rd-note">{W.noUnits}</p></main></div>
  if (!manifest) return <div className="rd" />

  const atFront = !game || !units
  return (
    <div className={`rd${atFront ? ' front' : ''}`}>
      {atFront ? (
        <Front manifest={manifest} saved={saved} onStart={start} onResume={resume} />
      ) : (
        <>
          <header className="rd-bar-top">
            <span className="rd-mark">{W.title}</span>
            <div className="rd-switch" role="group">
              {[['board', W.board], ['top', W.top]].map(([id, name]) => (
                <button key={id} type="button" className={`rd-tab${game.format === id ? ' on' : ''}`} aria-pressed={game.format === id}
                        onClick={() => setGame(g => ({ ...g, format: id }))}>{name}</button>
              ))}
            </div>
            <div className="rd-tools">
              <button type="button" className="rd-btn small" onClick={() => setGame(g => ({ ...g, showHelp: true }))}>{W.howTo}</button>
              <button type="button" className="rd-btn small" onClick={() => setPop('undo')}>{W.undo}</button>
              <button type="button" className="rd-btn small" onClick={() => setPop('newclass')}>{W.newClass}</button>
              <button type="button" className="rd-btn small" onClick={menu}>{W.menu}</button>
            </div>
            <div className="rd-teams">
              {game.scores.map((s, i) => <TeamTag key={i} i={i} name={names[i]} score={s} />)}
            </div>
          </header>
          {game.format === 'board'
            ? <Board key={`b${game.rev}`} cats={cats} game={game} names={names} commit={commit} />
            : <TopAnswers key={`t${game.rev}`} lists={lists} game={game} names={names} commit={commit} />}

          {game.showHelp && <HowTo game={game} onClose={() => setGame(g => ({ ...g, showHelp: false }))} />}

          {pop === 'undo' && (
            <Modal label={W.undoTitle} onClose={() => setPop(null)}>
              <h2 className="rd-modal-title">{W.undoTitle}</h2>
              {game.history.length === 0 ? <p className="rd-how">{W.undoNone}</p> : (
                <ul className="rd-undo">
                  {game.history.map((h, i) => ({ h, i })).reverse().map(({ h, i }) => (
                    <li key={i}><button type="button" className="rd-undo-move" onClick={() => undoTo(i)}>{h.label}</button></li>
                  ))}
                </ul>
              )}
              <p className="rd-how note">{W.undoNote}</p>
              <div className="rd-row center"><button type="button" className="rd-btn" onClick={() => setPop(null)}>{W.cancel}</button></div>
            </Modal>
          )}

          {pop === 'newclass' && (
            <Modal label={W.newClassTitle} onClose={() => setPop(null)}>
              <h2 className="rd-modal-title">{W.newClassTitle}</h2>
              <p className="rd-how">{W.newClassNote}</p>
              <div className="rd-row center">
                <button type="button" className="rd-btn" onClick={() => setPop(null)}>{W.keepPlaying}</button>
                <button type="button" className="rd-btn primary" onClick={newClass}>{W.startOver}</button>
              </div>
            </Modal>
          )}
        </>
      )}
      <div className="rd-foot"><DisclaimerBadge /></div>
    </div>
  )
}
