// ============================================================
// STANDING DISCLAIMER BADGE — shared chrome, not a Review Bowl feature.
// Wording approved by BK 2026-09-22, verbatim, from
// Out/ruling-capture-2026-09-22-standing-disclaimer-badge.md, AMENDED 2026-09-27:
// CJ's catch ("whose is it?"), BK 10:24: "Made by a Teacher at CPP is safe...keeps
// district badging and responsibility off them"; the course names BK ruled at 10:28.
// RULED AGAIN 2026-10-03 22:47 (BK; Leo's order 23:09): "for review on your own time, or
// when a teacher uses it in class"; the "no teacher requires it" clause is gone.
// Do not edit the words here; a change to them is a change to the ruling.
//
// Built to lift as-is into the Arena and every other Flashpoint build: one file,
// one stylesheet (DisclaimerBadge.css), no dependency on this game. Pass the
// portrait path the host serves; the Arena serves the same file at the same path.
// Visual: BK's own guide portrait in the Arena's .guide-face.lg treatment (140px,
// circular, object-fit: cover) — BK himself delivering it, per his correction.
// ============================================================
import { useEffect, useRef, useState } from 'react'
import './DisclaimerBadge.css'

export const DISCLAIMER_BADGE = 'Skills Review · Educational Tool'
export const DISCLAIMER_TEXT =
  'Made by a teacher at CPP. This is a Skills Review resource for Global History and Geography 10R and ' +
  'US History and Government 11R. It’s for review on your own time, or when a teacher uses it in class. ' +
  'It’s never permission to skip work in another class. If someone asks what this is, this is it.'

export default function DisclaimerBadge({ portrait = '/images/arena/guide-bk.png' }) {
  const [open, setOpen] = useState(false)
  const closeRef = useRef(null)
  const badgeRef = useRef(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false) } }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open])

  const close = () => { setOpen(false); badgeRef.current?.focus() }

  return (
    <>
      <button ref={badgeRef} type="button" className="fp-disclaimer-badge" aria-haspopup="dialog"
              onClick={() => setOpen(true)}>
        <span className="fp-disclaimer-dot" aria-hidden="true" />
        {DISCLAIMER_BADGE}
      </button>
      {open && (
        <div className="fp-disclaimer-scrim" onClick={close}>
          <div className="fp-disclaimer-card" role="dialog" aria-modal="true" aria-labelledby="fp-disclaimer-title"
               onClick={e => e.stopPropagation()}>
            <img className="guide-face lg" src={portrait} alt="The Arena's guide" />
            <h2 id="fp-disclaimer-title" className="fp-disclaimer-title">{DISCLAIMER_BADGE}</h2>
            <p className="fp-disclaimer-text">{DISCLAIMER_TEXT}</p>
            <button ref={closeRef} type="button" className="fp-disclaimer-close" onClick={close}>Got it</button>
          </div>
        </div>
      )}
    </>
  )
}
