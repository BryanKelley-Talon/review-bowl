// ============================================================
// REVIEW DAY — the whole-class review formats, on the classroom touch display.
// Leo's order 2026-10-24 22:18; BK ruled the concept 22:30:
//   1 · REVIEW DAY · THE BOARD · TOP ANSWERS (no show names, no "game" on screen)
//   2 · team points show — "a team style review game and it's not related to student grades"
//   3 · every team answers every clue — "maximizes engagement"
//   4 · units are single choices, each on or off — "choose exactly what units to cover or one at a time"
//   5 · the desks fill one template file per unit
// LAWS: no student data, no log-ins, nothing sent. Storage only remembers the board through a
// reload or the lunch bell, and the screen works with it wiped. Every word on screen lives in words.js
// or in the desks' unit files.
// ============================================================
import { useCallback, useEffect, useMemo, useState } from 'react'
import DisclaimerBadge from '../shared/DisclaimerBadge.jsx'
import { TEAM_NAMES, W } from './words.js'
import { VALUES, categoryPool, dealBoard, listPool, loadManifest, loadUnit, rankValue, shuffle } from './content.js'
import { clearState, readState, writeState } from './persist.js'
import './review-day.css'

// Teams are told apart by number and shape first, colour second (CONVENTIONS §6, Feel Floor).
const TEAM_LOOK = [
  { shape: '●', color: '#E3B341' },
  { shape: '▲', color: '#7FB2D9' },
  { shape: '■', color: '#7FCFA0' },
  { shape: '◆', color: '#F09A80' },
  { shape: '★', color: '#C3A8F0' },
  { shape: '✚', color: '#F4F6FA' },
]

function TeamTag({ i, name, score, big }) {
  const t = TEAM_LOOK[i]
  return (
    <span className={`rd-team${big ? ' big' : ''}`} style={{ '--team': t.color }}>
      <span className="rd-shape" aria-hidden="true">{t.shape}</span>
      <span className="rd-team-name">{name || W.team(i + 1)}</span>
      {score !== undefined && <span className="rd-score">{score}</span>}
    </span>
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

// ── the front: course · units · format · teams ───────────────────────────────
function Front({ manifest, saved, onStart, onResume }) {
  const courses = manifest.courses || []
  const [course, setCourse] = useState(saved?.setup?.course || courses[0]?.id || null)
  const cdef = courses.find(c => c.id === course)
  const unitIds = (cdef?.units || []).map(u => u.unit)
  // Default: the newest unit only. A unit day reviews that unit (BK 22:30).
  const [picked, setPicked] = useState(() => unitIds.length ? [unitIds[unitIds.length - 1]] : [])
  const [format, setFormat] = useState('board')
  const [teams, setTeams] = useState(4)
  const [names, setNames] = useState(() => shuffle(TEAM_NAMES).slice(0, 6))
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
          {courses.map(c => (
            <button key={c.id} type="button" className={`rd-choice${course === c.id ? ' on' : ''}`}
                    aria-pressed={course === c.id} onClick={() => chooseCourse(c.id)}>{c.name}</button>
          ))}
        </div>
      </section>

      <section className="rd-step">
        <h2>{W.pickUnits}</h2>
        {unitIds.length === 0 ? <p className="rd-note">{W.noUnits}</p> : (
          <div className="rd-row">
            {cdef.units.map(u => {
              const on = picked.includes(u.unit)
              return (
                <button key={u.unit} type="button" className={`rd-choice unit${on ? ' on' : ''}`} aria-pressed={on}
                        onClick={() => toggle(u.unit)}>
                  <span className="rd-check" aria-hidden="true">{on ? '✓' : ''}</span>
                  <span>{u.unit} · {u.title}</span>
                  {u.sample && <span className="rd-sample">{W.sample}</span>}
                </button>
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
            <button key={id} type="button" className={`rd-choice format${format === id ? ' on' : ''}`}
                    aria-pressed={format === id} onClick={() => setFormat(id)}>
              <span className="rd-format-name">{name}</span>
              <span className="rd-format-sub">{sub}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rd-step">
        <h2>{W.teams}</h2>
        <div className="rd-row">
          {[2, 3, 4, 5, 6].map(n => (
            <button key={n} type="button" className={`rd-choice num${teams === n ? ' on' : ''}`}
                    aria-pressed={teams === n} onClick={() => setTeams(n)}>{n}</button>
          ))}
        </div>
        <ul className="rd-names">
          {names.slice(0, teams).map((nm, i) => (
            <li key={i} style={{ '--team': TEAM_LOOK[i].color }}>
              <span className="rd-shape" aria-hidden="true">{TEAM_LOOK[i].shape}</span>
              <span className="rd-name">{nm}</span>
              <button type="button" className="rd-btn small" onClick={() => reroll(i)}
                      aria-label={`${W.newName} for ${nm}`}>{W.newName}</button>
            </li>
          ))}
        </ul>
      </section>

      <div className="rd-go">
        <button type="button" className="rd-btn primary big" disabled={!ready}
                onClick={() => onStart({ course, units: picked, format, teams, names: names.slice(0, teams) })}>{W.start}</button>
      </div>
    </main>
  )
}

// ── THE BOARD ────────────────────────────────────────────────────────────────
function Board({ cats, board, setBoard, teams, names, award, pool }) {
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
    award(had.map(t => [t, value]))
    setBoard(b => ({ ...b, used: [...b.used, `${open.key}:${open.i}`] }))
    setOpen(null)
  }
  const deal = () => {
    const next = dealBoard(pool, board.history)
    setBoard(b => ({ dealt: next, used: [], history: [...new Set([...b.history, ...next])] }))
  }

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
            <button type="button" className="rd-btn primary big" onClick={() => setRevealed(true)}>{W.show}</button>
          </>
        ) : (
          <div className="rd-reveal">
            <p className="rd-answer">{clue.answer}</p>
            {clue.also?.length > 0 && <p className="rd-also"><b>{W.alsoRight}</b> {clue.also.join(' · ')}</p>}
            {clue.why && <p className="rd-why">{clue.why}</p>}
            <p className="rd-prompt small">{W.whoHad}</p>
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
function TopAnswers({ lists, top, setTop, teams, names, award }) {
  const byKey = useMemo(() => Object.fromEntries(lists.map(l => [l.key, l])), [lists])
  const list = byKey[top.order[top.idx]]
  if (!list) return <section className="rd-top"><p className="rd-prompt">{W.listsDone}</p></section>

  const n = list.answers.length
  const flipped = new Set(top.flipped)
  const stealer = (top.atPlay + 1) % teams

  const flip = r => {
    if (flipped.has(r)) return
    if (top.phase === 'done') { setTop(t => ({ ...t, flipped: [...t.flipped, r] })); return }
    const pot = top.pot + rankValue(r, n)
    const nowFlipped = [...top.flipped, r]
    if (top.phase === 'steal') {
      award([[stealer, pot]])
      setTop(t => ({ ...t, flipped: nowFlipped, pot, phase: 'done', msg: W.stealWon(names[stealer]) }))
    } else if (nowFlipped.length === n) {
      award([[top.atPlay, pot]])
      setTop(t => ({ ...t, flipped: nowFlipped, pot, phase: 'done', msg: W.allFound(names[top.atPlay]) }))
    } else {
      setTop(t => ({ ...t, flipped: nowFlipped, pot }))
    }
  }
  const miss = () => {
    if (top.phase === 'steal') {
      award([[top.atPlay, top.pot]])
      setTop(t => ({ ...t, phase: 'done', msg: W.stealLost(names[top.atPlay]) }))
      return
    }
    const misses = top.misses + 1
    if (misses >= 3) setTop(t => ({ ...t, misses, phase: 'steal', msg: `${W.steal} ${W.stealBy(names[stealer])}` }))
    else setTop(t => ({ ...t, misses }))
  }
  const showRest = () => setTop(t => ({ ...t, flipped: list.answers.map((_, r) => r) }))
  const next = () => setTop(t => ({
    ...t, idx: t.idx + 1, flipped: [], misses: 0, pot: 0, phase: 'play', msg: '', atPlay: (t.atPlay + 1) % teams,
  }))

  return (
    <section className="rd-top">
      <div className="rd-clue-head">
        <span className="rd-cat-name">{W.top}</span>
        {list.sample && <span className="rd-sample">{W.sample}</span>}
        <TeamTag i={top.phase === 'steal' ? stealer : top.atPlay} name={names[top.phase === 'steal' ? stealer : top.atPlay]} />
      </div>
      <p className="rd-clue-text">{list.prompt}</p>
      <p className="rd-prompt small" role="status">
        {top.msg || W.atPlay(names[top.atPlay])}
      </p>
      <ol className={`rd-bars${n > 4 ? ' two' : ''}`} style={{ '--rows': Math.ceil(n / 2) }}>
        {list.answers.map((a, r) => {
          const up = flipped.has(r)
          return (
            <li key={r}>
              <button type="button" className={`rd-bar${up ? ' up' : ''}`} onClick={() => flip(r)} aria-disabled={up}
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

// ── the host ─────────────────────────────────────────────────────────────────
export default function ReviewDay() {
  const [manifest, setManifest] = useState(null)
  const [failed, setFailed] = useState(false)
  const [saved] = useState(readState)
  const [game, setGame] = useState(null)     // persisted: setup, scores, board, top, format
  const [units, setUnits] = useState(null)   // the picked units' files (refetched after a reload)

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
    const cats = categoryPool(data)
    const lists = listPool(data)
    const dealt = dealBoard(cats, [])
    clearState()
    setUnits(data)
    setGame({
      setup, format: setup.format, scores: Array(setup.teams).fill(0),
      board: { dealt, used: [], history: dealt },
      top: { order: shuffle(lists.map(l => l.key)), idx: 0, flipped: [], misses: 0, pot: 0, phase: 'play', msg: '', atPlay: 0 },
    })
  }
  const resume = async () => {
    try { setUnits(await loadPicked(saved.setup)); setGame(saved) }
    catch { clearState() }
  }
  const menu = () => { setGame(null); setUnits(null) }

  const award = useCallback(pairs => setGame(g => {
    const scores = g.scores.slice()
    for (const [t, v] of pairs) scores[t] += v
    return { ...g, scores }
  }), [])

  const cats = useMemo(() => (units ? categoryPool(units) : []), [units])
  const names = useMemo(() => (game ? Array.from({ length: game.setup.teams }, (_, i) => game.setup.names?.[i] || W.team(i + 1)) : []), [game])
  const lists = useMemo(() => (units ? listPool(units) : []), [units])

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
            <div className="rd-teams">
              {game.scores.map((s, i) => <TeamTag key={i} i={i} name={names[i]} score={s} />)}
            </div>
            <button type="button" className="rd-btn small" onClick={menu}>{W.menu}</button>
          </header>
          {game.format === 'board' ? (
            <Board cats={cats} pool={cats} board={game.board} teams={game.setup.teams} names={names} award={award}
                   setBoard={f => setGame(g => ({ ...g, board: typeof f === 'function' ? f(g.board) : f }))} />
          ) : (
            <TopAnswers lists={lists} top={game.top} teams={game.setup.teams} names={names} award={award}
                        setTop={f => setGame(g => ({ ...g, top: typeof f === 'function' ? f(g.top) : f }))} />
          )}
        </>
      )}
      <div className="rd-foot"><DisclaimerBadge /></div>
    </div>
  )
}

