// ============================================================
// THE HOOPS LAB — basketball's engine pass, reachable in the DEV build only (#hoops).
//
// Basketball is not on the sport pick yet: the save code learns a third sport in its own session
// (version 4), and the words wait for BK's yes. Until then this is the only way onto the floor, and
// main.jsx loads it only when import.meta.env.DEV is true, so a student's build never contains it.
// #hoops-auto plays itself (the court's test harness, as volleyball's #auto does).
// ============================================================
import { useCallback, useEffect, useMemo, useState } from 'react'
import HoopsMatch from './HoopsMatch.jsx'
import { loadDoor } from '../content/pool.js'
import { makeDealer } from '../content/dealer.js'
import { applyAnswer, ratings, values, STAT_OF, LANE_OF } from './ratings.js'
import { newCareer } from './season.js'
import { TEAMS } from './teams.js'
import { statLabel } from './sport.js'

export default function HoopsLab() {
  const [manifest, setManifest] = useState(null)
  const [door, setDoor] = useState(null)
  const [course, setCourse] = useState('us11r')
  const [team, setTeam] = useState(0)
  const [opp, setOpp] = useState(1)
  const [strength, setStrength] = useState(5)
  const [girls, setGirls] = useState(false)
  const [home, setHome] = useState('you')
  const [first, setFirst] = useState(true)
  const [game, setGame] = useState(null)
  const [career, setCareer] = useState(null)
  const [last, setLast] = useState(null)

  useEffect(() => { fetch('/bowl.manifest.json').then(r => r.json()).then(setManifest) }, [])
  useEffect(() => {
    if (!manifest) return
    let live = true
    loadDoor(manifest, course).then(d => { if (live) setDoor({ ...d, dealer: makeDealer(d.pool, manifest.courses[course], manifest.rules) }) })
    return () => { live = false }
  }, [manifest, course])

  const start = () => {
    const c = { ...newCareer(course, team, 7, 'football'), sport: 'basketball', phase: 'regular', week: first ? 0 : 3 }
    setCareer(c); setLast(null); setGame({ key: Math.random() })
  }
  const onAnswer = useCallback((lane, correct, hintsUsed) => {
    let out = null
    setCareer(c => {
      const next = { ...c, form: applyAnswer(c.form, lane, correct, hintsUsed, manifest.rules) }
      const stat = STAT_OF[lane]
      out = { label: statLabel('basketball', manifest, stat, LANE_OF), before: values(ratings(c))[stat], after: values(ratings(next))[stat] }
      return next
    })
    return out
  }, [manifest])
  const teamOpts = useMemo(() => TEAMS.map((t, i) => <option key={t.id} value={i}>{t.name}</option>), [])

  if (!manifest || !door) return <div className="wrap"><p className="sub">Loading the lab…</p></div>
  if (game && career) return (
    <div className="wrap wide">
      <HoopsMatch key={game.key} career={career} dealer={door.dealer} manifest={manifest} opp={opp} oppStrength={strength}
                  playoff={false} weekLabel="Lab game" girls={girls} home={home} howtoSeen={false}
                  onAnswer={onAnswer} onFinish={f => { setLast(f); setGame(null) }} />
    </div>
  )
  return (
    <div className="wrap">
      <div className="panel">
        <div className="eyebrow">Dev lab · not in a student's build</div>
        <h2 className="h2">Basketball engine</h2>
        {last && <p className="sub">Last game: {last.you}–{last.opp}, {last.right} of {last.total} questions right.</p>}
        <div className="lab-grid" style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', margin: '12px 0' }}>
          <label>Course <select value={course} onChange={e => setCourse(e.target.value)}>{Object.keys(manifest.courses).map(c => <option key={c}>{c}</option>)}</select></label>
          <label>Your team <select value={team} onChange={e => setTeam(+e.target.value)}>{teamOpts}</select></label>
          <label>Opponent <select value={opp} onChange={e => setOpp(+e.target.value)}>{teamOpts}</select></label>
          <label>Their strength <input type="number" min="1" max="10" value={strength} onChange={e => setStrength(+e.target.value)} /></label>
          <label>Home gym <select value={home} onChange={e => setHome(e.target.value)}><option value="you">Yours</option><option value="them">Theirs</option></select></label>
          <label>Season <select value={girls ? 'g' : 'b'} onChange={e => setGirls(e.target.value === 'g')}><option value="b">Boys</option><option value="g">Girls</option></select></label>
          <label><input type="checkbox" checked={first} onChange={e => setFirst(e.target.checked)} /> First game (guided cards)</label>
        </div>
        <button type="button" className="btn-primary" onClick={start} disabled={team === opp}>Tip it off</button>
      </div>
    </div>
  )
}
