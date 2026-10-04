// ============================================================
// REHAB — sort the cards (football injuries, 2026-10-04; injury.js has the rules).
// Tap a card, then tap the bin it belongs in. Nothing is dragged, so every move works by
// tapping and by keyboard. Choose-and-arrange only: nothing typed, nothing stored or sent.
// ============================================================
import { useMemo, useState } from 'react'
import { INJ_WORDS as W, sortIsRight } from '../game/injury.js'

export default function RehabTask({ task, onDone }) {
  // Cards show in a shuffled order so the bins can't be read off the list.
  const order = useMemo(() => {
    const o = task.cards.map((_, i) => i)
    for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [o[i], o[j]] = [o[j], o[i]] }
    return o
  }, [task])
  const bins = Number(task.level) >= 2 ? ['context', 'claim', 'evidence', 'none'] : ['context', 'claim', 'evidence']
  const [placed, setPlaced] = useState({})
  const [pick, setPick] = useState(null)
  const [hints, setHints] = useState(0)
  const [result, setResult] = useState(null)       // null | true | false
  const all = task.cards.every((_, i) => placed[i])

  const put = role => {
    if (pick === null || result !== null) return
    setPlaced(p => ({ ...p, [pick]: role }))
    const next = order.find(i => i !== pick && !placed[i])
    setPick(next ?? null)
  }
  const check = () => { const ok = sortIsRight(task, placed); setResult(ok); onDone(ok) }

  return (
    <div className="rehab">
      <p className="rehab-task"><b>{W.task}:</b> {task.task}</p>
      <p className="sub">{W.sortHow}</p>
      <ol className="rehab-cards">
        {order.map((i, n) => {
          const c = task.cards[i]
          const where = placed[i]
          const wrong = result === false && where !== c.role
          return (
            <li key={i}>
              <button type="button" className={`rehab-card${pick === i ? ' picked' : ''}${result !== null ? (wrong ? ' wrong' : ' right') : ''}`}
                      aria-pressed={pick === i} disabled={result !== null} onClick={() => setPick(i)}>
                <span className="rehab-n" aria-hidden="true">{n + 1}</span>
                <span className="rehab-text">{c.text}</span>
                <span className="rehab-where">{where ? W.bins[where] : W.unsorted}
                  {result === false && wrong ? ` → ${W.bins[c.role]}` : ''}</span>
              </button>
            </li>
          )
        })}
      </ol>
      <div className="rehab-bins" role="group" aria-label="Where it goes">
        {bins.map(b => (
          <button key={b} type="button" className="btn-secondary rehab-bin" disabled={pick === null || result !== null} onClick={() => put(b)}>
            {W.bins[b]}
            <span className="rehab-count">{order.map((i, n) => placed[i] === b ? n + 1 : null).filter(Boolean).join(' · ')}</span>
          </button>
        ))}
      </div>
      {result === null && (
        <div className="rehab-actions">
          <button type="button" className="btn-primary" disabled={!all} onClick={check}>{W.check}</button>
          {hints < 2 && <button type="button" className="btn-ghost" onClick={() => setHints(h => h + 1)}>{W.hint} ({hints + 1})</button>}
        </div>
      )}
      {hints > 0 && result === null && <ul className="rehab-hints">{task.hints.slice(0, hints).map((h, i) => <li key={i}>{h}</li>)}</ul>}
      {result !== null && <p className="q-note">{task.reasoning}</p>}
    </div>
  )
}
