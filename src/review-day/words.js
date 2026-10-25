// REVIEW DAY — every word on screen, in one place (BK 2026-10-24 22:30 ruled the names and the shape;
// proof: _BRIEFCASE/josh-proof-2026-10-24-review-day-concept.pdf). A change here is a change BK sees first.
// Unit content (categories, clues, lists) comes from the desks' files, never from this file.
export const W = {
  title: 'REVIEW DAY',
  pickCourse: 'Pick a course.',
  pickUnits: 'Pick the units. Tap a unit to add it or take it out.',
  pickFormat: 'Pick a format.',
  board: 'THE BOARD',
  boardSub: 'Pick a category and a value. Every team answers.',
  top: 'TOP ANSWERS',
  topSub: 'Find every answer on the list. Three misses and the other team can steal.',
  teams: 'How many teams?',
  start: 'Start',
  resume: 'Pick up where you left off',
  needUnit: 'Pick at least one unit.',
  noUnits: 'No units are ready for this course yet.',
  menu: 'Menu',
  team: n => `Team ${n}`,
  newName: 'New name',
  // THE BOARD
  write: 'Write your answer.',
  show: 'Show the answer',
  alsoRight: 'Also right:',
  whoHad: 'Tap every team that had it.',
  back: 'Back to the board',
  cleared: 'Board cleared.',
  deal: 'Deal a new board',
  adapted: '(adapted)',
  // TOP ANSWERS
  atPlay: name => `${name}: you're up.`,
  miss: 'Miss',
  steal: 'Steal. The other team gets one try.',
  stealBy: name => `${name} steal.`,
  stealWon: name => `${name} stole it.`,
  stealLost: name => `${name} keep it.`,
  allFound: name => `Every answer found. ${name} take it.`,
  showRest: 'Show the rest',
  nextList: 'Next list',
  listsDone: 'That was the last list. Start again from the menu for a new order.',
  sample: 'SAMPLE',
}

// Team names: dealt at random at the front, re-rolled with "New name" (BK 2026-10-24 22:47: "yes to randomizer and list. it's perfect.").
// A fixed list, so nothing a student types ever appears or is kept.
export const TEAM_NAMES = [
  'The Squeaky Sneakers', 'The Half-Court Heroes', 'The Dodgeball Dynasty', 'The Free Throw Faithful', 'The Buzzer Beaters',
  'The Fast Break', 'The Rope Climbers', 'The Shuttle Run Survivors', 'The Mismatched Pinnies', 'The Lost Mouthguards',
  'The Extra Laps', 'The Water Break Legends', 'The Floor Burns', 'The Two-Minute Drill', 'The Fourth Quarter Comeback',
  'The Overtime Crew', 'The Jump Ball', 'The Rebounders', 'The Timeout Takers', 'The Practice Squad',
  'The Clipboard Coaches', 'The Sideline Scholars', 'The Varsity Brains', 'The Pep Rally', 'The Sweatband Society',
  'The Stretching Circle', 'The Kickball Captains', 'The Pickleball Pros', 'The Field Day Champs', 'The Parachute Day Crew',
]
