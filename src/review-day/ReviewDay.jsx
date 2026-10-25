// ============================================================
// REVIEW DAY — whole-class review on the classroom touch display.
// Leo's order 2026-10-24 22:18; BK ruled the concept 22:30 (names, team points, every team answers,
// single-choice units, the desks' template); 22:47 random gym team names; 22:52 "yes to all" (Undo, the timer,
// New class, TOP ANSWERS' two modes, How to play); 23:00 run length; 23:14 sort by purpose and time;
// 23:15 "Let's proceed on an overnight build of these games" — the new modes are DRAFTS until BK approves
// their words, and show only when public/review-day/manifest.json has "lab": true.
// LAWS: no student data, no log-ins, nothing sent. Storage only remembers the screen through a reload or the
// lunch bell, and everything works with it wiped. Every word on screen lives in words.js or the content files.
// ============================================================
import { useCallback, useEffect, useMemo, useState } from 'react'
import DisclaimerBadge from '../shared/DisclaimerBadge.jsx'
import { D, FS, TEAM_NAMES, W, WHERE, applyWhere } from './words.js'
import { loadCourse, loadManifest, shuffle } from './content.js'
import { PURPOSES, TIMES, modeById, modesFor } from './registry.js'
import { clearState, readState, writeState } from './persist.js'
import { Choice, Modal, TEAM_LOOK, TeamTag } from './ui.jsx'
import { Board, FinalAnswer, Lightning, TopAnswers, fileInit } from './modes/fileModes.jsx'
import { Lanes, laneInit } from './modes/lanes.jsx'
import { WhoAmI, WriteReveal, revealInit } from './modes/revealModes.jsx'
import './review-day.css'

const TIMER_CHOICES = [15, 30, 45, 60, 0] // 0 = off
const UNDO_DEPTH = 10
const pickNames = n => shuffle(TEAM_NAMES).slice(0, n)
const INIT = { ...fileInit, ...laneInit, ...revealInit }
const initMode = (id, ctx, setup, game) => (INIT[id] ? INIT[id](ctx, setup, game) : {})

function howCard(setup) {
  const m = setup.mode
  if (m === 'board') return W.howBoard(setup.timer)
  if (m === 'top') return setup.topMode === 'turns' ? W.howTopTurns() : W.howTopWrite(setup.timer)
  return D.how[m] || null
}

// ── full screen: the browser's bars go away so Review Day fills the board (BK 10/25: "as big as we can make it") ──
function useFullscreen() {
  const [on, setOn] = useState(() => !!document.fullscreenElement)
  useEffect(() => {
    const f = () => setOn(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', f)
    return () => document.removeEventListener('fullscreenchange', f)
  }, [])
  const toggle = useCallback(() => {
    try {
      if (document.fullscreenElement) document.exitFullscreen?.()
      else document.documentElement.requestFullscreen?.()
    } catch { /* a browser that can't go full screen just stays as it is */ }
  }, [])
  return [on, toggle]
}
function FullScreenButton() {
  const [on, toggle] = useFullscreen()
  return <button type="button" className="rd-btn small rd-fs" onClick={toggle} aria-pressed={on}>{on ? FS.exit : FS.enter}</button>
}

// ── the front ────────────────────────────────────────────────────────────────
function Front({ manifest, saved, onStart, onResume }) {
  const lab = !!manifest.lab
  const courses = manifest.courses || []
  const [course, setCourse] = useState(saved?.setup?.course || courses[0]?.id || null)
  const [ctx, setCtx] = useState(null)
  useEffect(() => { let on = true; setCtx(null); loadCourse(manifest, course).then(c => on && setCtx(c)); return () => { on = false } }, [manifest, course])

  const purposes = PURPOSES.filter(p => modesFor({ course, purpose: p, lab }).length)
  const [purpose, setPurpose] = useState('test')
  const p = purposes.includes(purpose) ? purpose : purposes[0]
  const times = TIMES.filter(t => modesFor({ course, purpose: p, minutes: t, lab }).length)
  const [minutes, setMinutes] = useState(40)
  const mins = times.includes(minutes) ? minutes : times[times.length - 1]
  const modes = modesFor({ course, purpose: p, minutes: mins, lab })
  const allIds = (ctx?.units || []).map(u => u.unit)
  const countFor = (m, ids) => (ctx ? m.count(ctx, ids) : 0)
  const [modeId, setModeId] = useState('board')
  const ready = modes.filter(m => countFor(m, allIds) > 0)
  const mode = modes.find(m => m.id === modeId && countFor(m, allIds) > 0) || ready[0] || modes[0]

  // Units: Regents Review and all-year modes start with every unit on; anything else, the newest unit with content.
  const withContent = mode && ctx ? ctx.units.filter(u => countFor(mode, [u.unit]) > 0).map(u => u.unit) : []
  const defaultUnits = p === 'regents' || mode?.cumulative ? withContent : withContent.slice(-1)
  const [picked, setPicked] = useState(null)
  useEffect(() => { setPicked(null) }, [course, p, mode?.id])
  const units = picked ?? defaultUnits
  const toggle = u => setPicked(units.includes(u) ? units.filter(x => x !== u) : [...units, u])

  const [where, setWhere] = useState(saved?.setup?.where ?? 'room')
  applyWhere(where)
  const [timer, setTimer] = useState(saved?.setup?.timer ?? 30)
  const [withChime, setChime] = useState(saved?.setup?.chime ?? false)
  const [topMode, setTopMode] = useState(saved?.setup?.topMode ?? 'write')
  const [teams, setTeams] = useState(4)
  const [names, setNames] = useState(() => pickNames(6))
  const reroll = i => setNames(ns => {
    const free = TEAM_NAMES.filter(n => !ns.includes(n))
    const next = ns.slice(); next[i] = free[Math.floor(Math.random() * free.length)]
    return next
  })
  const canStart = ctx && mode && units.length > 0 && countFor(mode, units) > 0

  return (
    <main className="rd-front">
      <div className="rd-front-head">
        <h1 className="rd-title">{W.title}</h1>
        <FullScreenButton />
      </div>
      {saved && (
        <div className="rd-resume"><button type="button" className="rd-btn primary" onClick={onResume}>{W.resume}</button></div>
      )}

      <section className="rd-step">
        <h2>{W.pickCourse}</h2>
        <div className="rd-row">
          {courses.map(c => <Choice key={c.id} on={course === c.id} onClick={() => setCourse(c.id)}>{c.name}</Choice>)}
        </div>
      </section>

      <section className="rd-step">
        <h2>{WHERE.label}</h2>
        <div className="rd-row">
          <Choice on={where === 'room'} onClick={() => setWhere('room')}>{WHERE.room}</Choice>
          <Choice on={where === 'group'} onClick={() => setWhere('group')}>{WHERE.group}</Choice>
        </div>
      </section>

      <section className="rd-step">
        <h2>{D.purposeLabel}</h2>
        <div className="rd-row">
          {purposes.map(x => <Choice key={x} on={p === x} onClick={() => setPurpose(x)}>{D.purposes[x]}</Choice>)}
        </div>
      </section>

      <section className="rd-step">
        <h2>{D.timeLabel}</h2>
        <div className="rd-row">
          {times.map(t => <Choice key={t} cls="num wide" on={mins === t} onClick={() => setMinutes(t)}>{D.minutes(t)}</Choice>)}
        </div>
      </section>

      <section className="rd-step">
        <h2>{D.modeLabel}</h2>
        {!modes.length ? <p className="rd-note">{D.noModes}</p> : (
          <div className="rd-row formats">
            {modes.map(m => {
              const has = countFor(m, allIds) > 0
              return (
                <Choice key={m.id} on={mode?.id === m.id} cls="format" disabled={!has} onClick={() => setModeId(m.id)}>
                  <span className="rd-format-name">{m.name(course)} {m.draft && <span className="rd-sample">{D.draft}</span>}</span>
                  <span className="rd-format-sub">{has ? m.sub(course) : D.notReady}</span>
                </Choice>
              )
            })}
          </div>
        )}
      </section>

      <section className="rd-step">
        <h2>{W.pickUnits}</h2>
        {!ctx?.units?.length ? <p className="rd-note">{W.noUnits}</p> : (
          <div className="rd-row">
            {ctx.units.map(u => {
              const on = units.includes(u.unit)
              const has = mode ? countFor(mode, [u.unit]) > 0 : false
              return (
                <Choice key={u.unit} on={on} cls={`unit${has ? '' : ' dim'}`} onClick={() => toggle(u.unit)}>
                  <span className="rd-check" aria-hidden="true">{on ? '✓' : ''}</span>
                  <span>{u.unit} · {u.title}</span>
                  {u.sample && <span className="rd-sample">{W.sample}</span>}
                </Choice>
              )
            })}
          </div>
        )}
        {ctx && mode && !units.length && <p className="rd-note" role="status">{W.needUnit}</p>}
        {ctx && mode && units.length > 0 && !canStart && <p className="rd-note" role="status">{D.needContent}</p>}
      </section>

      <section className="rd-step">
        <div className="rd-settings">
          {mode?.id === 'top' && (
            <div className="rd-setting">
              <span className="rd-setting-label">{W.topModeLabel}</span>
              <Choice on={topMode === 'write'} cls="small" onClick={() => setTopMode('write')}>{W.modeWrite}</Choice>
              <Choice on={topMode === 'turns'} cls="small" onClick={() => setTopMode('turns')}>{W.modeTurns}</Choice>
            </div>
          )}
          <div className="rd-setting">
            <span className="rd-setting-label">{W.timerLabel}</span>
            {TIMER_CHOICES.map(s => <Choice key={s} on={timer === s} cls="small" onClick={() => setTimer(s)}>{s ? W.secs(s) : W.timerOff}</Choice>)}
          </div>
          {timer > 0 && (
            <div className="rd-setting">
              <span className="rd-setting-label">{W.chimeLabel}</span>
              <Choice on={!withChime} cls="small" onClick={() => setChime(false)}>{W.off}</Choice>
              <Choice on={withChime} cls="small" onClick={() => setChime(true)}>{W.on}</Choice>
            </div>
          )}
        </div>
      </section>

      <section className="rd-step">
        <h2>{W.teams}</h2>
        <div className="rd-row">
          {[2, 3, 4, 5, 6].map(n => <Choice key={n} on={teams === n} cls="num" onClick={() => setTeams(n)}>{n}</Choice>)}
        </div>
        <ul className="rd-names">
          {names.slice(0, teams).map((nm, i) => (
            <li key={i} style={{ '--team': TEAM_LOOK[i].color }}>
              <span className="rd-shape" aria-hidden="true">{TEAM_LOOK[i].shape}</span>
              <span className="rd-name">{nm}</span>
              <button type="button" className="rd-btn small" onClick={() => reroll(i)} aria-label={`${W.newName} for ${nm}`}>{W.newName}</button>
            </li>
          ))}
        </ul>
      </section>

      <div className="rd-go">
        <button type="button" className="rd-btn primary big" disabled={!canStart}
                onClick={() => onStart(ctx, { course, purpose: p, minutes: mins, mode: mode.id, units, teams, names: names.slice(0, teams), timer, chime: withChime, topMode, where })}>
          {W.start}
        </button>
      </div>
    </main>
  )
}

// ── the host ─────────────────────────────────────────────────────────────────
function freshGame(ctx, setup) {
  const game = { setup, scores: Array(setup.teams).fill(0), modeState: {}, history: [], rev: 0, showHelp: true }
  game.modeState[setup.mode] = initMode(setup.mode, ctx, setup, game)
  return game
}

export default function ReviewDay() {
  const [manifest, setManifest] = useState(null)
  const [failed, setFailed] = useState(false)
  const [saved] = useState(readState)
  const [game, setGame] = useState(null)
  const [ctx, setCtx] = useState(null)
  const [pop, setPop] = useState(null) // 'undo' | 'newclass' | 'modes' | null

  useEffect(() => { loadManifest().then(setManifest).catch(() => setFailed(true)) }, [])
  useEffect(() => { document.title = 'Review Day · Flashpoint History' }, [])
  useEffect(() => { if (game) writeState(game) }, [game])

  const start = (c, setup) => { clearState(); setCtx(c); setGame(freshGame(c, setup)) }
  const resume = async () => {
    try { const c = await loadCourse(manifest, saved.setup.course); setCtx(c); setGame({ history: [], rev: 0, ...saved, showHelp: false }) }
    catch { clearState() }
  }
  const menu = () => { setGame(null); setCtx(null) }
  const newClass = () => {
    setGame(g => freshGame(ctx, { ...g.setup, names: pickNames(g.setup.teams) }))
    setPop(null)
  }
  const switchMode = id => {
    setGame(g => {
      const m = modeById(id)
      const setup = { ...g.setup, mode: id, minutes: m.times.includes(g.setup.minutes) ? g.setup.minutes : m.times[m.times.length - 1] }
      const modeState = g.modeState[id] ? g.modeState : { ...g.modeState, [id]: initMode(id, ctx, setup, g) }
      return { ...g, setup, modeState, showHelp: true }
    })
    setPop(null)
  }

  // Every scoring move goes through here, so Undo can put the screen back exactly as it was.
  const commit = useCallback((label, mutate) => setGame(g => {
    const snap = { scores: g.scores, modeState: g.modeState }
    const history = [...(g.history || []), { label, snap }].slice(-UNDO_DEPTH)
    return { ...mutate(g), history }
  }), [])
  const undoTo = i => {
    setGame(g => ({ ...g, ...g.history[i].snap, history: g.history.slice(0, i), rev: (g.rev || 0) + 1 }))
    setPop(null)
  }
  const setMS = useCallback(f => setGame(g => {
    const id = g.setup.mode
    return { ...g, modeState: { ...g.modeState, [id]: typeof f === 'function' ? f(g.modeState[id]) : f } }
  }), [])

  const [fsOn, toggleFs] = useFullscreen()
  useEffect(() => {
    const onKey = e => {
      if ((e.key === 'f' || e.key === 'F') && !e.metaKey && !e.ctrlKey && !e.altKey && !/input|textarea|select/i.test(e.target?.tagName || '')) toggleFs()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleFs])
  if (game) applyWhere(game.setup.where || 'room')
  const names = useMemo(() => (game ? Array.from({ length: game.setup.teams }, (_, i) => game.setup.names?.[i] || W.team(i + 1)) : []), [game])

  if (failed) return <div className="rd"><main className="rd-front"><h1 className="rd-title">{W.title}</h1><p className="rd-note">{W.noUnits}</p></main></div>
  if (!manifest) return <div className="rd" />

  const atFront = !game || !ctx
  const id = game?.setup.mode
  const mode = id && modeById(id)
  const ms = game?.modeState?.[id]
  const props = { ctx, game, names, commit, setMS, ms }
  const k = `${id}-${game?.rev}`
  let screen = null
  if (!atFront && ms) {
    if (id === 'board') screen = <Board key={k} {...props} />
    else if (id === 'top') screen = <TopAnswers key={k} {...props} />
    else if (id === 'final') screen = <FinalAnswer key={k} {...props} />
    else if (id === 'lightning') screen = <Lightning key={k} {...props} />
    else if (id === 'order' || id === 'detective') screen = <Lanes key={k} kind={id} {...props} />
    else if (id === 'who') screen = <WhoAmI key={k} {...props} />
    else screen = <WriteReveal key={k} kind={id} {...props} />
  }
  const how = !atFront && howCard(game.setup)
  const lab = !!manifest.lab
  const switchable = !atFront ? modesFor({ course: game.setup.course, lab }).filter(m => m.count(ctx, game.setup.units) > 0) : []

  return (
    <div className={`rd${atFront ? ' front' : ''}${fsOn ? ' fs' : ''}`} data-mode={atFront ? undefined : id}>
      {atFront ? (
        <Front manifest={manifest} saved={saved?.modeState ? saved : null} onStart={start} onResume={resume} />
      ) : (
        <>
          <header className="rd-bar-top">
            <span className="rd-mark">{W.title}</span>
            <span className="rd-tab on" aria-current="true">{mode?.name(game.setup.course)}</span>
            <div className="rd-tools">
              <FullScreenButton />
              {switchable.length > 1 && <button type="button" className="rd-btn small" onClick={() => setPop('modes')}>{D.modes}</button>}
              <button type="button" className="rd-btn small" onClick={() => setGame(g => ({ ...g, showHelp: true }))}>{W.howTo}</button>
              <button type="button" className="rd-btn small" onClick={() => setPop('undo')}>{W.undo}</button>
              <button type="button" className="rd-btn small" onClick={() => setPop('newclass')}>{W.newClass}</button>
              <button type="button" className="rd-btn small" onClick={menu}>{W.menu}</button>
            </div>
            <div className="rd-teams">
              {game.scores.map((s, i) => <TeamTag key={i} i={i} name={names[i]} score={s} />)}
            </div>
          </header>
          {screen}

          {game.showHelp && how && (
            <Modal label={how.title} onClose={() => setGame(g => ({ ...g, showHelp: false }))}>
              <h2 className="rd-modal-title">{how.title}</h2>
              <p className="rd-how"><b>{W.setUp}</b> {how.setup}</p>
              <ol className="rd-how-steps">{how.steps.map((t, i) => <li key={i}>{t}</li>)}</ol>
              {how.rule && <p className="rd-how rule">{how.rule}</p>}
              <div className="rd-row center"><button type="button" className="rd-btn primary big" onClick={() => setGame(g => ({ ...g, showHelp: false }))}>{W.letsGo}</button></div>
            </Modal>
          )}

          {pop === 'modes' && (
            <Modal label={D.modesTitle} onClose={() => setPop(null)}>
              <h2 className="rd-modal-title">{D.modesTitle}</h2>
              {PURPOSES.map(pp => {
                const list = switchable.filter(m => m.purposes.includes(pp))
                if (!list.length) return null
                return (
                  <div key={pp} className="rd-modes-group">
                    <p className="rd-how"><b>{D.purposes[pp]}</b></p>
                    <div className="rd-row">
                      {list.map(m => (
                        <Choice key={m.id} cls="small" on={m.id === id} onClick={() => switchMode(m.id)}>
                          {m.name(game.setup.course)} · {m.times.map(D.minutes).join(' / ')}
                        </Choice>
                      ))}
                    </div>
                  </div>
                )
              })}
              <div className="rd-row center"><button type="button" className="rd-btn" onClick={() => setPop(null)}>{W.cancel}</button></div>
            </Modal>
          )}

          {pop === 'undo' && (
            <Modal label={W.undoTitle} onClose={() => setPop(null)}>
              <h2 className="rd-modal-title">{W.undoTitle}</h2>
              {game.history.length === 0 ? <p className="rd-how">{W.undoNone}</p> : (
                <ul className="rd-undo">
                  {game.history.map((h, i) => ({ h, i })).reverse().map(({ h, i }) => (
                    <li key={i}><button type="button" className="rd-undo-move" onClick={() => undoTo(i)}>{h.label}</button></li>
                  ))}
                </ul>
              )}
              <p className="rd-how note">{W.undoNote}</p>
              <div className="rd-row center"><button type="button" className="rd-btn" onClick={() => setPop(null)}>{W.cancel}</button></div>
            </Modal>
          )}

          {pop === 'newclass' && (
            <Modal label={W.newClassTitle} onClose={() => setPop(null)}>
              <h2 className="rd-modal-title">{W.newClassTitle}</h2>
              <p className="rd-how">{W.newClassNote}</p>
              <div className="rd-row center">
                <button type="button" className="rd-btn" onClick={() => setPop(null)}>{W.keepPlaying}</button>
                <button type="button" className="rd-btn primary" onClick={newClass}>{W.startOver}</button>
              </div>
            </Modal>
          )}
        </>
      )}
      <div className="rd-foot"><DisclaimerBadge /></div>
    </div>
  )
}
