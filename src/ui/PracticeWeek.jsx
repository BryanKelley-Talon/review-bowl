// ============================================================
// PRACTICE WEEK — between every regular-season game (iteration order §5).
//
// The week off: the squad recovers, watches film, and works on something. Three
// things can happen here and none of them are required — the always-unlocked ethos
// means a student can walk straight out to the field and lose nothing they had.
//
//   1 · DEFENSIVE FILM STUDY — a few vocab items. These are what set the Defense
//       rating for the next game (BK's ruling). The content is borrowed from the
//       vocabulary lanes: it is the same words, studied for a different purpose.
//   2 · PLAYER TRAINING — level one specific player. A right answer from the lane he
//       plays for is the whole price (v4, BK: money was friction with no educational
//       value). A miss costs the week's session on that player, nothing else.
//   3 · FACILITIES — first tier, also on a right answer. The second tier stays an
//       off-season job, bought with cash, because that is the bigger investment moment.
// ============================================================
import { useMemo, useRef, useState } from 'react'
import Question from './Question.jsx'
import Newspaper from './Newspaper.jsx'
import RehabTask from './RehabTask.jsx'
import { INJ_WORDS as IW, afterRehab, rehabTasks } from '../game/injury.js'
import { MAX_LEVEL, PRACTICE_FACILITY_MAX, RESULT, trainPlayer, upgradeFacility } from '../game/season.js'
import { DEFENSE, LANE_OF, ratings, values } from '../game/ratings.js'
import { POSITION_OF, TEAMS, roster } from '../game/teams.js'
import { sportOf, statLabel as sportStatLabel, terms } from '../game/sport.js'

const pips = (n, max = MAX_LEVEL) => '●'.repeat(n) + '○'.repeat(Math.max(0, max - n))

export default function PracticeWeek({ career, setCareer, dealer, manifest, opponent, weekLabel, onAnswer, onDone, rehab = [] }) {
  const rules = manifest.rules || {}
  const want = rules.practice_defense_questions ?? 3
  const [filmRun, setFilmRun] = useState(null)      // { i, right } while the film study is running
  const [gate, setGate] = useState(null)
  const [note, setNote] = useState(null)
  const [trained, setTrained] = useState({})        // one attempt per player per week
  const [facility, setFacility] = useState(null)    // one facility check per week
  // What the local paper writes up. Dressing only: every entry is something that already
  // happened on this screen, recorded as it happens so the page fills in while you work.
  const [events, setEvents] = useState([])
  const logEvent = e => setEvents(list => [...list, e])
  // The rating the paper quotes has to be the one AFTER the week's answers landed. `career`
  // in this closure is still the old one when a gate resolves, so the live value is taken
  // from what onAnswer reports back instead.
  const defenseNow = useRef(null)
  const [filmDone, setFilmDone] = useState(!!career.practiceDone)
  // Rehab (football injuries, 2026-10-04): one session a week, held in memory like training.
  const [rehabRun, setRehabRun] = useState(null)    // { level, task, result }
  const hurt = career.injury || null
  const hurtAtStart = useRef(hurt)

  const r = ratings(career)
  const v = values(r)
  // Volleyball (2026-10-03): the same week, in the sport's own words (sport.js, BK 15:31).
  const sport = sportOf(career)
  const T = terms(sport)
  const players = useMemo(() => roster(career.seed, career.team, career.season, career.levels, sport),
    [career.seed, career.team, career.season, career.levels, sport])
  const statLabel = s => sportStatLabel(sport, manifest, s, LANE_OF)
  const laneLabel = s => manifest.lanes[LANE_OF[s]]?.label || s

  // ── 1 · defensive film study ───────────────────────────────────────────────
  const askFilm = (i, right) => {
    const q = dealer.draw('practice')
    if (!q) { setNote('No vocabulary is loaded for this course yet, so there is no film to study.'); setFilmDone(true); return }
    setFilmRun({ i, right })
    setGate({
      kind: 'film', q,
      stakes: `Defensive film study — ${i + 1} of ${want}. What you get right here is what your defense is worth on Friday.`,
      then: ok => {
        const nextRight = right + (ok ? 1 : 0)
        if (i + 1 < want) askFilm(i + 1, nextRight)
        else {
          setFilmRun(null)
          setFilmDone(true)
          setCareer(c => ({ ...c, practiceDone: true }))
          setNote(`Film study done. That is what the defense carries into the game.`)
          logEvent({ kind: 'film', right: nextRight, of: want, lane: q && q.lane,
                     defense: defenseNow.current ?? v.defense })
        }
      },
    })
  }

  // ── 2 · player training ────────────────────────────────────────────────────
  const train = stat => {
    const q = dealer.draw('training', { lane: LANE_OF[stat] })
    if (!q) { setNote('No questions are loaded for that lane yet.'); return }
    setGate({
      kind: 'training', q, stat,
      stakes: `Get this right and ${players[stat].name} goes up a level. Miss it and he keeps working — you just don't get the level this week.`,
      then: ok => {
        setTrained(t => ({ ...t, [stat]: ok ? 'levelled' : 'missed' }))
        if (ok) {
          setCareer(c => trainPlayer(c, stat))
          setNote(T.trainedNote(players[stat].name, (career.levels[stat] ?? 2) + 1, statLabel(stat)))
          logEvent({ kind: 'level', name: players[stat].name, position: players[stat].position,
                  level: (career.levels[stat] ?? 2) + 1, statLabel: statLabel(stat), lane: LANE_OF[stat] })
        } else setNote(`${players[stat].name} ran the drill anyway. No level this week — try him again next week.`)
      },
    })
  }

  // ── 3 · facilities, first tier, one check a week ───────────────────────────
  // The film room has no content lane of its own, so its check is film study's draw.
  const upgrade = stat => {
    const q = stat === DEFENSE ? dealer.draw('practice') : dealer.draw('training', { lane: LANE_OF[stat] })
    if (!q) { setNote('No questions are loaded for that lane yet.'); return }
    const name = stat === DEFENSE ? 'the film room' : `the ${statLabel(stat).toLowerCase()} facility`
    setGate({
      kind: 'facility', q, stat,
      stakes: `Get this right and ${name} opens this week. One facility check a week, so choose where it helps most.`,
      then: ok => {
        setFacility(ok ? stat : 'missed')
        if (ok) {
          setCareer(c => upgradeFacility(c, stat))
          setNote(`${stat === DEFENSE ? 'Film room' : statLabel(stat)} facility is open — level ${(career.facilities[stat] || 0) + 1}.`)
          logEvent({ kind: 'facility', label: stat === DEFENSE ? 'Film room' : `${statLabel(stat)} facility`,
                  level: (career.facilities[stat] || 0) + 1 })
        } else setNote('Not this week. The facility check comes back next week.')
      },
    })
  }

  const answered = ({ correct, hintsUsed, q }) => {
    const cur = gate
    if (!cur) return
    setGate(null)
    // Film study builds DEFENSE, not the lane the question came from: the words are
    // borrowed, the work is defensive. Training builds its own lane as usual.
    const change = onAnswer(q.lane, correct, hintsUsed, cur.kind === 'film' ? DEFENSE : null)
    if (change && cur.kind === 'film') {
      defenseNow.current = change.after
      if (change.after !== change.before) setNote(`Defense ${change.before} → ${change.after}`)
    }
    cur.then(correct, q)
  }

  const facilityStats = [...Object.keys(POSITION_OF), DEFENSE]

  return (
    <div className="offseason practice">
      <Newspaper team={TEAMS[career.team]} season={career.season}
                 week={career.week + 1} weekLabel={weekLabel} opponent={TEAMS[opponent].name}
                 lastResult={career.week > 0
                   ? ({ [RESULT.W]: 'W', [RESULT.L]: 'L', [RESULT.T]: 'T' })[career.results[career.week - 1]] || null
                   : null}
                 events={events} ratings={v} hawkBox={manifest.culture?.hawk_box} sport={sport} />

      <section className="panel next-game">
        <p className="sub">{T.practiceIntro} <b>Right answers are
          the only currency this week</b>; cash is for the off-season.</p>
        {note && <p className="toast-inline" role="status">{note}</p>}
      </section>

      {sport === 'football' && hurtAtStart.current && (() => {
        const p = players[hurtAtStart.current.stat]
        const pick = lv => {
          const list = rehabTasks(rehab, career.course, lv)
          if (!list.length) return
          setRehabRun({ level: lv, task: list[Math.floor(Math.random() * list.length)], result: null })
        }
        const any = rehabTasks(rehab, career.course, 1).length + rehabTasks(rehab, career.course, 2).length
        return (
          <section className="panel rehab-panel">
            <h3 className="h3">{IW.rehabHead}</h3>
            <p className="sub">{IW.rehabBody(p.name, p.position, hurtAtStart.current.out)}</p>
            {!rehabRun && (any
              ? <div className="rehab-levels">
                  {[1, 2].map(lv => (
                    <button key={lv} type="button" className="btn-secondary" disabled={!rehabTasks(rehab, career.course, lv).length}
                            onClick={() => pick(lv)}>{IW.level[lv]}</button>
                  ))}
                </div>
              : <p className="q-note">{IW.noTasks}</p>)}
            {rehabRun && (
              <RehabTask task={rehabRun.task} onDone={ok => {
                const nextInj = afterRehab(hurtAtStart.current, rehabRun.level, ok)
                setRehabRun(r => ({ ...r, result: ok, after: nextInj }))
                if (ok) setCareer(c => ({ ...c, injury: afterRehab(c.injury, rehabRun.level, true) }))
              }} />
            )}
            {rehabRun && rehabRun.result !== null && (
              <p className="toast-inline" role="status">
                {rehabRun.result
                  ? (rehabRun.after ? IW.right1(p.name) : IW.rightBack(p.name))
                  : IW.wrong(p.name, hurtAtStart.current.out)}
                {' '}{IW.oneSession}
              </p>
            )}
          </section>
        )
      })()}

      <section className="panel">
        <h3 className="h3">{T.filmHead}</h3>
        <p className="sub">{T.filmBody(want)}</p>
        <div className="stat-row" style={{ borderTop: 'none', paddingTop: 0 }}>
          <div className="stat-top">
            <b className="stat-label">{statLabel(DEFENSE)}</b>
            <span className="stat-bar big"><i style={{ width: `${v.defense * 10}%` }} /></span>
            <b className="stat-num">{v.defense}</b>
          </div>
          <div className="stat-parts">
            <span>From film study <b>{r.defense.parts.content}</b>/5</span>
            <span>Squad level <b>{r.defense.parts.roster}</b>/3</span>
            <span>Film room <b>{r.defense.parts.facility}</b>/2</span>
          </div>
        </div>
        {filmDone
          ? <p className="q-note">Film study is done for this week.</p>
          : <button type="button" className="btn-primary" disabled={!!filmRun} onClick={() => askFilm(0, 0)}>
              Watch film · {want} questions
            </button>}
      </section>

      <section className="panel">
        <h3 className="h3">The roster</h3>
        <p className="sub">{T.rosterBody}
          <b>{T.rosterPrice}</b> One session per player per week — so a good week
          can move all five.</p>
        <div className="grid">
          {Object.keys(POSITION_OF).map(stat => {
            const p = players[stat]
            const lvl = career.levels[stat] ?? 2
            const maxed = lvl >= MAX_LEVEL
            const done = trained[stat]
            return (
              <div key={stat} className="card static player-card">
                <div className="card-type">{p.position} · builds {statLabel(stat)}</div>
                <div className="card-name">{p.name} <span className="jersey">#{p.number}</span></div>
                <div className="level-row">
                  <span className="pips" aria-label={`level ${lvl} of ${MAX_LEVEL}`}>{pips(lvl)}</span>
                  <span className="card-blurb">Level {lvl} · +{lvl - 1} to {statLabel(stat)}</span>
                </div>
                {maxed ? <span className="flag">Fully developed</span>
                  : done ? <span className="flag">{done === 'levelled' ? `Levelled up — now ${lvl}` : 'Missed this week'}</span>
                  : <button type="button" className="btn-secondary" onClick={() => train(stat)}>
                      Train · answer a {laneLabel(stat)} question
                    </button>}
              </div>
            )
          })}
        </div>
      </section>

      <section className="panel">
        <h3 className="h3">Facilities</h3>
        <p className="sub">One facility check a week, and a right answer opens it — no money needed. The deeper
          second tier is an off-season job, and that one still costs.</p>
        <div className="grid">
          {facilityStats.map(stat => {
            const lvl = career.facilities[stat] || 0
            const capped = lvl >= PRACTICE_FACILITY_MAX
            const used = facility !== null
            return (
              <div key={stat} className="card static">
                <div className="card-name">{stat === DEFENSE ? 'Film room' : statLabel(stat)}</div>
                <div className="card-blurb">Level {lvl} of 2</div>
                {capped
                  ? <span className="flag">{lvl >= 2 ? 'Maxed' : 'Off-season job'}</span>
                  : used
                    ? <span className="flag">{facility === stat ? 'Opened this week' : 'Check used this week'}</span>
                    : <button type="button" className="btn-secondary" onClick={() => upgrade(stat)}>
                        Open it · answer a {stat === DEFENSE ? 'film' : laneLabel(stat)} question
                      </button>}
              </div>
            )
          })}
        </div>
      </section>

      <div className="row center">
        <button type="button" className="btn-primary" onClick={onDone}>
          {filmDone || Object.keys(trained).length ? `${T.takeTheField} vs ${TEAMS[opponent].name}` : T.skipTakeField}
        </button>
      </div>

      {gate && (
        <Question key={gate.q.id + (gate.kind === 'film' ? `-${filmRun?.i ?? 0}` : '')} q={gate.q}
                  gate={gate.kind === 'film' ? 'Film study'
                    : gate.kind === 'facility' ? `Facilities · ${gate.stat === DEFENSE ? 'film room' : statLabel(gate.stat)}`
                    : `Training · ${players[gate.stat].name}`}
                  hints={rules.hints_regular_season !== false} stakes={gate.stakes}
                  statLine={gate.kind === 'film'
                    ? `Builds Defense · ${manifest.lanes[gate.q.lane]?.label}`
                    : `Builds ${manifest.lanes[gate.q.lane]?.stat_label} · ${manifest.lanes[gate.q.lane]?.label}`}
                  chip={gate.q.size === 'long' ? manifest.culture?.long_chip : null}
                  onDone={answered} />
      )}
    </div>
  )
}
