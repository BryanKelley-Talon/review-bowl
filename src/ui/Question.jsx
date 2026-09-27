// A dead-ball gate: one question, the stakes stated up front, two escalating hints
// in the regular season, none in the playoffs. No timer — ever. The answer is
// committed once; the reveal says what was right and why, as a WORD first and a
// colour second (the Arena's §7.5 rule).
import { useEffect, useRef, useState } from 'react'

function Stimulus({ s }) {
  if (!s) return null
  if (s.plain) return <div className="q-term">{s.text}</div>
  return (
    <figure className="stimulus">
      {s.title && <div className="doc-tag">{s.title}</div>}
      {(s.images || []).map((img, i) => (
        <img key={i} src={`/${img.src}`} alt={img.alt} loading="eager" />
      ))}
      {s.text && <p className="stimulus-text">{s.text}</p>}
      {/* A compound source (two pictures) carries one citation per picture: one per line. */}
      {s.citation && <figcaption>{Array.isArray(s.citation)
        ? s.citation.map((c, i) => <span key={i} className="cite-line">{c}</span>) : s.citation}</figcaption>}
    </figure>
  )
}

export default function Question({ q, gate, stakes, hints = true, statLine, chip, onDone }) {
  const [picked, setPicked] = useState(null)
  const [shown, setShown] = useState(0)
  const [done, setDone] = useState(false)
  const headRef = useRef(null)
  useEffect(() => { headRef.current?.focus() }, [q?.id])
  if (!q) return null
  const answered = picked != null
  const right = answered && picked === q.correct
  const canHint = hints && q.hints.length > 0

  return (
    <div className="gate" role="dialog" aria-modal="true" aria-labelledby="gate-title">
      <div className="gate-card">
        <div className="gate-head">
          <span className="gate-kind" id="gate-title" tabIndex={-1} ref={headRef}>{gate}</span>
          {statLine && <span className="gate-stat">{statLine}</span>}
        </div>
        {/* A document question at a moment where the game has stopped (BK's words, 2026-09-27). */}
        {chip && <p className="gate-chip">{chip}</p>}
        {stakes && <p className="gate-stakes">{stakes}</p>}
        <Stimulus s={q.stimulus} />
        <div className="q-prompt">{q.prompt}</div>
        <div className="q-choices">
          {q.options.map(o => {
            let cls = 'q-choice'
            if (answered) cls += o.key === q.correct ? ' correct' : o.key === picked ? ' incorrect' : ' dim'
            return (
              <button key={o.key} type="button" className={cls} disabled={answered} onClick={() => setPicked(o.key)}>
                <b>({o.key})</b> <span>{o.text}</span>
                {answered && o.key === q.correct && <em className="q-mark">Correct</em>}
                {answered && o.key === picked && !right && <em className="q-mark">Not this one</em>}
              </button>
            )
          })}
        </div>

        {!answered && (
          canHint ? (
            <div className="q-hints">
              {q.hints.slice(0, shown).map((h, i) => <p key={i} className="q-hint"><b>Hint {i + 1}</b> {h}</p>)}
              {shown < q.hints.length && (
                <button type="button" className="btn-ghost" onClick={() => setShown(n => n + 1)}>
                  {shown === 0 ? 'Show a hint' : 'Show the second hint'}
                </button>
              )}
            </div>
          ) : !hints ? <p className="q-cold">Playoffs run cold — no hints.</p> : null
        )}

        {answered && (
          <div className="q-reveal" role="status">
            <p className={`q-verdict ${right ? 'ok' : 'miss'}`}>{right ? 'Correct.' : `Not quite — the answer is (${q.correct}).`}</p>
            {q.rationale && <p className="q-why">{q.rationale}</p>}
            {q.answerVerified === false && (
              <p className="q-note">Answer key for this one comes from your class exam, not an official Regents key.</p>
            )}
            <button type="button" className="btn-primary" autoFocus disabled={done}
                    onClick={() => { if (done) return; setDone(true); onDone({ correct: right, hintsUsed: shown, q }) }}>Continue</button>
          </div>
        )}
      </div>
    </div>
  )
}
