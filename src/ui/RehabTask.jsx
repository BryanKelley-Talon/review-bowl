// ============================================================
// REHAB — the desks' organizers (BK 2026-10-04 07:43: "Drag n drop organizer, identify the
// outside evidence? Explanation...identify it...add it the right spot"; levels CRAWL, WALK, JOG).
// Three kinds, one screen (injury.js has the rules):
//   sort            drag each sentence to its job
//   order           drag the sentences into paragraph order
//   find-and-place  a paragraph with empty spots; some pieces don't belong
// Every drop is judged as it lands: a right piece stays (with Sam's right line, if any); a wrong
// one goes back to the bank with the desk's line for that mistake. Drag with a mouse, or tap the
// piece and tap the spot (phones, keyboards). Nothing is typed, stored or sent.
// ============================================================
import { useMemo, useRef, useState } from 'react'
import { INJ_WORDS as W, judgeDrop, taskFinished } from '../game/injury.js'

const SPOT = /^\[ SPOT (\d+) \]$/

export default function RehabTask({ task, onFinished }) {
  // Pieces show in a shuffled order so the answer can't be read off the list.
  const bankOrder = useMemo(() => {
    const o = task.pieces.map(p => p.id)
    for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [o[i], o[j]] = [o[j], o[i]] }
    return o
  }, [task])
  const [placed, setPlaced] = useState({})          // slot → piece id (right drops only)
  const [pick, setPick] = useState(null)            // the tapped piece
  const [line, setLine] = useState(null)            // { ok, text } the desk's line for the last drop
  const [hints, setHints] = useState(0)
  const [done, setDone] = useState(false)
  const dragId = useRef(null)
  const used = new Set(Object.values(placed))
  const piece = id => task.pieces.find(p => p.id === id)

  const drop = (pieceId, slot) => {
    if (done || !pieceId || placed[slot]) return
    const p = piece(pieceId)
    const r = judgeDrop(task, p, slot)
    setPick(null)
    if (!r.ok) { setLine({ ok: false, text: r.line }); return }
    const next = { ...placed, [slot]: pieceId }
    setPlaced(next)
    setLine(r.line ? { ok: true, text: r.line } : null)
    if (taskFinished(task, next)) { setDone(true); onFinished() }
  }

  const Slot = ({ slot, inline }) => {
    const id = placed[slot]
    return (
      <button type="button" className={`rh-slot${id ? ' filled' : ''}${inline ? ' inline' : ''}${pick && !id ? ' ready' : ''}`}
              aria-label={id ? `${slot}: ${piece(id).text}` : slot}
              disabled={!!id || done}
              onClick={() => pick && drop(pick, slot)}
              onDragOver={e => { if (!id) e.preventDefault() }}
              onDrop={e => { e.preventDefault(); drop(dragId.current, slot) }}>
        <span className="rh-slot-label">{slot}</span>
        {id && <span className="rh-slot-text">{piece(id).text}</span>}
      </button>
    )
  }

  return (
    <div className="rehab">
      <p className="rehab-task">{task.prompt}</p>

      {task.kind === 'find-and-place'
        ? <div className="rh-paragraph">
            {task.paragraph.map((x, i) => {
              const m = x.match(SPOT)
              return m ? <Slot key={i} slot={task.slots[Number(m[1]) - 1]} inline /> : <span key={i} className="rh-sentence">{x} </span>
            })}
          </div>
        : <div className={`rh-slots ${task.kind}`}>{task.slots.map(sl => <Slot key={sl} slot={sl} />)}</div>}

      {!done && (
        <ul className="rh-bank" aria-label="Pieces">
          {bankOrder.filter(id => !used.has(id)).map(id => (
            <li key={id}>
              <button type="button" className={`rh-piece${pick === id ? ' picked' : ''}`} aria-pressed={pick === id}
                      draggable onDragStart={() => { dragId.current = id; setPick(id) }} onDragEnd={() => { dragId.current = null }}
                      onClick={() => setPick(pick === id ? null : id)}>
                {piece(id).text}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className={`rh-line${line ? (line.ok ? ' ok' : ' miss') : ''}`} role="status" aria-live="polite">{line?.text || ''}</p>

      {!done && hints < 2 && <button type="button" className="btn-ghost" onClick={() => setHints(h => h + 1)}>{W.hint} ({hints + 1})</button>}
      {hints > 0 && !done && <ul className="rehab-hints">{task.hints.slice(0, hints).map((h, i) => <li key={i}>{h}</li>)}</ul>}
      {done && <p className="q-note">{task.reasoning}</p>}
    </div>
  )
}
