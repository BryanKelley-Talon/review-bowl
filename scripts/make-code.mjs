// ============================================================
// TEST CODES — `npm run code` (all presets) or `npm run code -- offseason`
//
// Builds a real career with the real modules and prints its save code, so a screen
// deep in a season can be reached without playing eight games to get there. These are
// ordinary codes: type one into "Enter a save code" on the title screen.
//
// Nothing here is a cheat for students — a code only ever carries a team's state, and
// any of these could have been reached by playing. It exists so BK and this desk can
// test the off-season, the playoffs and the firing screens on demand.
// ============================================================
import { encodeSaveCode } from '../src/save/saveCode.js'
import { newCareer, RESULT } from '../src/game/season.js'

// A season already played: a team that went 5–3, developed most of the way, and has
// money in the bank because the weekly loop no longer spends it.
const played = (course, team, seed) => ({
  ...newCareer(course, team, seed),
  results: [RESULT.W, RESULT.L, RESULT.W, RESULT.W, RESULT.L, RESULT.W, RESULT.W, RESULT.L],
  week: 8,
  cash: 12,                                                     // $120k — enough for free agency AND a tier-2 facility
  security: 21,
  form: { sources: 12, context: 9, vocab: 10, reading: 8, skills: 9, defense: 11 },
  facilities: { throwing: 1, hands: 1, speed: 0, blocking: 1, toughness: 0, defense: 1 },
  levels: { throwing: 3, hands: 2, speed: 3, blocking: 2, toughness: 3 },
})

const PRESETS = {
  offseason: {
    what: 'The off-season: training camp, free agency, facility tier 2, then "Start season 2".',
    career: c => ({ ...c, phase: 'offseason', playoffRound: 2, champ: false }),
  },
  seasonend: {
    what: 'The season-review screen (made the playoffs, lost the final) → Continue → off-season.',
    career: c => ({ ...c, phase: 'seasonEnd', playoffRound: 2, champ: false }),
  },
  champion: {
    what: 'Season review after winning the championship.',
    career: c => ({ ...c, phase: 'seasonEnd', playoffRound: 2, champ: true, titles: 1 }),
  },
  fired: {
    what: 'A bad season: review → fired → pick from three job offers.',
    career: c => ({ ...c, phase: 'seasonEnd', playoffRound: 0, security: 6,
                    results: [2, 2, 2, 1, 2, 2, 2, 2] }),
  },
  playoffs: {
    what: 'A playoff semifinal, next game up. Playoffs run cold — no hints.',
    career: c => ({ ...c, phase: 'playoffs', playoffRound: 1 }),
  },
  practice: {
    what: 'Practice Week before week 6, mid-season, with a developed squad.',
    career: c => ({ ...c, phase: 'practice', week: 5, practiceDone: false }),
  },
}

const want = process.argv[2]
const names = want ? [want] : Object.keys(PRESETS)
if (want && !PRESETS[want]) {
  console.log(`\nNo preset called "${want}". Try: ${Object.keys(PRESETS).join(', ')}\n`)
  process.exit(1)
}

console.log('\nTEST CODES — type one into "Enter a save code" on the title screen\n')
for (const name of names) {
  const preset = PRESETS[name]
  console.log(`  ${name.toUpperCase()} — ${preset.what}`)
  for (const [course, label, team, seed] of [['us11r', 'US 11R  · Corning', 0, 21], ['global10r', 'Global 10R · Elmira', 1, 34]]) {
    console.log(`    ${label.padEnd(20)} ${encodeSaveCode(preset.career(played(course, team, seed)))}`)
  }
  console.log()
}
