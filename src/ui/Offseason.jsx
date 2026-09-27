// The off-season (FULL-SPEC §5.4): training camp from the Arena's own Circuit
// packs, free agency (cash AND a correct answer), and facilities (cash).
import { useMemo, useState } from 'react'
import Question from './Question.jsx'
import CampRep, { repsOf } from './CampRep.jsx'
import { FACILITY_COST, MAX_LEVEL, freeAgents } from '../game/season.js'
import { DEFENSE, LANE_OF, applyAnswer } from '../game/ratings.js'
import { player, POSITION_OF } from '../game/teams.js'

const CAMP_REPS = 2
const money = units => `$${units * 10}k`
// Same language as Practice Week: players have levels, not stars.
const pips = n => '●'.repeat(n) + '○'.repeat(Math.max(0, MAX_LEVEL - n))

export default function Offseason({ career, setCareer, camp, dealer, manifest, onAnswer, onStart }) {
  const [campDone, setCampDone] = useState(0)
  const [rep, setRep] = useState(null)
  const [gate, setGate] = useState(null)
  const [decided, setDecided] = useState({})
  const [note, setNote] = useState(null)
  const agents = useMemo(() => freeAgents(career), [career.seed, career.season, career.team])
  const statLabel = s => manifest.lanes[LANE_OF[s]]?.stat_label || s

  const drills = camp.map(c => ({ ...c, reps: repsOf(c.pack) })).filter(c => c.reps.length)

  const openDrill = d => setRep({ rep: d.reps[Math.floor(Math.random() * d.reps.length)], label: d.label })
  const finishRep = () => {
    setRep(null)
    setCampDone(n => n + 1)
    setCareer(c => ({ ...c, form: applyAnswer(c.form, 'skills', true, 0, {}) }))
    setNote('Camp rep done: Toughness form +2.')
  }

  const sign = a => {
    const q = dealer.draw('agency', { lane: LANE_OF[a.stat] })
    const p = player(career.seed, career.team, POSITION_OF[a.stat], career.season + 1, a.level)
    setGate({ a, p, q })
  }
  const signed = ({ correct, hintsUsed, q }) => {
    const { a, p } = gate
    setGate(null)
    onAnswer(q.lane, correct, hintsUsed)
    setDecided(d => ({ ...d, [a.stat]: correct ? 'signed' : 'walked' }))
    if (correct) {
      setCareer(c => ({ ...c, cash: c.cash - a.cost, levels: { ...c.levels, [a.stat]: a.level } }))
      setNote(`Signed ${p.name}, #${p.number}. Your ${statLabel(a.stat)} starter is a level ${a.level} player next season.`)
    } else setNote(`${p.name}'s agent walks. No money spent.`)
  }

  const upgrade = s => {
    const lvl = career.facilities[s] || 0
    const cost = FACILITY_COST[lvl]
    setCareer(c => ({ ...c, cash: c.cash - cost, facilities: { ...c.facilities, [s]: lvl + 1 } }))
    setNote(`${statLabel(s)} facility upgraded to level ${lvl + 1}.`)
  }

  return (
    <div className="offseason">
      {note && <p className="toast-inline" role="status">{note}</p>}

      <section className="panel">
        <h3 className="h3">Training camp</h3>
        <p className="sub">Reps from the Arena's skill stations. Write your attempt, compare it to a strong answer, check your own. Each finished rep builds Toughness. {CAMP_REPS - campDone > 0 ? `${CAMP_REPS - campDone} left this off-season.` : 'Camp is done for this off-season.'}</p>
        <div className="grid">
          {drills.map(d => (
            <button key={d.file} type="button" className="card" disabled={campDone >= CAMP_REPS} onClick={() => openDrill(d)}>
              <div className="card-name">{d.label}</div>
              <div className="card-blurb">{d.reps.length} {d.reps.length === 1 ? 'rep' : 'reps'}</div>
            </button>
          ))}
          {!drills.length && <p className="sub">No camp drills are published for this course yet.</p>}
        </div>
      </section>

      <section className="panel">
        <h3 className="h3">Free agency</h3>
        <p className="sub">Signing costs cash <b>and</b> a right answer from that player's lane. Miss it and the agent walks — you keep your money. Cash: <b>{money(career.cash)}</b>.</p>
        <div className="grid">
          {agents.map(a => {
            const p = player(career.seed, career.team, POSITION_OF[a.stat], career.season + 1, a.level)
            const have = career.levels[a.stat] || 2
            const status = decided[a.stat]
            const worse = a.level <= have
            return (
              <div key={a.stat} className="card static">
                <div className="card-type">{POSITION_OF[a.stat]} · {statLabel(a.stat)}</div>
                <div className="card-name">{p.name} #{p.number}</div>
                <div className="card-blurb"><span className="pips">{pips(a.level)}</span> level {a.level} · yours now level {have} · {money(a.cost)}</div>
                {status ? <span className="flag">{status === 'signed' ? 'Signed' : 'Walked'}</span>
                  : <button type="button" className="btn-secondary" disabled={worse || career.cash < a.cost} onClick={() => sign(a)}>
                      {worse ? 'No upgrade' : career.cash < a.cost ? 'Not enough cash' : `Sign · answer a ${manifest.lanes[LANE_OF[a.stat]]?.label} question`}
                    </button>}
              </div>
            )
          })}
        </div>
      </section>

      <section className="panel">
        <h3 className="h3">Facilities</h3>
        <p className="sub">Permanent +1 to a stat, bought with cash. They stay with the team — if you're fired, they don't come with you. What you know does.</p>
        <div className="grid">
          {[...Object.keys(POSITION_OF), DEFENSE].map(s => {
            const lvl = career.facilities[s] || 0
            const cost = FACILITY_COST[lvl]
            return (
              <div key={s} className="card static">
                <div className="card-name">{s === DEFENSE ? 'Film room' : statLabel(s)}</div>
                <div className="card-blurb">Level {lvl} of 2</div>
                {lvl >= 2 ? <span className="flag">Maxed</span>
                  : <button type="button" className="btn-secondary" disabled={career.cash < cost} onClick={() => upgrade(s)}>Upgrade · {money(cost)}</button>}
              </div>
            )
          })}
        </div>
      </section>

      <div className="row center">
        <button type="button" className="btn-primary" onClick={onStart}>Start season {career.season + 1}</button>
      </div>

      {rep && <CampRep rep={rep.rep} label={rep.label} onDone={finishRep} onCancel={() => setRep(null)} />}
      {gate && gate.q && (
        <Question key={gate.a.stat} q={gate.q} gate={`Free agency · ${gate.p.name}`} hints={manifest.rules.hints_regular_season !== false}
                  stakes={`Answer right to sign him for ${money(gate.a.cost)}. Miss and he walks — no money spent.`}
                  statLine={`Builds ${manifest.lanes[gate.q.lane]?.stat_label} · ${manifest.lanes[gate.q.lane]?.label}`}
                  chip={gate.q.size === 'long' ? manifest.culture?.long_chip : null}
                  onDone={signed} />
      )}
    </div>
  )
}
