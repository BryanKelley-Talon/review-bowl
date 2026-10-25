// REVIEW DAY — write-and-reveal modes (drafts, 10/24 overnight): every team writes, the host reveals and taps
// every team that had it. MAP DROP, NAME THE ISSUE (Global) and THREAD RUN (US) run on the Arena's own blessed
// Atlas walks and map stops, word for word; NAME THE PRINCIPLE (US), ODD ONE OUT and WHO AM I? need the desks'
// template v2 sections and show SAMPLE content until those exist.
import { useEffect, useMemo, useRef, useState } from 'react'
import { D, W } from '../words.js'
import { shuffle } from '../content.js'
import { ROUNDS, fromFiles, inUnits, stopsFor } from '../registry.js'
import { DocumentBox, RefStrip, TeamPicker, Timer } from '../ui.jsx'
import { Reveal } from './fileModes.jsx'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']
const EACH = 100
const WHO_VALUES = [400, 300, 200, 100]

export const revealInit = {
  principle: (ctx, setup) => ({ rounds: shuffle(fromFiles(ctx, setup.units, 'name_it')).slice(0, ROUNDS.principle).map(x => x.key), idx: 0, revealed: false }),
  odd: (ctx, setup) => ({ rounds: shuffle(fromFiles(ctx, setup.units, 'odd_one_out')).slice(0, ROUNDS.odd).map(x => x.key), idx: 0, revealed: false }),
  issue: (ctx, setup) => ({ rounds: shuffle(stopsFor(ctx, setup.units)).slice(0, ROUNDS.issue).map(s => s.id), idx: 0, revealed: false }),
  threads: (ctx, setup) => ({ rounds: shuffle(stopsFor(ctx, setup.units)).slice(0, ROUNDS.threads).map(s => s.id), idx: 0, revealed: false }),
  map: (ctx, setup) => {
    const steps = shuffle(inUnits(ctx.arena.atlas?.maps, setup.units)).flatMap(m => m.steps.map((s, i) => `${m.id}#${i}`))
    return { rounds: steps.slice(0, ROUNDS.map), idx: 0, revealed: false }
  },
  who: (ctx, setup) => ({ rounds: shuffle(fromFiles(ctx, setup.units, 'who_am_i')).slice(0, ROUNDS.who).map(x => x.key), idx: 0, shown: 1, found: [], revealed: false }),
}

// MAP DROP's map (BK 10/25: kids may "come right up and look at board, encouraged"): as big as the screen allows.
// Tap zooms 2× onto the area the question asks about (or where you tapped); tap again for the whole map.
// Two fingers pinch-zoom; one finger drags a zoomed map. Nothing here is stored.
function MapView({ map, step, revealed }) {
  const box = (revealed && step.answer_focus) || step.focus
  const pct = b => b && { left: `${(b[0] / map.width) * 100}%`, top: `${(b[1] / map.height) * 100}%`, width: `${(b[2] / map.width) * 100}%`, height: `${(b[3] / map.height) * 100}%` }
  const center = b => (b ? { x: ((b[0] + b[2] / 2) / map.width) * 100, y: ((b[1] + b[3] / 2) / map.height) * 100 } : { x: 50, y: 50 })
  const [view, setView] = useState({ s: 1, x: 50, y: 50 })
  const pts = useRef(new Map())
  const gesture = useRef(null)
  const frame = useRef(null)
  useEffect(() => { setView({ s: 1, x: 50, y: 50 }) }, [step])
  const rel = e => {
    const r = frame.current.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }
  }
  const down = e => {
    frame.current.setPointerCapture?.(e.pointerId)
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const list = [...pts.current.values()]
    if (list.length === 2) {
      const d = Math.hypot(list[0].x - list[1].x, list[0].y - list[1].y)
      gesture.current = { kind: 'pinch', d, s: view.s }
    } else gesture.current = { kind: 'tap', x0: e.clientX, y0: e.clientY, view }
  }
  const move = e => {
    if (!pts.current.has(e.pointerId)) return
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gesture.current
    if (!g) return
    if (g.kind === 'pinch' && pts.current.size === 2) {
      const [a, b] = [...pts.current.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      const mid = rel({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 })
      setView({ s: Math.min(4, Math.max(1, g.s * (d / g.d))), x: mid.x, y: mid.y })
    } else if (g.kind !== 'pinch' && g.view.s > 1) {
      const dx = e.clientX - g.x0, dy = e.clientY - g.y0
      if (Math.hypot(dx, dy) > 8) {
        g.kind = 'drag'
        const r = frame.current.getBoundingClientRect()
        setView(v => ({ ...v, x: Math.min(100, Math.max(0, g.view.x - (dx / r.width) * 100 / (g.view.s - 1))), y: Math.min(100, Math.max(0, g.view.y - (dy / r.height) * 100 / (g.view.s - 1))) }))
      }
    }
  }
  const up = e => {
    const g = gesture.current
    pts.current.delete(e.pointerId)
    if (g?.kind === 'tap' && pts.current.size === 0) {
      if (view.s > 1) setView({ s: 1, x: 50, y: 50 })
      else { const c = box ? center(box) : rel(e); setView({ s: 2, x: c.x, y: c.y }) }
    }
    if (pts.current.size === 0) gesture.current = null
  }
  const onKey = e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setView(v => (v.s > 1 ? { s: 1, x: 50, y: 50 } : { s: 2, ...center(box) })) }
  }
  return (
    <figure className="rd-map">
      <div className={`rd-map-frame${view.s > 1 ? ' zoomed' : ''}`} ref={frame} role="button" tabIndex={0}
           aria-label={`${map.image_alt} ${view.s > 1 ? D.mapZoomOut : D.mapZoomIn}`}
           onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={onKey}>
        <div className="rd-map-inner" style={{ transform: `scale(${view.s})`, transformOrigin: `${view.x}% ${view.y}%` }}>
          <img src={map.image} alt="" width={map.width} height={map.height} draggable={false} />
          {box && <span className="rd-map-focus" style={pct(box)} aria-hidden="true" />}
        </div>
        <span className="rd-map-hint" aria-hidden="true">{view.s > 1 ? D.mapZoomOut : D.mapZoomIn}</span>
      </div>
      {/* The title and source line can give the answer away ("printed in 1763"), so they show with the answer. */}
      {revealed && <figcaption className="rd-map-cap"><b>{map.title}</b> · {map.source}</figcaption>}
    </figure>
  )
}

// Build what one round shows, from wherever that mode's content lives.
function useRound(kind, ctx, setup, key) {
  return useMemo(() => {
    if (!key) return null
    if (kind === 'principle' || kind === 'odd') {
      const item = fromFiles(ctx, setup.units, kind === 'principle' ? 'name_it' : 'odd_one_out').find(x => x.key === key)
      if (!item) return null
      if (kind === 'principle') {
        return { sample: item.sample, prompt: item.prompt, doc: item.document, answer: item.answer, also: item.also, why: item.why,
                 ref: { title: ctx.arena.civic?.title, items: ctx.arena.civic?.items } }
      }
      return { sample: item.sample, terms: item.terms, prompt: null, answer: `${LETTERS[item.odd]} · ${item.terms[item.odd]}`, why: item.why, oddIdx: item.odd }
    }
    if (kind === 'issue' || kind === 'threads') {
      const s = stopsFor(ctx, setup.units).find(x => x.id === key)
      if (!s) return null
      if (kind === 'issue') {
        const subs = Object.fromEntries((ctx.arena.ei?.lines || []).flatMap(l => l.subs.map(x => [x.id, x.name])))
        return { head: `${s.when} · ${s.title}`, prompt: s.what_happened,
                 answer: [...new Set(s.on_lines.map(o => subs[o.sub]).filter(Boolean))].join(' · '),
                 why: s.on_lines.map(o => o.reason).filter(Boolean).join(' '),
                 ref: { title: ctx.arena.umbrellas?.title, items: ctx.arena.umbrellas?.items } }
      }
      const lines = Object.fromEntries((ctx.arena.threads?.lines || []).map(l => [l.id, l]))
      return { head: `${s.when} · ${s.title}`, prompt: s.what_happened,
               answer: [...new Set(s.on_lines.map(o => lines[o.line]).filter(Boolean).map(l => `${l.number} · ${l.name}`))].join('  /  '),
               why: s.on_lines.map(o => o.reason).filter(Boolean).join(' '),
               ref: { title: W.threadsTitle, items: (ctx.arena.threads?.lines || []).map(l => ({ n: l.number, name: l.name })) } }
    }
    if (kind === 'map') {
      const [id, i] = key.split('#')
      const map = (ctx.arena.atlas?.maps || []).find(m => m.id === id)
      const step = map?.steps[Number(i)]
      if (!step) return null
      return { map, step, prompt: step.ask, answer: step.answer }
    }
    return null
  }, [kind, ctx, setup.units, key])
}

const TITLES = { principle: () => D.principle, issue: () => D.issue, threads: () => D.threads, map: () => D.map, odd: () => D.odd }
const WRITE = { principle: () => D.writeIt, issue: () => D.writeIt, threads: () => D.threadWrite, map: () => W.write, odd: () => D.oddWrite }

export function WriteReveal({ kind, ctx, game, names, commit, setMS, ms }) {
  const { setup } = game
  const r = useRound(kind, ctx, setup, ms.rounds[ms.idx])
  const [had, setHad] = useState([])
  const [why, setWhy] = useState([])
  if (!ms.rounds.length) return <section className="rd-clue"><p className="rd-prompt">{D.needContent}</p></section>
  if (!r) return <section className="rd-clue"><p className="rd-prompt">{D.roundsDone}</p></section>
  const last = ms.idx + 1 >= ms.rounds.length

  const next = () => {
    const label = `${TITLES[kind]()} ${ms.idx + 1} · ${[...had.map(t => `${names[t]} +${EACH}`), ...why.map(t => `${names[t]} +${EACH}`)].join(', ') || '—'}`
    commit(label, g => {
      const s = g.scores.slice(); had.forEach(t => { s[t] += EACH }); why.forEach(t => { s[t] += EACH })
      return { ...g, scores: s, modeState: { ...g.modeState, [kind]: { ...g.modeState[kind], idx: g.modeState[kind].idx + 1, revealed: false } } }
    })
    setHad([]); setWhy([])
  }

  return (
    <section className={`rd-clue${r.ref ? ' with-ref' : ''}${r.map ? ' with-map' : ''}`}>
      <div className="rd-clue-head">
        <span className="rd-cat-name">{TITLES[kind]()}</span>
        <span className="rd-listtag">{ms.idx + 1} / {ms.rounds.length}</span>
        {r.sample && <span className="rd-sample">{W.sample}</span>}
      </div>
      {r.map && <p className="rd-map-q">{r.prompt}</p>}
      <div className="rd-clue-body">
        {r.map && <MapView map={r.map} step={r.step} revealed={ms.revealed} />}
        <div className="rd-clue-main">
          {r.head && <p className="rd-event-head">{r.head}</p>}
          <DocumentBox doc={r.doc} />
          {r.terms && (
            <ol className="rd-terms">
              {r.terms.map((t, i) => <li key={i} className={ms.revealed && i === r.oddIdx ? 'odd' : ''}><span className="rd-letter">{LETTERS[i]}</span>{t}</li>)}
            </ol>
          )}
          {r.prompt && !r.map && <p className={`rd-clue-text${r.head || r.ref ? ' small' : ''}`}>{r.prompt}</p>}
          {!ms.revealed ? (
            <>
              <p className="rd-prompt">{WRITE[kind]()}</p>
              <Timer key={ms.idx} seconds={setup.timer} withChime={setup.chime} />
              <button type="button" className="rd-btn primary big" onClick={() => setMS(m => ({ ...m, revealed: true }))}>{W.show}</button>
            </>
          ) : (
            <div className="rd-reveal">
              <Reveal answer={r.answer} also={r.also} why={r.why} />
              <p className="rd-prompt small">{kind === 'odd' ? D.oddWho : W.whoHad}</p>
              <TeamPicker teams={setup.teams} names={names} had={had} setHad={setHad} />
              {kind === 'odd' && (
                <>
                  <p className="rd-prompt small">{D.oddWhy}</p>
                  <TeamPicker teams={setup.teams} names={names} had={why} setHad={setWhy} />
                </>
              )}
              <button type="button" className="rd-btn primary big" onClick={next}>{last ? D.addPoints : D.nextRound}</button>
            </div>
          )}
        </div>
        {r.ref && <RefStrip title={r.ref.title} items={r.ref.items} />}
      </div>
    </section>
  )
}

// ── WHO AM I? (draft) ────────────────────────────────────────────────────────
export function WhoAmI({ ctx, game, names, commit, setMS, ms }) {
  const { setup } = game
  const items = useMemo(() => fromFiles(ctx, setup.units, 'who_am_i'), [ctx, setup.units])
  const item = items.find(x => x.key === ms.rounds[ms.idx])
  const [had, setHad] = useState([])
  if (!ms.rounds.length) return <section className="rd-clue"><p className="rd-prompt">{D.needContent}</p></section>
  if (!item) return <section className="rd-clue"><p className="rd-prompt">{D.roundsDone}</p></section>
  const value = WHO_VALUES[ms.shown - 1] ?? 100
  const award = (then, label) => commit(label, g => {
    const s = g.scores.slice(); had.forEach(t => { s[t] += value })
    const cur = g.modeState.who
    return { ...g, scores: s, modeState: { ...g.modeState, who: then({ ...cur, found: [...cur.found, ...had] }) } }
  })
  const label = what => `${D.who} ${ms.idx + 1} · ${what}${had.length ? ` · ${had.map(t => names[t]).join(', ')} +${value}` : ''}`
  const nextClue = () => { award(m => ({ ...m, shown: m.shown + 1 }), label(D.nextClue)); setHad([]) }
  const show = () => { award(m => ({ ...m, revealed: true }), label(W.show)); setHad([]) }
  const next = () => setMS(m => ({ ...m, idx: m.idx + 1, shown: 1, found: [], revealed: false }))

  return (
    <section className="rd-clue">
      <div className="rd-clue-head">
        <span className="rd-cat-name">{D.who}</span>
        <span className="rd-listtag">{ms.idx + 1} / {ms.rounds.length}</span>
        {item.sample && <span className="rd-sample">{W.sample}</span>}
        {!ms.revealed && <span className="rd-value">{D.worth(value)}</span>}
      </div>
      <ol className="rd-who-clues">
        {item.clues.slice(0, ms.revealed ? item.clues.length : ms.shown).map((c, i) => <li key={i}>{c}</li>)}
      </ol>
      {!ms.revealed ? (
        <>
          <p className="rd-prompt">{D.writeGuess}</p>
          <Timer key={`${ms.idx}-${ms.shown}`} seconds={setup.timer} withChime={setup.chime} />
          <p className="rd-prompt small">{W.whoHad}</p>
          <TeamPicker teams={setup.teams} names={names} had={had} setHad={setHad} locked={ms.found} />
          <div className="rd-row center">
            {ms.shown < item.clues.length && <button type="button" className="rd-btn big" onClick={nextClue}>{D.nextClue}</button>}
            <button type="button" className="rd-btn primary big" onClick={show}>{W.show}</button>
          </div>
        </>
      ) : (
        <div className="rd-reveal">
          <Reveal answer={item.answer} also={item.also} why={item.why} />
          <button type="button" className="rd-btn primary big" onClick={next}>{D.nextRound}</button>
        </div>
      )}
    </section>
  )
}
