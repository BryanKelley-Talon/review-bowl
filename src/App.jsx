// ============================================================
// SKILLS REVIEW BOWL — Flashpoint History · under the Arena umbrella
//
// Retro Bowl's loop: pick a team, play the season, win or get fired, rebuild.
// The difference is underneath it (FULL-SPEC §1): you will not win the football
// unless you win the content. Dead-ball gates ask; the stat layer answers on the field.
//
// LAWS THIS FILE KEEPS:
//   • Zero student data. No accounts, no server, no tracking of any kind.
//   • The save code is the save (§4). Browser storage is a convenience only; a wiped
//     device returns a usable game, and the code restores everything.
//   • Nothing locks a student out. Any career can be picked up from its code.
//   • Fake player names and numbers, always (§5.3).
// ============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import DisclaimerBadge from './shared/DisclaimerBadge.jsx'
import Match from './game/Match.jsx'
import Offseason from './ui/Offseason.jsx'
import PracticeWeek from './ui/PracticeWeek.jsx'
import { loadDoor } from './content/pool.js'
import { makeDealer } from './content/dealer.js'
import { DEFENSE, LANES, STAT_OF, applyAnswerAll, explain, ratings, values } from './game/ratings.js'
import {
  afterGame, applySeasonReview, bracket, finishPractice, jobOffers, MAX_LEVEL, newCareer, opponentFor,
  opponentStrength, playoffOpponent, record, RESULT, schedule, seasonReview, standings, startNextSeason, takeJob,
} from './game/season.js'
import { roster, TEAMS } from './game/teams.js'
import { decodeSaveCode, encodeSaveCode } from './save/saveCode.js'
import { clearAutosave, readAutosave, writeAutosave } from './save/persist.js'

const money = units => `$${units * 10}k`
const RES_WORD = { 1: 'W', 2: 'L', 3: 'T' }

// ── small pieces ─────────────────────────────────────────────────────────────
function Swatch({ team }) {
  return (
    <span className="swatch" aria-hidden="true">
      {team.colors.map((c, i) => <i key={i} style={{ background: c }} />)}
    </span>
  )
}

function CodeBox({ career, big }) {
  const code = encodeSaveCode(career)
  return (
    <div className={`codebox${big ? ' big' : ''}`}>
      <div className="eyebrow">Your save code</div>
      <p className="code" aria-label="Your save code">{code}</p>
      <p className="sub">Write it on your worksheet or take a screenshot. On any computer, <b>Enter a save code</b> picks up exactly here — team, record, cash, stats, all of it. It holds nothing about you.</p>
    </div>
  )
}

// ── title, doors, teams, code ────────────────────────────────────────────────
function Title({ manifest, onNew, onContinue, onCode, onAbout }) {
  const saved = useMemo(() => readAutosave(), [])
  return (
    <div className="wrap title">
      <div className="eyebrow">Flashpoint History · The Arena</div>
      <h1 className="h1">Skills Review Bowl</h1>
      <p className="tag">You won't win the football unless you win the content.</p>
      <div className="stack">
        {saved && (
          <button type="button" className="btn-primary" onClick={() => onContinue(saved)}>
            Continue · {TEAMS[saved.team].name}, season {saved.season}
          </button>
        )}
        <button type="button" className={saved ? 'btn-secondary' : 'btn-primary'} onClick={onNew}>New career</button>
        <button type="button" className="btn-secondary" onClick={onCode}>Enter a save code</button>
        <button type="button" className="btn-ghost" onClick={onAbout}>How it works</button>
      </div>
      {saved && <p className="sub small">The continue button is a copy on this computer. School computers can erase it — your save code is the real save.</p>}
    </div>
  )
}

function DoorPick({ manifest, onPick, onBack }) {
  return (
    <div className="wrap">
      <button type="button" className="back" onClick={onBack}>← Back</button>
      <h2 className="h2">Which course?</h2>
      <p className="sub">The questions come from this course. Your whole career stays on it.</p>
      <div className="grid doors">
        {Object.entries(manifest.courses).map(([id, c]) => (
          <button key={id} type="button" className="card door" onClick={() => onPick(id)}>
            <span className="door-accent" style={{ background: c.accent }} />
            <div className="card-name">{c.label}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function TeamPick({ onPick, onBack }) {
  return (
    <div className="wrap">
      <button type="button" className="back" onClick={onBack}>← Back</button>
      <h2 className="h2">Pick your team</h2>
      <p className="sub">Any team, any colors — it's just the jersey. Players are made up.</p>
      <div className="grid teams">
        {TEAMS.map((t, i) => (
          <button key={t.id} type="button" className="card team" onClick={() => onPick(i)}
                  style={{ borderTopColor: t.colors[1] === '#FFFFFF' || t.colors[1] === '#111111' ? t.colors[0] : t.colors[1] }}>
            <Swatch team={t} />
            <div className="card-name">{t.name}</div>
            <div className="card-blurb">{t.colorNames}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function CodeEntry({ manifest, onLoad, onBack }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const go = () => {
    setError(null)
    try {
      const c = decodeSaveCode(code)
      if (!manifest.courses[c.course]) throw new Error('That code is for a course this version doesn’t have.')
      onLoad(c)
    } catch (e) { setError(e.message) }
  }
  return (
    <div className="wrap narrow">
      <button type="button" className="back" onClick={onBack}>← Back</button>
      <h2 className="h2">Enter a save code</h2>
      <div className="code-row">
        <input className="code-input" value={code} onChange={e => setCode(e.target.value)} autoFocus
               onKeyDown={e => { if (e.key === 'Enter' && code.trim()) go() }}
               placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XX" aria-label="Your save code" autoComplete="off" spellCheck={false} />
        <button type="button" className="btn-primary" disabled={!code.trim()} onClick={go}>Load</button>
      </div>
      <p className="sub small">Dashes and capitals don't matter. An O can be a zero and an I or L can be a one.</p>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  )
}

// ── the team screen ──────────────────────────────────────────────────────────
function TeamPanel({ career, manifest, pool }) {
  const r = ratings(career)
  const players = roster(career.seed, career.team, career.season, career.levels)
  return (
    <section className="panel">
      <h3 className="h3">Your team's stats</h3>
      <p className="sub">Each stat is built mostly from one kind of question. Answer those well and it shows up on the field.</p>
      <div className="stats">
        {LANES.map(l => {
          const s = STAT_OF[l]
          const lane = manifest.lanes[l]
          const n = (pool?.lanes[l] || []).length
          const p = r[s].parts
          const pl = players[s]
          return (
            <div key={l} className="stat-row">
              <div className="stat-top">
                <b className="stat-label">{lane.stat_label}</b>
                <span className="stat-bar big"><i style={{ width: `${r[s].value * 10}%` }} /></span>
                <b className="stat-num">{r[s].value}</b>
              </div>
              <div className="stat-parts">
                <span>From answers <b>{p.content}</b>/5</span>
                <span>{pl.position} {pl.name} #{pl.number} · <b>level {pl.level}</b></span>
                <span>Facility <b>{p.facility}</b>/2</span>
              </div>
              <div className="stat-why">
                {n ? `${lane.label} questions build this (${n} in the pool).` : `No ${lane.label.toLowerCase()} questions on this course yet — every answer builds it until they land.`}
                {' '}{explain(s, r[s].value)}
              </div>
            </div>
          )
        })}
        <div className="stat-row">
          <div className="stat-top">
            <b className="stat-label">Defense</b>
            <span className="stat-bar big"><i style={{ width: `${r[DEFENSE].value * 10}%` }} /></span>
            <b className="stat-num">{r[DEFENSE].value}</b>
          </div>
          <div className="stat-parts">
            <span>From film study <b>{r[DEFENSE].parts.content}</b>/5</span>
            <span>Squad level <b>{r[DEFENSE].parts.roster}</b>/3</span>
            <span>Film room <b>{r[DEFENSE].parts.facility}</b>/2</span>
          </div>
          <div className="stat-why">Trained in Practice Week, not during a game. {explain(DEFENSE, r[DEFENSE].value)}</div>
        </div>
      </div>
    </section>
  )
}

function Schedule({ career }) {
  const rounds = schedule(career.seed, career.season)
  return (
    <section className="panel">
      <h3 className="h3">Season {career.season} schedule</h3>
      <ol className="sched">
        {rounds.map((_, w) => {
          const o = opponentFor(career.seed, career.season, career.team, w)
          const res = career.results[w]
          const next = career.phase === 'regular' && w === career.week
          return (
            <li key={w} className={next ? 'next' : undefined}>
              <span>Week {w + 1}</span><span>vs {TEAMS[o].name}</span>
              <b className={res === 1 ? 'win' : res === 2 ? 'loss' : undefined}>{RES_WORD[res] || (next ? 'Next' : '')}</b>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function Standings({ career }) {
  const rows = standings(career)
  return (
    <section className="panel">
      <h3 className="h3">Standings</h3>
      <table className="tbl standings">
        <thead><tr><th scope="col">#</th><th scope="col">Team</th><th scope="col">W</th><th scope="col">L</th><th scope="col">T</th></tr></thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.index} className={row.index === career.team ? 'mine' : undefined}>
              <td>{i + 1}{i === 3 ? <span className="cut" aria-label="playoff line" /> : null}</td>
              <th scope="row">{row.team.name}</th><td>{row.w}</td><td>{row.l}</td><td>{row.t}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="sub small">Top four make the playoffs.</p>
    </section>
  )
}

function SeasonEnd({ career, onContinue }) {
  const rv = seasonReview(career)
  return (
    <section className="panel center">
      <div className="eyebrow">Season {career.season} is over</div>
      <h2 className="h2">{rv.rec.w}–{rv.rec.l}{rv.rec.t ? `–${rv.rec.t}` : ''}{rv.champ ? ' · Champions' : rv.made ? ' · Playoffs' : ''}</h2>
      <ul className="ht-list">
        {rv.reasons.map((x, i) => <li key={i}>{x}</li>)}
        <li>Job security: {career.security} → {rv.after} of 31</li>
      </ul>
      <p className="sub">{rv.fired ? 'The front office has seen enough. You’re fired.' : 'The front office keeps you on. On to the off-season.'}</p>
      <button type="button" className="btn-primary" onClick={onContinue}>{rv.fired ? 'See who’s calling' : 'Off-season'}</button>
    </section>
  )
}

function Jobs({ career, onTake }) {
  const offers = jobOffers(career)
  return (
    <section className="panel center">
      <div className="eyebrow">Fired — but the phone is ringing</div>
      <h2 className="h2">Pick your next job</h2>
      <p className="sub">Everything you know comes with you: your stats' "from answers" part stays. The new team's roster and facilities are theirs.</p>
      <div className="grid teams">
        {offers.map(i => (
          <button key={i} type="button" className="card team" onClick={() => onTake(i)}>
            <Swatch team={TEAMS[i]} />
            <div className="card-name">{TEAMS[i].name}</div>
            <div className="card-blurb">{TEAMS[i].colorNames}</div>
          </button>
        ))}
      </div>
    </section>
  )
}

function Hub({ career, setCareer, manifest, door, onPlay, onAnswer, onQuit }) {
  const team = TEAMS[career.team]
  const rec = record(career.results)
  let next = null
  if (career.phase === 'regular' || career.phase === 'practice') {
    const o = opponentFor(career.seed, career.season, career.team, career.week)
    next = { opp: o, label: `Week ${career.week + 1} of 8`, playoff: false }
  } else if (career.phase === 'playoffs') {
    const o = playoffOpponent(career)
    next = { opp: o, label: career.playoffRound === 1 ? 'Playoff semifinal' : 'Championship', playoff: true }
  }
  const b = career.phase === 'playoffs' ? bracket(career) : null

  return (
    <div className="wrap">
      <div className="hub-head" style={{ borderColor: team.colors[1] === '#FFFFFF' ? team.colors[0] : team.colors[1] }}>
        <Swatch team={team} />
        <div>
          <div className="eyebrow">{manifest.courses[career.course].short} · Season {career.season}{career.titles ? ` · ${career.titles} title${career.titles > 1 ? 's' : ''}` : ''}</div>
          <h2 className="h2">{team.name}</h2>
          <div className="hub-meta">
            <span>Record <b>{rec.w}–{rec.l}{rec.t ? `–${rec.t}` : ''}</b></span>
            <span>Cash <b>{money(career.cash)}</b></span>
            <span>Job security <span className="meter" aria-label={`${career.security} of 31`}><i style={{ width: `${career.security / 31 * 100}%` }} /></span></span>
          </div>
        </div>
        <button type="button" className="btn-ghost hub-quit" onClick={onQuit}>Title screen</button>
      </div>

      {career.phase === 'practice' && door && next && (
        <PracticeWeek career={career} setCareer={setCareer} dealer={door.dealer} manifest={manifest}
                      opponent={next.opp} weekLabel={next.label} onAnswer={onAnswer}
                      onDone={() => { const c = finishPractice(career); setCareer(c); onPlay({ ...next, career: c }) }} />
      )}

      {next && career.phase !== 'practice' && (
        <section className="panel next-game">
          <div className="eyebrow">{next.label}</div>
          <h3 className="h3">{team.name} vs {TEAMS[next.opp].name}</h3>
          {b && career.playoffRound === 2 && <p className="sub">{TEAMS[b.otherWinner].name} won the other semifinal.</p>}
          <p className="sub">{next.playoff ? 'Playoffs run cold: no hints, and every question can decide it.' : 'Regular season: two hints on every question.'}</p>
          <button type="button" className="btn-primary" onClick={() => onPlay(next)}>Play</button>
        </section>
      )}
      {career.phase === 'seasonEnd' && <SeasonEnd career={career} onContinue={() => setCareer(applySeasonReview(career))} />}
      {career.phase === 'jobs' && <Jobs career={career} onTake={i => setCareer(takeJob(career, i))} />}
      {career.phase === 'offseason' && door && (
        <Offseason career={career} setCareer={setCareer} camp={door.camp} dealer={door.dealer} manifest={manifest}
                   onAnswer={onAnswer} onStart={() => setCareer(startNextSeason(career))} />
      )}

      <div className="cols">
        <TeamPanel career={career} manifest={manifest} pool={door?.pool} />
        <div>
          <CodeBox career={career} />
          <Schedule career={career} />
          <Standings career={career} />
        </div>
      </div>
    </div>
  )
}

// After every game: the save code is the first-class step, not an option (§4).
function Postgame({ career, last, onDone }) {
  const t = TEAMS[career.team], o = TEAMS[last.opp]
  return (
    <div className="wrap narrow">
      <div className="panel center">
        <div className="eyebrow">{last.label} · Final</div>
        <h2 className="h2">{t.abbr} {last.you} – {last.oppScore} {o.abbr}</h2>
        <p className="sub">{last.result === RESULT.W ? 'Win.' : last.result === RESULT.L ? 'Loss.' : 'Tie.'} Questions right: {last.right} of {last.total}. Press conference: {last.press ? 'the room liked it (+$10k, +1 security)' : 'no bonus'}.</p>
        <p className="sub">Earned {money(last.earned)} · job security {last.security >= 0 ? '+' : ''}{last.security}</p>
      </div>
      <CodeBox career={career} big />
      <div className="row center">
        <button type="button" className="btn-primary" onClick={onDone}>I wrote it down — continue</button>
      </div>
    </div>
  )
}

function About({ manifest, door, onBack }) {
  return (
    <div className="wrap narrow about">
      <button type="button" className="back" onClick={onBack}>← Back</button>
      <h2 className="h2">How it works</h2>
      <h3 className="h3">Playing</h3>
      <ul>
        <li><b>Throw:</b> after the snap, drag back from anywhere and let go — like a slingshot. The gold ring shows where the ball can land; better Throwing, smaller ring.</li>
        <li><b>Run:</b> tap once before throwing and the quarterback takes off. With the ball, hold and point up or down to steer; tap to juke.</li>
        <li><b>Keyboard:</b> Enter snaps. Keys 1–4 throw to that receiver. Space runs, then jukes. Arrow keys steer.</li>
        <li>The other team's drives are simulated. Your Defense rating holds them.</li>
      </ul>
      <h3 className="h3">Where the questions come in</h3>
      <p>Only when the football stops: the coin toss, every extra point, a timeout, halftime, the press conference, and free agency. Sometimes a big 3rd down or red-zone snap offers one too — that one is optional. <b>A wrong extra-point answer never costs the touchdown.</b> The six are already on the board.</p>
      <p>Every answer builds one of your team's five stats. Know the material and your team gets better on the field. Regular season: two hints per question. Playoffs: no hints.</p>
      <h3 className="h3">Saving</h3>
      <p>After every game you get a save code. It holds your whole career and nothing about you. This computer also keeps a copy, but school computers can erase it — the code is the real save.</p>
      {door && (
        <>
          <h3 className="h3">What's in the question pool ({door.pool.course === 'us11r' ? 'US 11R' : 'Global 10R'})</h3>
          <table className="tbl">
            <thead><tr><th scope="col">Lane</th><th scope="col">Builds</th><th scope="col">Questions</th></tr></thead>
            <tbody>
              {LANES.map(l => <tr key={l}><th scope="row">{manifest.lanes[l].label}</th><td>{manifest.lanes[l].stat_label}</td><td>{door.pool.lanes[l].length}</td></tr>)}
            </tbody>
          </table>
          {/* The held list is a report for the desks, not something a student reads. It shows
              in a dev build only; the desks get the same list in their passes. */}
          {import.meta.env.DEV && !!door.pool.held.length && (
            <p className="sub small">Held out of the pool: {door.pool.held.map(h => `${h.id} (${h.reason})`).join('; ')}.</p>
          )}
        </>
      )}
      <p className="sub small">No accounts, no logins, nothing sent anywhere. Players and numbers are made up.</p>
    </div>
  )
}

// ── the app ──────────────────────────────────────────────────────────────────
export default function App() {
  const [manifest, setManifest] = useState(null)
  const [error, setError] = useState(null)
  const [screen, setScreen] = useState('title')
  const [career, setCareerState] = useState(null)
  const careerRef = useRef(null)
  const [door, setDoor] = useState(null)
  const [pendingCourse, setPendingCourse] = useState(null)
  const [game, setGame] = useState(null)
  const [last, setLast] = useState(null)

  const setCareer = useCallback(next => {
    const value = typeof next === 'function' ? next(careerRef.current) : next
    careerRef.current = value
    setCareerState(value)
    if (value) writeAutosave(value)
  }, [])

  useEffect(() => { window.scrollTo(0, 0) }, [screen])

  useEffect(() => {
    fetch('/bowl.manifest.json').then(r => { if (!r.ok) throw new Error(`manifest ${r.status}`); return r.json() })
      .then(setManifest).catch(e => setError(e.message))
  }, [])

  // The door's pool: loaded once per course, the dealer built from it.
  const course = career?.course || pendingCourse
  useEffect(() => {
    if (!manifest || !course) return
    let live = true
    loadDoor(manifest, course).then(d => {
      if (live) setDoor({ ...d, dealer: makeDealer(d.pool, manifest.courses[course], manifest.rules) })
    })
    return () => { live = false }
  }, [manifest, course])

  // Every answer, anywhere: build the lane's form, and say what moved.
  // asLane: the lane this answer BUILDS, when that is not the lane it came from —
  // Practice Week's film study borrows vocabulary questions to build Defense.
  const onAnswer = useCallback((lane, correct, hintsUsed, asLane) => {
    const c = careerRef.current
    const target = asLane || lane
    const stat = STAT_OF[target]
    const before = values(ratings(c))[stat]
    const form = asLane
      ? applyAnswerAll(c.form, target, correct, hintsUsed, manifest.rules, [])
      : applyAnswerAll(c.form, lane, correct, hintsUsed, manifest.rules, door?.dealer.emptyLanes)
    const next = { ...c, form }
    setCareer(next)
    return { label: manifest.lanes[target].stat_label, before, after: values(ratings(next))[stat] }
  }, [manifest, door, setCareer])

  if (error) return <div className="wrap"><p className="error">The game could not load its manifest: {error}</p></div>
  if (!manifest) return <div className="wrap"><p className="sub">Loading…</p></div>

  const play = next => {
    setGame({ ...next, key: Date.now(), strength: opponentStrength(careerRef.current, next.opp) })
    setScreen('match')
  }
  const finishGame = out => {
    const { career: c, earned, security } = afterGame(careerRef.current, out)
    setCareer(c)
    setLast({ ...out, oppScore: out.opp, opp: game.opp, label: game.label, earned, security })
    setGame(null)
    setScreen('post')
  }

  let body
  if (screen === 'title') body = (
    <Title manifest={manifest}
           onNew={() => setScreen('door')}
           onContinue={c => { setCareer(c); setScreen('hub') }}
           onCode={() => setScreen('code')}
           onAbout={() => setScreen('about')} />
  )
  else if (screen === 'door') body = <DoorPick manifest={manifest} onBack={() => setScreen('title')}
                                               onPick={id => { setPendingCourse(id); setScreen('team') }} />
  else if (screen === 'team') body = <TeamPick onBack={() => setScreen('door')}
                                               onPick={i => { clearAutosave(); setCareer(newCareer(pendingCourse, i)); setScreen('hub') }} />
  else if (screen === 'code') body = <CodeEntry manifest={manifest} onBack={() => setScreen('title')}
                                                onLoad={c => { setCareer(c); setScreen('hub') }} />
  else if (screen === 'about') body = <About manifest={manifest} door={door} onBack={() => setScreen(career ? 'hub' : 'title')} />
  else if (screen === 'match' && game && door) body = (
    <div className="wrap wide">
      <Match key={game.key} career={career} dealer={door.dealer} manifest={manifest} opp={game.opp}
             oppStrength={game.strength} playoff={game.playoff} weekLabel={game.label}
             onAnswer={onAnswer} onFinish={finishGame} />
    </div>
  )
  else if (screen === 'match') body = <div className="wrap"><p className="sub">Loading the question pool…</p></div>
  else if (screen === 'post' && last) body = <Postgame career={career} last={last} onDone={() => setScreen('hub')} />
  else if (career) body = (
    <Hub career={career} setCareer={setCareer} manifest={manifest} door={door} onPlay={play} onAnswer={onAnswer}
         onQuit={() => setScreen('title')} />
  )
  else body = <Title manifest={manifest} onNew={() => setScreen('door')} onContinue={c => { setCareer(c); setScreen('hub') }}
                     onCode={() => setScreen('code')} onAbout={() => setScreen('about')} />

  return (
    <>
      <main className="app">{body}</main>
      <footer className="foot">
        {career && screen !== 'match' && <button type="button" className="linkish" onClick={() => setScreen('about')}>How it works</button>}
      </footer>
      <DisclaimerBadge portrait="/images/arena/guide-bk.png" />
    </>
  )
}
