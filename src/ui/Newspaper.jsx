// ============================================================
// THE LOCAL PAPER — the between-game screen, written up as a sports page.
// BK, 2026-09-22: "a newspaper style popout for the between game screens... it would be
// cool to have a sports page type thing" and "the newspaper metric can be celebrating the
// successes of content and skill growth...leading up to next game, i dont know. it's dressing."
//
// DRESSING, EXACTLY AS BK SAID. There is no new mechanic under this and no new state: every
// line is written from things that already happened — last week's result, what the film room
// scored, who levelled up, what facility opened, who is next. If the week is quiet the page
// says so rather than inventing a story.
//
// It is written to CELEBRATE THE WORK: the headline names the content a student got right,
// because that is the thing this game is actually about.
// ============================================================

// ONE nondescript masthead, built from the team's own name. BK ruled the word, 2026-09-22:
// "Corning Gazette (its far enough away from Stargazette)---that works for all of them."
//
// The first version gave each town its own paper title and several landed on the REAL papers
// of those real towns (the Elmira Star-Gazette, the Ithaca Journal and Binghamton's Press &
// Sun-Bulletin all exist). Naming a real publication beside a real town is the masthead
// version of using a real kid's name. One generic suffix means there is no list to collide
// with anything — including when an eleventh team is added.
const PAPER_SUFFIX = 'Gazette'

const LANE_WORD = {
  sources: 'reading sources', context: 'historical context', vocab: 'vocabulary',
  reading: 'task words', skills: 'skills and principles', defense: 'film study',
}

// The week's biggest story, in priority order. Each returns a headline and the line under it.
function leadStory({ events, team, lastResult, opponent, week }) {
  const levels = events.filter(e => e.kind === 'level')
  const film = events.find(e => e.kind === 'film')
  const facility = events.find(e => e.kind === 'facility')

  if (levels.length >= 2) {
    return {
      head: `${levels.length} MOVE UP IN A BIG WEEK`,
      story: `${levels.map(l => l.name.split(' ').slice(-1)[0]).join(' and ')} both earned promotions on the practice ` +
             `field, and the coaching staff credits the work in the room — every session was won on a question first.`,
    }
  }
  if (levels.length === 1) {
    const l = levels[0]
    return {
      head: `${l.name.split(' ').slice(-1)[0].toUpperCase()} EARNS A PROMOTION`,
      story: `${l.name} is a level ${l.level} player this morning after answering a ${LANE_WORD[l.lane] || 'content'} ` +
             `question to close out the session. ${team.name}'s ${l.statLabel.toLowerCase()} goes up with him.`,
    }
  }
  if (film && film.right === film.of && film.of > 0) {
    return {
      head: 'FILM ROOM SWEEP',
      story: `A clean ${film.right}-for-${film.of} in the film room. The defense goes into Friday rated ${film.defense} — ` +
             `and it counts for most when the other team gets close to the goal line.`,
    }
  }
  if (film && film.right > 0) {
    return {
      head: 'DEFENSE PUTS IN THE WORK',
      story: `${film.right} of ${film.of} in the film room. The defense is rated ${film.defense} going into Friday; ` +
             `another session next week moves it again.`,
    }
  }
  if (film) {
    return {
      head: 'A LONG SESSION IN THE FILM ROOM',
      story: `Nothing fell the right way this week, and the staff is honest about it. The tape will be there again ` +
             `next week, and so will the questions.`,
    }
  }
  if (facility) {
    return {
      head: `${facility.label.toUpperCase()} OPENS`,
      story: `${team.name} opened the ${facility.label.toLowerCase()} this week — earned, as always, with an answer ` +
             `rather than a cheque.`,
    }
  }
  if (lastResult === 'W') {
    return {
      head: `${team.name.toUpperCase()} COME HOME WINNERS`,
      story: `A win in hand and a week to build on it. The room is open all week: film in the morning, ` +
             `position work after.`,
    }
  }
  if (lastResult === 'L') {
    return {
      head: 'BACK TO WORK',
      story: `Last Friday got away from them. The staff has the week to put it right, and the way to put it right ` +
             `is the same as always — win the room first.`,
    }
  }
  return {
    head: `CAMP OPENS AT ${team.name.toUpperCase()}`,
    story: `A new season, a full week to prepare, and everything still in front of them. ` +
           `${week === 1 ? 'Week one' : 'The next one'} is the only one that matters right now.`,
  }
}

// The short notes column: everything else that happened, one line each.
function briefs({ events, ratings }) {
  const out = []
  for (const e of events) {
    if (e.kind === 'level') out.push(`${e.position} ${e.name} — now level ${e.level}, ${e.statLabel} up.`)
    if (e.kind === 'film') out.push(`Film room: a session on ${LANE_WORD[e.lane] || 'content'}. Defense ${e.defense}.`)
    if (e.kind === 'facility') out.push(`${e.label} now open, level ${e.level}.`)
  }
  if (!out.length) out.push('No sessions logged yet this week. The room is open.')
  if (ratings) out.push(`Team card: throwing ${ratings.throwing}, hands ${ratings.hands}, speed ${ratings.speed}, ` +
                        `blocking ${ratings.blocking}, toughness ${ratings.toughness}, defense ${ratings.defense}.`)
  return out
}

// BE A HAWK (BK, 2026-09-27): one line from Leo's LOCKED coaching bank, matched to the week:
// after a win, working with others; after a loss, when things get hard; otherwise, showing up
// and using time well. Rotates by week. Words live in the manifest, verbatim.
function hawkLine(box, lastResult, week) {
  if (!box) return null
  const list = (lastResult === 'W' ? box.after_win : lastResult === 'L' ? box.after_loss : box.otherwise) || []
  return list.length ? list[Math.abs(week || 0) % list.length] : null
}

export default function Newspaper({ team, season, week, weekLabel, opponent, lastResult, events = [], ratings, hawkBox }) {
  const lead = leadStory({ events, team, lastResult, opponent, week })
  const hawk = hawkLine(hawkBox, lastResult, week)
  const notes = briefs({ events, ratings })
  const paper = `${team.name} ${PAPER_SUFFIX}`

  return (
    <section className="newsprint" aria-label="This week in the local paper">
      <div className="np-masthead">
        <span className="np-title">{paper}</span>
        <span className="np-dateline">Season {season} · {weekLabel} · Sports</span>
      </div>
      <h2 className="np-head">{lead.head}</h2>
      <p className="np-story">{lead.story}</p>
      <div className="np-cols">
        <ul className="np-briefs">
          {notes.map((n, i) => <li key={i}>{n}</li>)}
        </ul>
        {hawk && (
          <aside className="np-hawk" aria-label={hawkBox.title}>
            <span className="np-hawk-title">{hawkBox.title}</span>
            <span className="np-hawk-line">{hawk}</span>
          </aside>
        )}
        <div className="np-next">
          <span className="np-next-label">Up next</span>
          <b>{opponent}</b>
          <span className="np-next-note">Everything you win this week travels with you.</span>
        </div>
      </div>
    </section>
  )
}
