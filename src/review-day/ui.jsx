// REVIEW DAY — shared pieces every mode uses: team tags and pickers, the document box, the timer,
// pop-ups, steppers. Every word comes from words.js.
import { useEffect, useRef, useState } from 'react'
import { W } from './words.js'

// Teams are told apart by name and shape first, colour second (CONVENTIONS §6, Feel Floor).
export const TEAM_LOOK = [
  { shape: '●', color: '#E3B341' },
  { shape: '▲', color: '#7FB2D9' },
  { shape: '■', color: '#7FCFA0' },
  { shape: '◆', color: '#F09A80' },
  { shape: '★', color: '#C3A8F0' },
  { shape: '✚', color: '#F4F6FA' },
]

export function TeamTag({ i, name, score }) {
  const t = TEAM_LOOK[i]
  return (
    <span className="rd-team" style={{ '--team': t.color }}>
      <span className="rd-shape" aria-hidden="true">{t.shape}</span>
      <span className="rd-team-name">{name || W.team(i + 1)}</span>
      {score !== undefined && <span className="rd-score">{score}</span>}
    </span>
  )
}

export function TeamPicker({ teams, names, had, setHad, locked = [] }) {
  return (
    <div className="rd-row center">
      {Array.from({ length: teams }, (_, t) => {
        const on = had.includes(t)
        const done = locked.includes(t)
        return (
          <button key={t} type="button" className={`rd-teambtn${on ? ' on' : ''}${done ? ' done' : ''}`} aria-pressed={on}
                  disabled={done} style={{ '--team': TEAM_LOOK[t].color }}
                  onClick={() => setHad(h => (h.includes(t) ? h.filter(x => x !== t) : [...h, t]))}>
            <span aria-hidden="true">{on || done ? '✓ ' : ''}{TEAM_LOOK[t].shape}</span> {names[t]}
          </button>
        )
      })}
    </div>
  )
}

export function DocumentBox({ doc }) {
  if (!doc) return null
  return (
    <figure className="rd-doc">
      <figcaption className="rd-doc-source">{doc.source}{doc.adapted ? ` ${W.adapted}` : ''}</figcaption>
      <blockquote className="rd-doc-text">{doc.text}</blockquote>
    </figure>
  )
}

export function Choice({ on, onClick, children, cls = '', disabled }) {
  return (
    <button type="button" className={`rd-choice ${cls}${on ? ' on' : ''}`} aria-pressed={on} onClick={onClick} disabled={disabled}>{children}</button>
  )
}

export function Stepper({ value, min = 0, max = Infinity, step = 1, onChange, label }) {
  return (
    <span className="rd-stepper" role="group" aria-label={label}>
      <button type="button" className="rd-btn small" aria-label={`${label} −${step}`} disabled={value <= min}
              onClick={() => onChange(Math.max(min, value - step))}>−</button>
      <span className="rd-stepper-val" aria-live="polite">{value}</span>
      <button type="button" className="rd-btn small" aria-label={`${label} +${step}`} disabled={value >= max}
              onClick={() => onChange(Math.min(max, value + step))}>+</button>
    </span>
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

export function Timer({ seconds, withChime }) {
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

export function Modal({ label, children, onClose }) {
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

// A reference list (Civic Principles, the Six Umbrellas, the Threads) shown beside a prompt,
// from the desks' own signed files (see scripts/import-arena-refs.mjs). Nothing retyped.
export function RefStrip({ title, items }) {
  if (!items?.length) return null
  return (
    <aside className="rd-ref" aria-label={title}>
      <div className="rd-ref-title">{title}</div>
      <ol className="rd-ref-list">
        {items.map((it, i) => (
          <li key={i}>
            <span className="rd-ref-n">{it.n}</span>
            <span className="rd-ref-name">{it.name}</span>
            {it.subs?.length > 0 && <span className="rd-ref-subs">{it.subs.join(' · ')}</span>}
          </li>
        ))}
      </ol>
    </aside>
  )
}
