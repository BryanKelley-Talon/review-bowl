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
  threadsTitle: 'The Threads', // the Arena's own label for the list (thearena src/refcards.jsx REF_WORDS)
  listTag: (unit, n) => `${unit} · List ${n}`,

  // BK 2026-10-24 22:52, "yes to all": undo, timer, new class, both TOP ANSWERS modes (A default), the How to play cards.
  // Settings on the front
  runLabel: 'Run length:',
  run40: '40 minutes',
  run20: '20 minutes',
  timerLabel: 'Timer:',
  timerOff: 'Off',
  secs: s => `${s}`,
  chimeLabel: 'Chime at zero:',
  on: 'On',
  off: 'Off',
  topModeLabel: 'TOP ANSWERS:',
  modeWrite: 'Everyone writes',
  modeTurns: 'Turns and steals',
  // Timer
  startTimer: 'Start timer',
  plus10: '+10',
  pause: 'Pause',
  boardsUp: 'Boards up.',
  // TOP ANSWERS, everyone writes
  writeMany: 'Write your answers.',
  flipNext: 'Flip the next answer',
  // Undo
  undo: 'Undo',
  undoTitle: 'Select the move you want to undo.',
  undoNote: 'Undoing a move also undoes every move after it.',
  undoNone: 'Nothing to undo yet.',
  cancel: 'Cancel',
  mvSquare: (value, teams, cat) => teams.length ? `${value} to ${teams.join(', ')} · ${cat}` : `${cat} ${value} · no team`,
  mvDeal: 'New board dealt',
  mvFlip: (rank, tag) => `#${rank} flipped · ${tag}`,
  mvAward: (rank, pts, teams, tag) => `#${rank}: ${pts} to ${teams.join(', ')} · ${tag}`,
  mvMiss: tag => `Miss · ${tag}`,
  mvRest: tag => `The rest shown · ${tag}`,
  mvSteal: (name, pts, tag) => `Steal: ${pts} to ${name} · ${tag}`,
  mvKeep: (name, pts, tag) => `${pts} to ${name} · ${tag}`,
  mvNext: tag => `Next list · after ${tag}`,
  // New class
  newClass: 'New class',
  newClassTitle: 'Start over for a new class?',
  newClassNote: 'This clears the scores and the board.',
  startOver: 'Start over',
  keepPlaying: 'Keep playing',
  // How to play
  howTo: 'How to play',
  letsGo: "Let's go",
  setUp: 'Set up.',
  everyClue: 'Every clue.',
  everyList: 'Every list.',
  youHave: s => (s ? ` You have ${s} seconds.` : ''),
  howBoard: s => ({
    title: 'HOW TO PLAY · THE BOARD',
    setup: 'Sit with your team, facing the screen. One board and one marker per team. Pick a writer.',
    steps: [
      'A team picks a category and a value. Teams take turns.',
      'Read the clue. Talk it over with your team, quietly.',
      `Your writer writes one answer.${W.youHave(s)}`,
      'Boards up when your teacher says. Every team that has it scores.',
    ],
    rule: "Keep your answer hidden until boards up. Spelling doesn't count. The idea does.",
  }),
  howTopWrite: s => ({
    title: 'HOW TO PLAY · TOP ANSWERS',
    setup: 'Same teams, same boards.',
    steps: [
      'Read the prompt. It has 4 to 6 answers. #1 is the strongest.',
      `Your team writes as many answers as you can.${W.youHave(s)}`,
      'Boards up. The answers flip from the bottom to the top.',
      'Every team that had an answer scores its points.',
    ],
  }),
  howTopTurns: () => ({
    title: 'HOW TO PLAY · TOP ANSWERS',
    setup: 'Same teams, same boards.',
    steps: [
      'Read the prompt. It has 4 to 6 answers. #1 is the strongest.',
      "The team that's up gives answers out loud, one at a time.",
      'Three misses and the next team gets one steal.',
      'A hit takes all the points.',
    ],
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAFT WORDS — the overnight build of 2026-10-24 (BK 23:15: "Let's proceed on an overnight build of these games").
// None of these is approved yet. They go to BK as one list in the morning proof; nothing here ships until he says yes.
// The ship gate fails while public/review-day/manifest.json has "lab": true.
// ─────────────────────────────────────────────────────────────────────────────
export const D = {
  purposeLabel: 'What is this for?',
  purposes: { opener: 'Opener', closer: 'Closer', test: 'Test Review', regents: 'Regents Review' },
  timeLabel: 'How much time?',
  minutes: m => `${m} min`,
  modeLabel: 'Pick a mode.',
  noModes: 'Nothing fits that yet. Try another time.',
  notReady: 'Not ready for these units yet.',
  needContent: "These units don't have this mode's content yet.",
  modes: 'Modes',
  modesTitle: 'Switch modes. Teams and scores stay.',
  draft: 'DRAFT',

  // FINAL ANSWER
  final: 'FINAL ANSWER',
  finalSub: 'One last clue. Every team wagers, then answers.',
  wager: 'Write your wager.',
  wagerRule: 'Wager up to your score, or up to 500 if you have less.',
  setWagers: 'Enter each team\'s wager.',
  allIn: 'All in',
  showClue: 'Show the clue',
  settle: 'Settle the wagers',
  finalScores: 'Final scores.',
  // LIGHTNING ROUND
  lightning: 'LIGHTNING ROUND',
  lightningSub: 'Ten quick clues in sixty seconds. Write as many as you can.',
  getReady: 'Number your paper 1 to 10.',
  go: 'Go',
  clueOf: (i, n) => `Clue ${i} of ${n}`,
  pencils: 'Pencils down.',
  showAnswers: 'Show the answers',
  howMany: 'How many did each team get?',
  addPoints: 'Add the points',
  // shared round words
  nextRound: 'Next round',
  roundsDone: 'That was the last round.',
  writeGuess: 'Write your guess.',
  nextClue: 'Next clue',
  // DOCUMENT DETECTIVE
  detective: 'DOCUMENT DETECTIVE',
  detectiveSub: 'Four questions about one document. Send a runner to tap in your answers.',
  // IN ORDER
  order: 'IN ORDER',
  orderSub: 'Put the events in order. Send a runner to tap them in.',
  orderTap: 'Tap the events from earliest to latest.',
  // lanes
  lockIn: 'Lock in',
  clear: 'Clear',
  locked: n => `Locked in ${n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : n + 'th'}`,
  showOrder: 'Show the order',
  showResults: 'Show the answers',
  firstRight: name => `${name} locked in first with it all right.`,
  laneRight: 'All right',
  laneMissed: n => `${n} right`,
  laneNot: 'Not this time.',
  // WHO AM I?
  who: 'WHO AM I?',
  whoSub: 'Clues come one at a time, hardest first. Name them early for more points.',
  worth: v => `Worth ${v} now`,
  // ODD ONE OUT
  odd: 'ODD ONE OUT',
  oddSub: "Four terms. One doesn't belong. Say which, and why.",
  oddWrite: "Write which one doesn't belong, and why.",
  oddWho: 'Tap every team that picked it.',
  oddWhy: 'Tap every team whose why matched.',
  // NAME THE PRINCIPLE / NAME THE ISSUE
  principle: 'NAME THE PRINCIPLE',
  principleSub: 'Name the Civic Principle, in the card\'s words.',
  issue: 'NAME THE ISSUE',
  issueSub: 'Name the enduring issue, the exact issue, not the umbrella.',
  writeIt: 'Write your answer, in the card\'s words.',
  // THREAD RUN
  threads: 'THREAD RUN',
  threadsSub: 'Which Thread does this event belong to? Say why.',
  threadWrite: 'Write the Thread, and why.',
  // MAP DROP
  map: 'MAP DROP',
  mapSub: 'A map, a question. Every team writes.',
  nextMap: 'Next map',
  mapZoomIn: 'Tap the map to zoom in.',
  mapZoomOut: 'Tap again for the whole map.',
  // How to play, the new modes
  how: {
    final: { title: 'HOW TO PLAY · FINAL ANSWER', setup: 'Same teams, same boards.', steps: ['Look at the category and your score.', 'Write your wager. Wager up to your score, or up to 500 if you have less.', 'Read the clue. Write your answer.', 'Right adds your wager. Wrong takes it away.'] },
    lightning: { title: 'HOW TO PLAY · LIGHTNING ROUND', setup: 'One sheet per team. Number it 1 to 10.', steps: ['Ten clues flash by, about six seconds each.', 'Write as many answers as you can. Skip what you don\'t know.', 'When it stops, the answers show.', 'Every right answer is worth 10.'] },
    detective: { title: 'HOW TO PLAY · DOCUMENT DETECTIVE', setup: 'Each team picks one runner. Walk, don\'t run.', steps: ['Read the document with your team.', 'Decide your four answers at your seats.', 'Your runner taps them in your team\'s lane, then taps Lock in.', 'Every right answer scores. First team locked in with all four right gets a bonus.'] },
    order: { title: 'HOW TO PLAY · IN ORDER', setup: 'Each team picks one runner. Walk, don\'t run.', steps: ['Read the events with your team.', 'Decide the order at your seats, earliest first.', 'Your runner taps the events in order in your lane, then taps Lock in.', 'The right order scores. First team locked in right gets a bonus.'] },
    who: { title: 'HOW TO PLAY · WHO AM I?', setup: 'Same teams, same boards.', steps: ['A clue appears. Write your guess.', 'Right now? You score what it\'s worth.', 'Not yet? Another clue comes, worth less.', 'Four clues, then the answer.'] },
    odd: { title: 'HOW TO PLAY · ODD ONE OUT', setup: 'Same teams, same boards.', steps: ['Four terms appear.', 'Write the one that doesn\'t belong, and why.', 'The right pick scores.', 'A why that matches scores again.'] },
    principle: { title: 'HOW TO PLAY · NAME THE PRINCIPLE', setup: 'Same teams, same boards.', steps: ['Read the event.', 'Write the Civic Principle it shows, in the card\'s words.', 'The card is on the screen. Use it.', 'Every team that has it scores.'] },
    issue: { title: 'HOW TO PLAY · NAME THE ISSUE', setup: 'Same teams, same boards.', steps: ['Read the event.', 'Write the enduring issue it shows: the exact issue, not the umbrella.', 'The umbrellas are on the screen. Use them.', 'Every team that has it scores.'] },
    threads: { title: 'HOW TO PLAY · THREAD RUN', setup: 'Same teams, same boards.', steps: ['Read the event.', 'Write the Thread it belongs to, and one reason why.', 'The Threads are on the screen.', 'Every team that has it scores.'] },
    map: { title: 'HOW TO PLAY · MAP DROP', setup: 'Same teams, same boards.', steps: ['Look at the map and the question.', 'Write your answer.', 'Boards up when your teacher says.', 'Every team that has it scores.'] },
  },
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

// ─────────────────────────────────────────────────────────────────────────────
// SMALL GROUP (BK 2026-10-25 10:10: "all of these games could be played within small groups too...group of 4, each
// person is their own team"; 10:12 "yes to both": the where choice, The Board's small-group card, and "player").
// applyWhere() swaps these into W and D while a small-group game runs, and puts the whole-class words back after.
// The small-group cards for the other modes follow The Board's pattern and are DRAFTS (BK: same pattern), listed for his yes.
// ─────────────────────────────────────────────────────────────────────────────
export const WHERE = {
  label: 'Where are you playing?',
  room: 'Whole class on the board',
  group: 'Small group at a laptop',
}
const GROUP_SETUP = 'Four players around one laptop. Everyone has scrap paper. Pick a reader.'
const GROUP_W = {
  teams: 'How many players?',
  whoHad: 'Tap every player who had it.',
  team: n => `Player ${n}`,
  howBoard: () => ({
    title: 'HOW TO PLAY · THE BOARD · SMALL GROUP',
    setup: GROUP_SETUP,
    steps: [
      'Take turns picking a category and a value.',
      'The reader reads the clue out loud.',
      'Everyone writes an answer.',
      'The reader taps Show the answer. Everyone who had it scores.',
    ],
    rule: 'Keep your answer covered until the reader shows it.',
  }),
  // drafts below this line (BK: "same pattern")
  howTopWrite: () => ({
    title: 'HOW TO PLAY · TOP ANSWERS · SMALL GROUP',
    setup: GROUP_SETUP,
    steps: ['The reader reads the prompt out loud. It has 4 to 6 answers.', 'Everyone writes as many answers as they can.', 'The reader flips the answers, from the bottom to the top.', 'Every player who had an answer scores its points.'],
    rule: 'Keep your answers covered until they flip.',
  }),
  howTopTurns: () => ({
    title: 'HOW TO PLAY · TOP ANSWERS · SMALL GROUP',
    setup: GROUP_SETUP,
    steps: ['The reader reads the prompt out loud. It has 4 to 6 answers.', 'The player who\'s up says answers out loud, one at a time.', 'Three misses and the next player gets one steal.', 'A hit takes all the points.'],
  }),
}
const GROUP_D = {
  modesTitle: 'Switch modes. Players and scores stay.',
  oddWho: 'Tap every player who picked it.',
  oddWhy: 'Tap every player whose why matched.',
  detectiveSub: 'Four questions about one document. Take turns tapping in your answers.',
  orderSub: 'Put the events in order. Take turns tapping them in.',
  firstRight: name => `${name} locked in first with it all right.`,
  how: {
    final: { title: 'HOW TO PLAY · FINAL ANSWER · SMALL GROUP', setup: GROUP_SETUP, steps: ['Look at the category and your score.', 'Write your wager. Wager up to your score, or up to 500 if you have less.', 'The reader reads the clue. Write your answer.', 'Right adds your wager. Wrong takes it away.'] },
    lightning: { title: 'HOW TO PLAY · LIGHTNING ROUND · SMALL GROUP', setup: 'Four players around one laptop. Everyone numbers a paper 1 to 10.', steps: ['Ten clues flash by, about six seconds each.', 'Write as many answers as you can. Skip what you don\'t know.', 'When it stops, the answers show.', 'Every right answer is worth 10.'] },
    detective: { title: 'HOW TO PLAY · DOCUMENT DETECTIVE · SMALL GROUP', setup: GROUP_SETUP, steps: ['The reader reads the document and the four questions out loud.', 'Everyone writes their four answers.', 'Take turns at the laptop: tap your letters in your lane, then Lock in.', 'Every right answer scores. First player locked in with all four right gets a bonus.'] },
    order: { title: 'HOW TO PLAY · IN ORDER · SMALL GROUP', setup: GROUP_SETUP, steps: ['The reader reads the events out loud.', 'Everyone writes the order, earliest first.', 'Take turns at the laptop: tap the events in your lane, then Lock in.', 'The right order scores. First player locked in right gets a bonus.'] },
    who: { title: 'HOW TO PLAY · WHO AM I? · SMALL GROUP', setup: GROUP_SETUP, steps: ['The reader reads a clue. Write your guess.', 'Right now? You score what it\'s worth.', 'Not yet? Another clue comes, worth less.', 'Four clues, then the answer.'] },
    odd: { title: 'HOW TO PLAY · ODD ONE OUT · SMALL GROUP', setup: GROUP_SETUP, steps: ['The reader reads the four terms.', 'Write the one that doesn\'t belong, and why.', 'The right pick scores.', 'A why that matches scores again.'] },
    principle: { title: 'HOW TO PLAY · NAME THE PRINCIPLE · SMALL GROUP', setup: GROUP_SETUP, steps: ['The reader reads the event.', 'Write the Civic Principle it shows, in the card\'s words.', 'The card is on the screen. Use it.', 'Every player who has it scores.'] },
    issue: { title: 'HOW TO PLAY · NAME THE ISSUE · SMALL GROUP', setup: GROUP_SETUP, steps: ['The reader reads the event.', 'Write the enduring issue it shows: the exact issue, not the umbrella.', 'The umbrellas are on the screen. Use them.', 'Every player who has it scores.'] },
    threads: { title: 'HOW TO PLAY · THREAD RUN · SMALL GROUP', setup: GROUP_SETUP, steps: ['The reader reads the event.', 'Write the Thread it belongs to, and one reason why.', 'The Threads are on the screen.', 'Every player who has it scores.'] },
    map: { title: 'HOW TO PLAY · MAP DROP · SMALL GROUP', setup: GROUP_SETUP, steps: ['The reader reads the question. Look closely at the map.', 'Write your answer.', 'The reader taps Show the answer.', 'Every player who has it scores.'] },
  },
}
const SAVED_W = Object.fromEntries(Object.keys(GROUP_W).map(k => [k, W[k]]))
const SAVED_D = Object.fromEntries(Object.keys(GROUP_D).map(k => [k, D[k]]))
let currentWhere = 'room'
export function applyWhere(where) {
  if (where === currentWhere) return
  currentWhere = where
  Object.assign(W, where === 'group' ? GROUP_W : SAVED_W)
  Object.assign(D, where === 'group' ? GROUP_D : SAVED_D)
}

// Full screen (proposed 10/25 for BK's yes; button in the top bar and on the front, F key too).
export const FS = { enter: 'Full screen', exit: 'Exit full screen' }
