// Training camp: one Circuit rep, run the Arena's way (builds/thearena/src/App.jsx
// `Rep`): attempt → a real effort → the strong answer → compare on one move →
// check your own. Coach, never ghostwriter: the model stays shut until the student
// has written something. Nothing written here is saved, sent or scored — the camp
// credit is for doing the rep, because free text cannot be judged here.
import { useState } from 'react'

function tableOf(doc) {
  const c = doc?.content
  if (c && typeof c === 'object' && Array.isArray(c.rows)) return { caption: c.title, head: c.columns || [], body: c.rows }
  return null
}

function Doc({ doc, i }) {
  const [broken, setBroken] = useState(false)
  const table = tableOf(doc)
  const text = !table && typeof doc.content === 'string' ? doc.content : null
  return (
    <figure className="stimulus">
      <div className="doc-tag">Document {i + 1}</div>
      {doc.image_ref && !broken && (
        <img src={`/content/${doc.image_ref}`} alt={doc.image_alt || ''} onError={() => setBroken(true)} />
      )}
      {doc.image_ref && broken && !text && (
        <div className="doc-held"><b>Source image not cleared yet</b>{doc.image_alt && <span>{doc.image_alt}</span>}</div>
      )}
      {table && (
        <div className="tbl-wrap">
          {table.caption && <div className="tbl-cap">{table.caption}</div>}
          <table className="tbl">
            <thead><tr>{table.head.map((h, k) => <th key={k} scope="col">{h}</th>)}</tr></thead>
            <tbody>{table.body.map((row, k) => <tr key={k}>{row.map((c, j) => j === 0 ? <th key={j} scope="row">{c}</th> : <td key={j}>{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}
      {text && <p className="stimulus-text">{text}</p>}
      {doc.citation && <figcaption>{doc.citation}</figcaption>}
    </figure>
  )
}

export function repsOf(pack) {
  return ((pack && pack.reps) || []).filter(r => r.prompt && r.exemplar)
}

export default function CampRep({ rep, label, onDone, onCancel }) {
  const [text, setText] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [checked, setChecked] = useState({})
  const MIN = 40
  const ready = text.trim().length >= MIN
  const list = rep.compare_checklist || []
  const focus = rep.compare_focus || rep.station_focus
  return (
    <div className="gate" role="dialog" aria-modal="true" aria-labelledby="camp-title">
      <div className="gate-card">
        <div className="gate-head"><span className="gate-kind" id="camp-title">Training camp · {label}</span>
          <span className="gate-stat">Builds Toughness · Skills</span></div>
        {(rep.stimulus || []).map((d, i) => <Doc key={i} doc={d} i={i} />)}
        <div className="q-prompt" style={{ whiteSpace: 'pre-wrap' }}>{rep.prompt}</div>
        <label className="rep-label" htmlFor="camp-box">Your attempt</label>
        <textarea id="camp-box" className="rep-box" rows={6} value={text} onChange={e => setText(e.target.value)}
                  placeholder="Write it the way you would on the exam. Nothing here is saved or scored." />
        {!revealed ? (
          <div className="row">
            <button type="button" className="btn-primary" disabled={!ready} onClick={() => setRevealed(true)}>
              {ready ? 'Show me a strong answer' : `Write a bit more first — ${MIN - text.trim().length} characters to go`}
            </button>
            <button type="button" className="btn-ghost" onClick={onCancel}>Back</button>
          </div>
        ) : (
          <div className="q-reveal">
            <h4 className="rep-h">A strong answer</h4>
            <p className="rep-exemplar">{rep.exemplar}</p>
            {focus && <div className="rep-focus"><b>Compare on this one thing:</b> {focus}</div>}
            {!!list.length && (
              <>
                <h4 className="rep-h">Check your own</h4>
                <ul className="rep-check">
                  {list.map((item, i) => (
                    <li key={i}><label>
                      <input type="checkbox" checked={!!checked[i]} onChange={() => setChecked(c => ({ ...c, [i]: !c[i] }))} />
                      <span>{item}</span></label></li>
                  ))}
                </ul>
                <p className="q-note">You are the one marking these. Nothing is recorded.</p>
              </>
            )}
            <button type="button" className="btn-primary" onClick={onDone}>Finish the rep</button>
          </div>
        )}
      </div>
    </div>
  )
}
