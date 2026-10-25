// REVIEW DAY — race modes on one screen (drafts, 10/24 overnight; BK 23:11: "each team has to race to answer
// all four and run to the board and tap in their answers"). One lane per team. A runner taps in the team's
// answers by letter and locks in; the screen keeps the lock-in order. Nothing is sent anywhere: with no server,
// the display itself takes every runner's taps, so lanes listen to each touch on its own (multi-touch).
// NOT PROMISED until it has been tested on BK's LG panel.
import { useMemo, useRef, useState } from 'react'
import { D, W } from '../words.js'
import { shuffle, startYear } from '../content.js'
import { ROUNDS, fromFiles, stopsFor } from '../registry.js'
import { DocumentBox, TEAM_LOOK, TeamTag } from '../ui.jsx'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']
const ORDER_RIGHT = 100, ORDER_FIRST = 50, DET_EACH = 50, DET_FIRST = 100

// A touch fires its own pointerup, so two runners tapping at once both register; a mouse or keyboard uses click.
function useTap() {
  const lastTouch = useRef(0)
  return fn => ({
    onPointerUp: e => { if (e.pointerType !== 'mouse') { lastTouch.current = Date.now(); fn() } },
    onClick: () => { if (Date.now() - lastTouch.current > 600) fn() },
  })
}

export const laneInit = {
  order: (ctx, setup) => {
    const pool = shuffle(stopsFor(ctx, setup.units).filter(s => startYear(s.when)))
    const rounds = []
    const used = new Set()
    for (let r = 0; r < ROUNDS.order; r++) {
      const set = []
      for (const s of pool) {
        if (used.has(s.id)) continue
        const y = startYear(s.when)
        if (set.every(x => Math.abs(startYear(x.when) - y) >= 5)) set.push(s)
        if (set.length === 4) break
      }
      if (set.length < 4) break
      set.forEach(s => used.add(s.id))
      rounds.push(shuffle(set.map(s => s.id)))
    }
    return { rounds, idx: 0, revealed: false }
  },
  detective: (ctx, setup) => {
    const docs = shuffle(fromFiles(ctx, setup.units, 'detective')).slice(0, ROUNDS.detective)
    return { rounds: docs.map(d => d.key), idx: 0, revealed: false }
  },
}

function Lane({ t, name, kind, n, rows, state, setState, revealed, result, lockPos }) {
  const tap = useTap()
  const look = TEAM_LOOK[t]
  const locked = state.lockedAt != null
  const complete = kind === 'order' ? state.picks.length === n : rows.every((_, q) => state.picks[q] != null)
  const pick = (q, letterIdx) => {
    if (locked || revealed) return
    setState(s => {
      if (kind === 'order') return s.picks.includes(letterIdx) ? s : { ...s, picks: [...s.picks, letterIdx] }
      const p = s.picks.slice(); p[q] = letterIdx; return { ...s, picks: p }
    })
  }
  return (
    <div className={`rd-lane${locked ? ' locked' : ''}`} style={{ '--team': look.color }}>
      <TeamTag i={t} name={name} />
      {kind === 'order' ? (
        <>
          <div className="rd-lane-keys">
            {Array.from({ length: n }, (_, i) => (
              <button key={i} type="button" className={`rd-key${state.picks.includes(i) ? ' on' : ''}`} disabled={locked || revealed}
                      aria-label={`${name}: ${LETTERS[i]}`} {...tap(() => pick(0, i))}>{LETTERS[i]}</button>
            ))}
          </div>
          <div className="rd-lane-seq" aria-live="polite">
            {locked && !revealed ? '• • • •' : state.picks.map(i => LETTERS[i]).join(' → ') || '—'}
          </div>
        </>
      ) : (
        <div className="rd-lane-rows">
          {rows.map((row, q) => (
            <div key={q} className="rd-lane-row">
              <span className="rd-lane-q">{q + 1}</span>
              {row.choices.map((_, i) => {
                const on = state.picks[q] === i
                const mark = revealed && on ? (i === row.answer ? ' right' : ' wrong') : ''
                return (
                  <button key={i} type="button" className={`rd-key small${on && (!locked || revealed) ? ' on' : ''}${mark}`} disabled={locked || revealed}
                          aria-label={`${name}: question ${q + 1}, ${LETTERS[i]}`} {...tap(() => pick(q, i))}>{LETTERS[i]}</button>
                )
              })}
            </div>
          ))}
        </div>
      )}
      {!revealed && !locked && (
        <div className="rd-lane-actions">
          <button type="button" className="rd-btn small" {...tap(() => setState(s => ({ ...s, picks: [] })))}>{D.clear}</button>
          <button type="button" className="rd-btn small primary" disabled={!complete} {...tap(() => complete && setState(s => (s.lockedAt != null ? s : { ...s, lockedAt: lockPos() })))}>{D.lockIn}</button>
        </div>
      )}
      {locked && <div className="rd-lane-status">{D.locked(state.lockedAt)}</div>}
      {revealed && result && <div className={`rd-lane-result${result.all ? ' all' : ''}`}>{result.all ? D.laneRight : kind === 'order' ? D.laneNot : D.laneMissed(result.right)}{result.points ? ` · +${result.points}` : ''}</div>}
    </div>
  )
}

export function Lanes({ kind, ctx, game, names, commit, setMS, ms }) {
  const { setup } = game
  const teams = setup.teams
  const stops = useMemo(() => Object.fromEntries(stopsFor(ctx, setup.units).map(s => [s.id, s])), [ctx, setup.units])
  const docs = useMemo(() => Object.fromEntries(fromFiles(ctx, setup.units, 'detective').map(d => [d.key, d])), [ctx, setup.units])
  const round = ms.rounds[ms.idx]
  const blank = () => Array.from({ length: teams }, () => ({ picks: [], lockedAt: null }))
  const [lanes, setLanes] = useState(blank)
  const counter = useRef(0)
  const lockPos = () => { counter.current += 1; return counter.current }
  const [results, setResults] = useState(null)

  if (!round) return <section className="rd-top"><p className="rd-prompt">{ms.rounds.length ? D.roundsDone : D.needContent}</p></section>

  const title = kind === 'order' ? D.order : D.detective
  let n = 0, rows = [], center = null, correct = null, sample = false
  if (kind === 'order') {
    const items = round.map(id => stops[id]).filter(Boolean)
    n = items.length
    correct = items.map((s, i) => ({ i, y: startYear(s.when) })).sort((a, b) => a.y - b.y).map(x => x.i)
    center = (
      <ol className="rd-events">
        {items.map((s, i) => (
          <li key={s.id} className={ms.revealed ? 'shown' : ''}>
            <span className="rd-letter">{LETTERS[i]}</span>
            <span className="rd-event-title">{s.title}</span>
            {ms.revealed && <span className="rd-event-when">{s.when} · #{correct.indexOf(i) + 1}</span>}
          </li>
        ))}
      </ol>
    )
  } else {
    const d = docs[round]
    if (!d) return <section className="rd-top"><p className="rd-prompt">{D.needContent}</p></section>
    sample = d.sample
    rows = d.questions || []
    center = (
      <div className="rd-detective">
        <DocumentBox doc={d.document} />
        <ol className="rd-dq">
          {rows.map((q, i) => (
            <li key={i}>
              <span className="rd-dq-ask">{q.ask}</span>
              <span className="rd-dq-choices">
                {q.choices.map((c, j) => (
                  <span key={j} className={`rd-dq-choice${ms.revealed && j === q.answer ? ' right' : ''}`}><b>{LETTERS[j]}</b> {c}</span>
                ))}
              </span>
              {ms.revealed && q.why && <span className="rd-dq-why">{q.why}</span>}
            </li>
          ))}
        </ol>
      </div>
    )
  }

  const reveal = () => {
    const res = lanes.map(l => {
      if (kind === 'order') {
        const all = l.picks.length === n && l.picks.every((p, i) => p === correct[i])
        return { all, right: all ? 1 : 0 }
      }
      const right = rows.filter((q, i) => l.picks[i] === q.answer).length
      return { all: right === rows.length, right }
    })
    const firstAll = lanes.map((l, t) => ({ t, at: l.lockedAt })).filter(x => x.at != null && res[x.t].all).sort((a, b) => a.at - b.at)[0]
    res.forEach((r, t) => {
      r.points = kind === 'order' ? (r.all ? ORDER_RIGHT : 0) : r.right * DET_EACH
      if (firstAll && firstAll.t === t) r.points += kind === 'order' ? ORDER_FIRST : DET_FIRST
    })
    setResults({ res, first: firstAll?.t })
    const label = `${title} · ${res.map((r, t) => (r.points ? `${names[t]} +${r.points}` : null)).filter(Boolean).join(', ') || '—'}`
    commit(label, g => {
      const s = g.scores.slice(); res.forEach((r, t) => { s[t] += r.points })
      return { ...g, scores: s, modeState: { ...g.modeState, [kind]: { ...g.modeState[kind], revealed: true } } }
    })
  }
  const next = () => { setLanes(blank()); setResults(null); counter.current = 0; setMS(m => ({ ...m, idx: m.idx + 1, revealed: false })) }

  return (
    <section className="rd-lanes-mode">
      <div className="rd-clue-head">
        <span className="rd-cat-name">{title}</span>
        {sample && <span className="rd-sample">{W.sample}</span>}
      </div>
      {kind === 'order' && <p className="rd-prompt small">{D.orderTap}</p>}
      {center}
      {ms.revealed && results?.first != null && <p className="rd-prompt">{D.firstRight(names[results.first])}</p>}
      <div className="rd-lanes" style={{ '--lanes': teams }}>
        {lanes.map((st, t) => (
          <Lane key={t} t={t} name={names[t]} kind={kind} n={n} rows={rows} state={st} revealed={ms.revealed}
                result={results?.res[t]} lockPos={lockPos}
                setState={f => setLanes(ls => ls.map((x, i) => (i === t ? (typeof f === 'function' ? f(x) : f) : x)))} />
        ))}
      </div>
      <div className="rd-row center">
        {!ms.revealed && <button type="button" className="rd-btn primary big" onClick={reveal}>{kind === 'order' ? D.showOrder : D.showResults}</button>}
        {ms.revealed && <button type="button" className="rd-btn primary big" onClick={next}>{D.nextRound}</button>}
      </div>
    </section>
  )
}
