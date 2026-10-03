// ============================================================
// THE SPORT PICK — one league, one save code, one question pipeline, two sports.
//
// BK, 2026-10-03 01:14: volleyball is "a sport pick inside the Review Bowl, sharing its
// league, save code, question pipeline and Locker Room." Underneath, every stat keeps its
// football key (throwing, hands, speed, blocking, toughness, defense) so the save code, the
// ratings and Practice Week never fork. Only the WORDS a student reads change with the sport,
// and every one of those words lives in this file.
//
// FOOTBALL'S WORDS ARE NOT CHANGED HERE. Each football entry is the exact string the game
// already shipped; the screens read it from this table instead of from their own source.
//
// VOLLEYBALL'S WORDS: the how-to-play pop-up (BK 01:16 "Love it") and the coach cards and
// receive prompt (BK 2026-10-03 15:24 "yes") are approved. Everything else marked PROPOSED
// went to BK as one list for one yes; nothing ships until he says it.
// ============================================================

export const SPORTS = ['football', 'volleyball']
export const sportOf = career => (career && career.sport === 'volleyball' ? 'volleyball' : 'football')

// Volleyball stat names, by the football key they sit on. Lane → stat is the concept's
// mapping (BK played it 10/3): sources→Setting, context→Passing, vocab→Hitting,
// reading→Blocking, skills→Serving, defense (Practice Week)→Digging.
const VB_STAT = { throwing: 'Setting', hands: 'Passing', speed: 'Hitting', blocking: 'Blocking', toughness: 'Serving', defense: 'Digging' }
// The five starters, one per stat. PROPOSED.
export const VB_POSITION = { throwing: 'S', hands: 'L', speed: 'OH', blocking: 'MB', toughness: 'DS' }
export const VB_POSITION_NAME = { S: 'Setter', L: 'Libero', OH: 'Outside hitter', MB: 'Middle blocker', DS: 'Serving specialist' }

export function statLabel(sport, manifest, stat, laneOf) {
  if (sport === 'volleyball') return VB_STAT[stat] || stat
  if (stat === 'defense') return 'Defense'
  return manifest?.lanes?.[laneOf[stat]]?.stat_label || stat
}

// Volleyball's plain-English stat lines, from the same numbers court.js plays with.
export function explainVolley(stat, v) {
  switch (stat) {
    case 'throwing': return `Sets land within about ${((10 - v) * 0.05 * 3.28).toFixed(1)} feet of your hitter.`
    case 'hands': return `Better passing opens more hitters for your setter.`
    case 'speed': return `A good swing has a window of about ${((0.14 + v * 0.012) * 2).toFixed(2)} seconds.`
    case 'blocking': return `You see their set coming about ${(0.15 + v * 0.06).toFixed(2)} seconds early.`
    case 'toughness': return `The serve meter's sweet spot is ${Math.round((0.05 + v * 0.012) * 200)}% of the bar.`
    case 'defense': return `Your dig window is about ${(0.09 + v * 0.013).toFixed(2)} seconds.`
    default: return ''
  }
}

// ── the words, per sport ─────────────────────────────────────────────────────
export const TERMS = {
  football: {
    name: 'Football',
    pronoun: { his: 'his', him: 'him', he: 'he' },
    field: 'field',
    gameNight: 'Friday',
    defenseUnit: 'defense',
    gameWord: 'game',
    takeTheField: 'Take the field',
    skipTakeField: 'Skip for now — take the field',
    practiceIntro: 'Bumps and bruises heal, the film goes on, and somebody gets better. None of this is required — you can walk out to the field right now and nothing you already have is lost.',
    filmHead: 'Defensive film study',
    filmBody: want => `Your defense is the one unit that doesn't get better on Friday — it gets better this week. ${want} questions, and what you get right is what the defense is worth in the next game. It matters most the closer the other team gets to your goal line.`,
    rosterBody: 'Every player has a level, and his level is what he is worth to the stat he plays for.',
    rosterPrice: ' A right answer from his lane is the whole price.',
    trainedNote: (name, lvl, label) => `${name} put in the work — level ${lvl}. ${label} goes up with him.`,
    campBuilds: 'Toughness',
  },
  volleyball: {
    name: 'Volleyball',
    pronoun: { his: 'her', him: 'her', he: 'she' },
    field: 'court',
    gameNight: 'game night',
    defenseUnit: 'back row',
    gameWord: 'match',
    // PROPOSED, every line below.
    takeTheField: 'Take the court',
    skipTakeField: 'Skip for now — take the court',
    practiceIntro: 'Bumps and bruises heal, the film goes on, and somebody gets better. None of this is required — you can walk out to the court right now and nothing you already have is lost.',
    filmHead: 'Back-row film study',
    filmBody: want => `Your back row is the one unit that doesn't get better on game night — it gets better this week. ${want} questions, and what you get right is what your Digging is worth in the next match. It matters most on their hardest swings.`,
    rosterBody: 'Every player has a level, and her level is what she is worth to the stat she plays for.',
    rosterPrice: ' A right answer from her lane is the whole price.',
    trainedNote: (name, lvl, label) => `${name} put in the work — level ${lvl}. ${label} goes up with her.`,
    campBuilds: 'Serving',
  },
}
export const terms = sport => TERMS[sport] || TERMS.football

// ── volleyball game day: every line a student reads on the court ─────────────
// APPROVED: HOWTO (BK 01:16), COACH and the receive prompt (BK 15:24). The rest: PROPOSED.
export const VB = {
  // How to play, approved 01:16 ("Love it"), word for word from the concept.
  howtoTitle: 'How to play',
  howto: [
    ['Serve:', 'Tap their side to aim. Tap again when the marker hits the middle.'],
    ['Set:', 'Pick your hitter. A better pass gives you more choices.'],
    ['Swing:', 'Tap where you want the ball to land, right as the ring closes.'],
    ['Block:', "Watch their setter and guess who's hitting."],
    ['Dig:', "Tap as the ring closes. If the ball's going out, let it go."],
  ],
  howtoNote: 'Questions at timeouts and set breaks make your team better.',
  howtoTurn: 'Turn your phone sideways for a bigger court.',
  howtoGo: "Let's play",

  // The guided first rally, approved 15:24 ("yes"), word for word.
  coach: {
    serve: ['Serve', 'Every point starts with a serve. Aim at their side, then time the bar.'],
    pass: ['Pass', 'This is the pass, the first touch. Your passer does it for you. A better pass gives you more hitters.'],
    set: ['Set', 'This is the set, the second touch. Your setter puts the ball up. You pick who hits.'],
    attack: ['Attack', 'This is the attack, the third touch. Tap where you want it as the ring closes.'],
    block: ['Block', 'Their setter is about to set. Guess the hitter to put up a block.'],
    dig: ['Dig', 'A dig keeps the ball alive. Tap as the ring closes.'],
    wrap: ['Wrap-up', "Three touches per side: pass, set, attack. That's volleyball."],
  },
  coachGo: 'Got it',
  coachSkip: 'Skip',

  // The call bar, rally by rally. Concept wording, PROPOSED (the receive line is approved).
  yourServe: 'Your serve. Tap a spot on their side to aim.',
  meter: 'Tap when the marker hits the middle.',
  theirServe: 'Their serve. Your passer has it.',             // APPROVED 15:24
  serveAway: 'Serve is away.',
  hereItComes: 'Here it comes.',
  callSet: 'Call the set.',
  callSetMid: 'Call the set. The middle needs a better pass.',
  shanked: 'Shanked pass: outside only.',
  setTo: where => `Set to the ${where}.`,
  blockCall: 'Block: who gets their set? Watch the setter.',
  blocking: where => `Blocking their ${where}.`,
  swingCall: 'Tap their court to swing as the ring closes. Near the net = tip.',
  theirAttack: 'Their attack is coming.',
  swing: 'Swing!',
  theySwing: 'They swing.',
  dig: 'Dig! Tap as the ring closes.',
  digOrLeave: 'Dig! Tap as the ring closes, or let it go.',
  point: (abbr, a, b) => `Point ${abbr}. ${a}-${b}`,
  setLabels: { OH: 'Outside', MB: 'Middle', RS: 'Right side' },
  blockLabels: { OH: 'Outside (near)', MB: 'Middle', RS: 'Right side (far)' },
  needsPass: 'Needs a better pass',
  timeout: n => `Timeout (${n})`,
  noTimeouts: 'No timeouts left this set',
  steady: 'Steady timing',
  steadyOn: 'Steady timing: on',

  // The stoppages: what each question is for. PROPOSED.
  coin: 'Coin toss. Get it right and you win the toss and serve first. Miss it and they serve first.',
  coinYou: 'You won the toss. Your serve.',
  coinThem: name => `${name} won the toss and will serve.`,
  timeoutStake: 'Timeout. Get it right and your coaches spot something: you see their next set sooner, and your dig window is wider for one rally.',
  timeoutRight: 'Adjustment made — watch for their setter.',
  timeoutWrong: 'Play stopped. No adjustment this time.',
  setBreakStake: (i, n) => `Set break — question ${i} of ${n}. A right answer gives that stat +1 for the next set.`,
  locker: 'Locker room. One question about how this team carries itself. Get it right and the whole team comes out with +1 Serving.',
  bigMomentStake: 'Big moment. Read this right and you see their next set sooner. Miss it and you just play the rally.',
  bigMomentHead: 'Big moment',
  bigMomentBody: who => `${who === 'you' ? 'Set point for you.' : 'Set point for them.'} Answer one question for a better read on this rally — or just play it.`,
  bigMomentTake: 'Take the question',
  bigMomentSkip: 'Just play it',
  readYes: 'You read it. Go.',
  readNo: 'Play the rally.',
  setOver: (n, abbrA, a, abbrB, b) => `Set ${n} · ${abbrA} ${a} – ${b} ${abbrB}`,
  setBreakHead: (you, a, b, them) => `Set break · ${you} ${a} – ${b} ${them}`,
  setBreakPlus: label => `${label}: +1 for the next set`,
  setBreakNone: label => `${label}: no adjustment`,
  noAdjust: 'No adjustments.',
  nextSet: n => `Set ${n}`,
  firstTo: 'Best of 3 sets, to 15. Win by 2.',
  matchIntroHints: 'Two hints are available on every question this regular season.',
  matchIntroCold: 'Playoffs run cold: no hints on any question today.',
}

// ── the shared screens, volleyball words. PROPOSED. ──────────────────────────
export const SHARED_VB = {
  sportHead: 'Which sport?',
  sportSub: 'Same league, same questions, same save code. Your career stays with the sport you pick.',
  sportBlurb: { football: 'Eight-week season. Throw, run, and win the content.', volleyball: "Girls' season. Best of 3 sets, to 15." },
  tagline: "You won't win the game unless you win the content.",
  continueLabel: (team, sport, season) => `Continue · ${team} ${sport.toLowerCase()}, season ${season}`,
  aboutPlaying: [
    ['Serve:', 'Tap their side to aim. Tap again when the marker hits the middle.'],
    ['Set:', 'Pick your hitter. A better pass gives you more choices.'],
    ['Swing:', 'Tap where you want the ball to land, right as the ring closes.'],
    ['Block:', "Watch their setter and guess who's hitting."],
    ['Dig:', "Tap as the ring closes. If the ball's going out, let it go."],
    ['Keyboard:', 'Arrow keys aim. Space or Enter taps. 1, 2 and 3 make the calls. T calls a timeout.'],
  ],
  aboutQuestions: "During matches, the questions are quick: a term, a skill, a principle or an issue. They come when the volleyball stops: the coin toss, a timeout, the break between sets and the press conference. At set point, one is offered too, and that one is optional. Between matches and in the off-season, the questions get bigger: a document to read, and a bigger payoff, like a player's level, a new facility, or a free agent's signature. A rally never stops for a question.",
  // The newspaper (Practice Week).
  paper: {
    promotions: names => `${names} both earned promotions on the practice court, and the coaching staff credits the work in the room — every session was won on a question first.`,
    promotion: (name, lvl, lane, team, label) => `${name} is a level ${lvl} player this morning after answering a ${lane} question to close out the session. ${team}'s ${label.toLowerCase()} goes up with her.`,
    sweep: (r, of, d) => `A clean ${r}-for-${of} in the film room. The back row goes into game night with Digging at ${d} — and it counts for most on their hardest swings.`,
    workHead: 'THE BACK ROW PUTS IN THE WORK',
    work: d => `A session in the film room. Digging is ${d} going into game night; another session next week moves it again.`,
    loss: 'The last match got away from them. The staff has the week to put it right, and the way to put it right is the same as always — win the room first.',
    filmBrief: (lane, d) => `Film room: a session on ${lane}. Digging ${d}.`,
    card: r => `Team card: setting ${r.throwing}, passing ${r.hands}, hitting ${r.speed}, blocking ${r.blocking}, serving ${r.toughness}, digging ${r.defense}.`,
  },
  campLine: 'Camp rep done: Serving form +2.',
}
