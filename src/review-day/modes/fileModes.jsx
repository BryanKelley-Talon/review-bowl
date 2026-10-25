// REVIEW DAY — the modes that run on the desks' unit files: THE BOARD and TOP ANSWERS (ruled 10/24),
// and the overnight drafts FINAL ANSWER and LIGHTNING ROUND, which reuse THE BOARD's clues.
import { useEffect, useMemo, useState } from 'react'
import { D, W } from '../words.js'
import { VALUES, dealBoard, rankValue, shuffle } from '../content.js'
import { LISTS_BY_TIME, boardRun, fromFiles } from '../registry.js'
import { DocumentBox, Stepper, TEAM_LOOK, TeamPicker, TeamTag, Timer } from '../ui.jsx'

export const fileInit = {
  board: (ctx, setup) => {
    const cats = fromFiles(ctx, setup.units, 'board')
    const dealt = dealBoard(cats, [], boardRun(setup).cols)
    return { dealt, used: [], history: dealt }
  },
  top: (ctx, setup) => {
    const lists = fromFiles(ctx, setup.units, 'top_answers')
    const n = LISTS_BY_TIME[setup.minutes] ?? Infinity
    return { order: shuffle(lists.map(l => l.key)).slice(0, n), idx: 0, flipped: [], misses: 0, pot: 0, phase: 'play', msg: '', atPlay: 0 }
  },
  final: (ctx, setup, game) => {
    const cats = fromFiles(ctx, setup.units, 'board')
    const used = new Set(game?.modeState?.board?.used || [])
    const all = cats.flatMap(c => (c.clues || []).map((k, i) => ({ key: c.key, i })))
    const pick = shuffle(all.filter(r => r.i === 4 && !used.has(`${r.key}:${r.i}`)))[0]
      || shuffle(all.filter(r => !used.has(`${r.key}:${r.i}`)))[0] || all[0] || null
    return { phase: 'wager', ref: pick, wagers: Array(setup.teams).fill(0) }
  },
  lightning: (ctx, setup) => {
    const cats = fromFiles(ctx, setup.units, 'board')
    const refs = shuffle(cats.flatMap(c => (c.clues || []).slice(0, 2).map((k, i) => (k.document ? null : { key: c.key, i })).filter(Boolean))).slice(0, 10)
    return { phase: 'ready', refs, i: 0, counts: Array(setup.teams).fill(0) }
  },
}

const useCats = (ctx, setup) => useMemo(() => fromFiles(ctx, setup.units, 'board'), [ctx, setup.units])
const clueOf = (cats, ref) => {
  const c = cats.find(x => x.key === ref?.key)
  return c ? { cat: c, clue: c.clues[ref.i] } : null
}

// ── THE BOARD ────────────────────────────────────────────────────────────────
export function Board({ ctx, game, names, commit, ms }) {
  const { setup } = game
  const cats = useCats(ctx, setup)
  const run = boardRun(setup)
  const [open, setOpen] = useState(null) // { key, i }
  const [revealed, setRevealed] = useState(false)
  const [had, setHad] = useState([])

  const byKey = useMemo(() => Object.fromEntries(cats.map(c => [c.key, c])), [cats])
  const dealt = ms.dealt.map(k => byKey[k]).filter(Boolean)
  const used = new Set(ms.used)
  const total = dealt.reduce((n, c) => n + run.rows.filter(i => c.clues?.[i]).length, 0)
  const cleared = dealt.length > 0 && dealt.every(c => run.rows.every(i => !c.clues?.[i] || used.has(`${c.key}:${i}`)))

  const openClue = (key, i) => { setOpen({ key, i }); setRevealed(false); setHad([]) }
  const close = () => {
    const value = VALUES[open.i]
    const cat = byKey[open.key]
    const sq = `${open.key}:${open.i}`
    commit(W.mvSquare(value, had.map(t => names[t]), cat.category), g => {
      const scores = g.scores.slice(); had.forEach(t => { scores[t] += value })
      return { ...g, scores, modeState: { ...g.modeState, board: { ...g.modeState.board, used: [...g.modeState.board.used, sq] } } }
    })
    setOpen(null)
  }
  const deal = () => commit(W.mvDeal, g => {
    const b = g.modeState.board
    const next = dealBoard(cats, b.history, run.cols)
    return { ...g, modeState: { ...g.modeState, board: { dealt: next, used: [], history: [...new Set([...b.history, ...next])] } } }
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
            <Reveal answer={clue.answer} also={clue.also} why={clue.why} />
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
      <div className="rd-board" style={{ '--cols': Math.max(dealt.length, 1), '--rows': run.rows.length }}>
        {dealt.map(c => (
          <div key={c.key} className="rd-col">
            <div className="rd-cat">
              <span>{c.category}</span>
              {c.sample && <span className="rd-sample">{W.sample}</span>}
            </div>
            {run.rows.map(i => {
              const v = VALUES[i]
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

export function Reveal({ answer, also, why }) {
  return (
    <>
      <p className={`rd-answer${String(answer || '').length > 20 ? ' long' : ''}`}>{answer}</p>
      {also?.length > 0 && <p className="rd-also"><b>{W.alsoRight}</b> {also.join(' · ')}</p>}
      {why && <p className="rd-why">{why}</p>}
    </>
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

export function TopAnswers({ ctx, game, names, commit, ms: top }) {
  const { setup } = game
  const teams = setup.teams
  const lists = useMemo(() => fromFiles(ctx, setup.units, 'top_answers'), [ctx, setup.units])
  const byKey = useMemo(() => Object.fromEntries(lists.map(l => [l.key, l])), [lists])
  const list = byKey[top.order[top.idx]]
  const [had, setHad] = useState([])
  useEffect(() => { setHad([]) }, [top.idx, top.flipped.length])
  if (!list) return <section className="rd-top"><p className="rd-prompt">{W.listsDone}</p></section>

  const n = list.answers.length
  const tag = W.listTag(list.unit, Number(list.key.split('#').pop()) + 1)
  const flipped = new Set(top.flipped)
  const put = (g, t) => ({ ...g, modeState: { ...g.modeState, top: t } })
  const nextTop = t => ({ ...t, idx: t.idx + 1, flipped: [], misses: 0, pot: 0, phase: 'play', msg: '', atPlay: (t.atPlay + 1) % teams })

  const head = who => (
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
      commit(W.mvFlip(r + 1, tag), g => put(g, { ...g.modeState.top, flipped: [...g.modeState.top.flipped, r] }))
    }
    const next = () => {
      if (lastUp !== null && had.length) commit(pendingLabel(), awardPending)
      commit(W.mvNext(tag), g => put(g, nextTop(g.modeState.top)))
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
    if (top.phase === 'done') { commit(W.mvFlip(r + 1, tag), g => put(g, { ...g.modeState.top, flipped: [...g.modeState.top.flipped, r] })); return }
    const pot = top.pot + rankValue(r, n)
    const nowFlipped = [...top.flipped, r]
    if (top.phase === 'steal') {
      commit(W.mvSteal(names[stealer], pot, tag), g => {
        const scores = g.scores.slice(); scores[stealer] += pot
        return put({ ...g, scores }, { ...g.modeState.top, flipped: nowFlipped, pot, phase: 'done', msg: W.stealWon(names[stealer]) })
      })
    } else if (nowFlipped.length === n) {
      commit(W.mvKeep(names[top.atPlay], pot, tag), g => {
        const scores = g.scores.slice(); scores[top.atPlay] += pot
        return put({ ...g, scores }, { ...g.modeState.top, flipped: nowFlipped, pot, phase: 'done', msg: W.allFound(names[top.atPlay]) })
      })
    } else {
      commit(W.mvFlip(r + 1, tag), g => put(g, { ...g.modeState.top, flipped: nowFlipped, pot }))
    }
  }
  const miss = () => {
    if (top.phase === 'steal') {
      commit(W.mvKeep(names[top.atPlay], top.pot, tag), g => {
        const scores = g.scores.slice(); scores[top.atPlay] += top.pot
        return put({ ...g, scores }, { ...g.modeState.top, phase: 'done', msg: W.stealLost(names[top.atPlay]) })
      })
      return
    }
    const misses = top.misses + 1
    commit(W.mvMiss(tag), g => put(g, misses >= 3
      ? { ...g.modeState.top, misses, phase: 'steal', msg: `${W.steal} ${W.stealBy(names[stealer])}` }
      : { ...g.modeState.top, misses }))
  }
  const showRest = () => commit(W.mvRest(tag), g => put(g, { ...g.modeState.top, flipped: list.answers.map((_, r) => r) }))
  const next = () => commit(W.mvNext(tag), g => put(g, nextTop(g.modeState.top)))

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

// ── FINAL ANSWER (draft) ─────────────────────────────────────────────────────
export function FinalAnswer({ ctx, game, names, commit, setMS, ms }) {
  const { setup, scores } = game
  const cats = useCats(ctx, setup)
  const found = clueOf(cats, ms.ref)
  const [had, setHad] = useState([])
  if (!found) return <section className="rd-clue"><p className="rd-prompt">{D.needContent}</p></section>
  const { cat, clue } = found
  const cap = t => Math.max(scores[t], 500)
  const setWager = (t, v) => setMS(m => { const w = m.wagers.slice(); w[t] = v; return { ...m, wagers: w } })

  const settle = () => commit(D.settle, g => {
    const s = g.scores.slice()
    ms.wagers.forEach((w, t) => { s[t] += had.includes(t) ? w : -w })
    return { ...g, scores: s, modeState: { ...g.modeState, final: { ...g.modeState.final, phase: 'done' } } }
  })

  const head = (
    <div className="rd-clue-head">
      <span className="rd-cat-name">{D.final}</span>
      <span className="rd-listtag">{cat.category}</span>
      {cat.sample && <span className="rd-sample">{W.sample}</span>}
    </div>
  )

  if (ms.phase === 'wager') {
    return (
      <section className="rd-clue">
        {head}
        <p className="rd-clue-text">{cat.category}</p>
        <p className="rd-prompt">{D.wager}</p>
        <p className="rd-why">{D.wagerRule}</p>
        <Timer seconds={setup.timer} withChime={setup.chime} />
        <p className="rd-prompt small">{D.setWagers}</p>
        <div className="rd-wagers">
          {names.map((nm, t) => (
            <div key={t} className="rd-wager" style={{ '--team': TEAM_LOOK[t].color }}>
              <TeamTag i={t} name={nm} score={scores[t]} />
              <Stepper value={ms.wagers[t]} min={0} max={cap(t)} step={100} label={nm} onChange={v => setWager(t, v)} />
              <button type="button" className="rd-btn small" onClick={() => setWager(t, cap(t))}>{D.allIn}</button>
            </div>
          ))}
        </div>
        <button type="button" className="rd-btn primary big" onClick={() => setMS(m => ({ ...m, phase: 'clue' }))}>{D.showClue}</button>
      </section>
    )
  }
  if (ms.phase === 'clue' || ms.phase === 'reveal') {
    return (
      <section className="rd-clue">
        {head}
        <DocumentBox doc={clue.document} />
        <p className="rd-clue-text">{clue.clue}</p>
        {ms.phase === 'clue' ? (
          <>
            <p className="rd-prompt">{W.write}</p>
            <Timer seconds={setup.timer} withChime={setup.chime} />
            <button type="button" className="rd-btn primary big" onClick={() => setMS(m => ({ ...m, phase: 'reveal' }))}>{W.show}</button>
          </>
        ) : (
          <div className="rd-reveal">
            <Reveal answer={clue.answer} also={clue.also} why={clue.why} />
            <p className="rd-prompt small">{W.whoHad}</p>
            <TeamPicker teams={setup.teams} names={names} had={had} setHad={setHad} />
            <button type="button" className="rd-btn primary big" onClick={settle}>{D.settle}</button>
          </div>
        )}
      </section>
    )
  }
  const order = names.map((nm, t) => ({ nm, t, s: scores[t] })).sort((a, b) => b.s - a.s)
  return (
    <section className="rd-clue">
      {head}
      <p className="rd-clue-text">{D.finalScores}</p>
      <ol className="rd-standings">
        {order.map(o => <li key={o.t}><TeamTag i={o.t} name={o.nm} score={o.s} /></li>)}
      </ol>
    </section>
  )
}

// ── LIGHTNING ROUND (draft) ──────────────────────────────────────────────────
const LIGHTNING_SECONDS = 6
export function Lightning({ ctx, game, names, commit, setMS, ms }) {
  const { setup } = game
  const cats = useCats(ctx, setup)
  const clues = ms.refs.map(r => clueOf(cats, r)).filter(Boolean)
  useEffect(() => {
    if (ms.phase !== 'run') return
    const id = setTimeout(() => setMS(m => (m.i + 1 >= clues.length ? { ...m, phase: 'over' } : { ...m, i: m.i + 1 })), LIGHTNING_SECONDS * 1000)
    return () => clearTimeout(id)
  }, [ms.phase, ms.i, clues.length, setMS])
  if (!clues.length) return <section className="rd-clue"><p className="rd-prompt">{D.needContent}</p></section>

  const head = <div className="rd-clue-head"><span className="rd-cat-name">{D.lightning}</span>{clues[0].cat.sample && <span className="rd-sample">{W.sample}</span>}</div>
  if (ms.phase === 'ready') {
    return (
      <section className="rd-clue">
        {head}
        <p className="rd-clue-text">{D.getReady}</p>
        <button type="button" className="rd-btn primary big" onClick={() => setMS(m => ({ ...m, phase: 'run', i: 0 }))}>{D.go}</button>
      </section>
    )
  }
  if (ms.phase === 'run') {
    const { clue } = clues[ms.i]
    return (
      <section className="rd-clue" aria-live="polite">
        {head}
        <p className="rd-listtag">{D.clueOf(ms.i + 1, clues.length)}</p>
        <p className="rd-clue-text">{clue.clue}</p>
        <div className="rd-flash" key={ms.i} style={{ '--secs': `${LIGHTNING_SECONDS}s` }} aria-hidden="true" />
      </section>
    )
  }
  if (ms.phase === 'over') {
    return (
      <section className="rd-clue">
        {head}
        <p className="rd-clue-text">{D.pencils}</p>
        <button type="button" className="rd-btn primary big" onClick={() => setMS(m => ({ ...m, phase: 'reveal' }))}>{D.showAnswers}</button>
      </section>
    )
  }
  const add = () => commit(D.addPoints, g => {
    const s = g.scores.slice(); ms.counts.forEach((c, t) => { s[t] += c * 10 })
    return { ...g, scores: s, modeState: { ...g.modeState, lightning: { ...g.modeState.lightning, phase: 'done' } } }
  })
  return (
    <section className="rd-clue">
      {head}
      <ol className="rd-lightning-answers">
        {clues.map(({ clue }, i) => <li key={i}><b>{clue.answer}</b>{clue.also?.length ? <span> · {clue.also.join(' · ')}</span> : null}</li>)}
      </ol>
      {ms.phase === 'reveal' && (
        <>
          <p className="rd-prompt small">{D.howMany}</p>
          <div className="rd-wagers">
            {names.map((nm, t) => (
              <div key={t} className="rd-wager" style={{ '--team': TEAM_LOOK[t].color }}>
                <TeamTag i={t} name={nm} />
                <Stepper value={ms.counts[t]} min={0} max={clues.length} label={nm}
                         onChange={v => setMS(m => { const c = m.counts.slice(); c[t] = v; return { ...m, counts: c } })} />
              </div>
            ))}
          </div>
          <button type="button" className="rd-btn primary big" onClick={add}>{D.addPoints}</button>
        </>
      )}
      {ms.phase === 'done' && <p className="rd-prompt">{D.roundsDone}</p>}
    </section>
  )
}
