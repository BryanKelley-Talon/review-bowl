// REVIEW DAY — write-and-reveal modes (drafts, 10/24 overnight): every team writes, the host reveals and taps
// every team that had it. MAP DROP, NAME THE ISSUE (Global) and THREAD RUN (US) run on the Arena's own blessed
// Atlas walks and map stops, word for word; NAME THE PRINCIPLE (US), ODD ONE OUT and WHO AM I? need the desks'
// template v2 sections and show SAMPLE content until those exist.
import { useMemo, useState } from 'react'
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

function MapView({ map, step, revealed }) {
  const box = (revealed && step.answer_focus) || step.focus
  const pct = b => b && { left: `${(b[0] / map.width) * 100}%`, top: `${(b[1] / map.height) * 100}%`, width: `${(b[2] / map.width) * 100}%`, height: `${(b[3] / map.height) * 100}%` }
  return (
    <figure className="rd-map">
      <div className="rd-map-frame">
        <img src={map.image} alt={map.image_alt} width={map.width} height={map.height} />
        {box && <span className="rd-map-focus" style={pct(box)} aria-hidden="true" />}
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
          {r.prompt && <p className={`rd-clue-text${r.map || r.head || r.ref ? ' small' : ''}`}>{r.prompt}</p>}
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
