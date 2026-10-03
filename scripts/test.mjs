// Skills Review Bowl — rule and pipeline checks.  `npm test`
// No test framework: plain Node, no new dependency. Reads the REAL staged content.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildCulture, buildPool } from '../src/content/pool.js'
import { makeDealer } from '../src/content/dealer.js'
import { DEFENSE, applyAnswer, applyAnswerAll, physics, ratings, values } from '../src/game/ratings.js'
import { applyPenalty, applyPlay, callTimeout, extraPoint, isPenaltySpot, newGame, twoPoint } from '../src/game/matchRules.js'
import {
  afterGame, applySeasonReview, bracket, finishPractice, MAX_LEVEL, newCareer, opponentStrength,
  PLAYOFF_BITE, PRACTICE_FACILITY_MAX, RESULT, schedule, standings, startNextSeason, trainPlayer, upgradeFacility,
  WEEK_RAMP,
} from '../src/game/season.js'
import { simDrive } from '../src/game/drive.js'
import { isBigMoment, threatOf } from '../src/game/threat.js'
import { CLASH, CVD_CLASH, GRASS_MIN, colorDistance, cvdDistance, kits, player, roster, TEAMS } from '../src/game/teams.js'
import { SHARED_VB, VB, explainVolley, sportOf } from '../src/game/sport.js'
import { PLAYS, PLAY_WORDS, ROUTES_OF, guessChance, readChance } from '../src/game/plays.js'
import { decodeSaveCode, encodeSaveCode } from '../src/save/saveCode.js'
const N_TEAMS = TEAMS.length

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pub = p => JSON.parse(fs.readFileSync(path.join(ROOT, 'public', p), 'utf8'))

let failed = 0, passed = 0
function ok(cond, msg) { if (cond) passed++; else { failed++; console.log(`FAIL  ${msg}`) } }
const canon = v => JSON.stringify(v, (k, x) => x && typeof x === 'object' && !Array.isArray(x)
  ? Object.fromEntries(Object.keys(x).sort().map(key => [key, x[key]])) : x)
function eq(a, b, msg) { ok(canon(a) === canon(b), `${msg}\n      got ${canon(a)}\n     want ${canon(b)}`) }

// ── content pipeline, on the real files ──────────────────────────────────────
const manifest = pub('bowl.manifest.json')
const crops = pub('content/_crops.json').crops
// The pipeline tests read every item the desks sent, so they build with the hold-back rule off.
// What the rule itself holds back is tested on its own, further down.
const everything = { ...manifest, rules: { ...manifest.rules, require_hints_and_reason: false } }
const packsOf = course => Object.fromEntries(manifest.courses[course].packs.map(p => [p.file, pub(p.file)]))
const pools = {}
for (const course of Object.keys(manifest.courses)) {
  const packs = packsOf(course)
  const pool = buildPool(everything, course, packs, crops)
  pools[course] = pool
  const counts = Object.fromEntries(Object.entries(pool.lanes).map(([k, v]) => [k, v.length]))
  console.log(`pool  ${course}  ${JSON.stringify(counts)}  held ${pool.held.length}`)
  for (const lane of Object.values(pool.lanes)) for (const q of lane) {
    ok(q.options.filter(o => o.key === q.correct).length === 1, `${q.id}: exactly one correct key`)
    ok(new Set(q.options.map(o => o.text)).size === q.options.length, `${q.id}: no duplicate options`)
    ok(q.hints.length <= 2, `${q.id}: at most two hints`)
  }
}
const us = pools.us11r, gl = pools.global10r
eq(gl.lanes.sources.length, 25, 'Global: all 25 of Will\'s Part I items are in the pool')
eq(us.lanes.sources.length, 21, 'US: all 21 Part I items — the Lancaster pair is in on BK\'s override')
eq(us.held.length, 0, 'US: nothing held back any more')
eq(us.lanes.context.length, 3, 'US: 3 context statements')
eq(us.lanes.vocab.length, 8, 'US: 8 content vocab')
eq(us.lanes.reading.length, 9, 'US: 9 task words')
eq(us.lanes.skills.length, 50, 'US: 6 skill lines + 4 principles + 19 foundation pairs + 21 short CLE and civic items (Sam, 09-27)')
// v3 §6: Global had no vocabulary or skills content of its own until Will's scenario set was wired.
eq(gl.lanes.vocab.length, 15, 'Global: 8 region pairs + 7 Enlightenment terms')
eq(gl.lanes.skills.length, 25, 'Global: 5 skill moves + 20 short Enduring Issue items (Will, 09-27)')
ok(gl.lanes.vocab.filter(q => q.id.startsWith('sq-')).every(q => q.hints.length === 2), 'Global: the scenario terms carry their hints')
ok(gl.lanes.skills.every(q => q.options.length === 4), 'Global: skill moves render as four-option questions')
eq(us.lanes.sources.filter(q => q.answerVerified === false).map(q => q.id).sort(),
   ['cppu1-mc08', 'cppu1-mc09', 'cppu1-mc14', 'cppu1-mc15', 'cppu1-mc16', 'cppu1-mc17'], 'US: answer_verified:false carried on exactly the six')
eq(gl.lanes.sources.filter(q => q.licence === 'teach-only').length, 11, 'Global: licence carried (11 teach-only)')
ok(gl.lanes.sources.every(q => q.hints.length === 2), 'Global: every Part I item has its two hints')
ok(us.lanes.sources.every(q => q.stimulus.images.length > 0), 'US: every Part I item shows its source crop')

// ── the dealer ───────────────────────────────────────────────────────────────
// ── BK's 10:13 launch: everything short of the rule is filled (Sam and Will, 09-27) ──
for (const course of Object.keys(manifest.courses)) {
  const on = buildPool(manifest, course, packsOf(course), crops)
  eq(on.held.length, 0, `${course}: with the rule on, nothing is held back`)
  ok(on.lanes.sources.every(q => q.size === 'long'), `${course}: every Part I document question is still long`)
}
ok(buildPool(manifest, 'us11r', packsOf('us11r'), crops).lanes.skills.some(q => q.id === 'cp-07' && q.size === 'short' && q.stimulus?.citation), 'cp-07: a one-line quote keeps its source line and stays short')

// ── the hold-back rule (BK, 2026-09-27, "A") ──────────────────────────────────
for (const course of Object.keys(manifest.courses)) {
  const held = buildPool({ ...manifest, rules: { ...manifest.rules, require_hints_and_reason: true } }, course, packsOf(course), crops)
  for (const q of Object.values(held.lanes).flat()) ok(q.hints.length === 2 && !!q.rationale, `${q.id}: with the rule on, every question that plays has two hints and a reason`)
  ok(held.held.filter(h => /needs/.test(h.reason)).length > 0 || Object.values(pools[course].lanes).flat().every(q => q.hints.length === 2 && q.rationale), `${course}: anything short of the rule is named in the report`)
  console.log(`rule  ${course}  plays ${Object.values(held.lanes).flat().length}  held ${held.held.length}`)
}

// ── the Locker Room (BK, 2026-09-27) ──────────────────────────────────────────
{
  const packs = { ...packsOf('us11r') }
  for (const p of manifest.culture.packs) packs[p.file] = pub(p.file)
  const withC = buildPool(manifest, 'us11r', packs, crops)
  eq(withC.culture.length, 41, 'the Locker Room reads both Office themes and the Unit 0 Be a Hawk bank: 5 + 12 + 24 practice items')
  ok(withC.culture.every(q => q.hints.length === 2 && q.rationale && q.size === 'short' && q.culture), 'every Locker Room question is short, with two hints and a reason')
  ok(Object.values(withC.lanes).flat().every(q => !q.culture), 'no Locker Room question ever enters a content lane')
  const d = makeDealer(withC, manifest.courses.us11r, manifest.rules)
  ok(d.hasCulture, 'the dealer knows the Locker Room has questions')
  const seenC = new Set(); for (let i = 0; i < 5; i++) seenC.add(d.draw('locker').id)
  eq(seenC.size, 5, 'the Locker Room deals all five before repeating')
  for (let i = 0; i < 100; i++) ok(!d.draw('halftime').culture && !d.draw('xp').culture, 'content gates never draw a Locker Room question')
}

// ── the podium set (Leo's LOCKED set, BK 2026-09-29 12:35) ─────────────────────
{
  const packs = { ...packsOf('us11r') }
  for (const p of manifest.culture.packs) packs[p.file] = pub(p.file)
  packs[manifest.culture.podium.file] = pub(manifest.culture.podium.file)
  const pool = buildPool(manifest, 'us11r', packs, crops)
  eq(pool.podium.length, 16, 'the podium set loads all 16 questions')
  eq(pool.podium.filter(q => q.after === 'win').length, 8, '8 of them are asked after a win')
  eq(pool.podium.filter(q => q.after === 'loss').length, 8, '8 after a loss or a tie')
  ok(pool.podium.every(q => q.culture && q.hints.length === 2 && q.rationale && q.whyNot), 'every podium question is a culture question with two hints, a reason and why-not lines')
  const raw = pub(manifest.culture.podium.file).items
  ok(pool.podium.every(q => { const it = raw.find(r => q.id.endsWith('#' + r.n)); return it && q.options.map(o => o.key).join('') === it.choices.map(c => c.key).join('') }), 'podium choices keep the order Leo wrote them in')
  const d = makeDealer(pool, manifest.courses.us11r, manifest.rules)
  ok(d.hasPodium, 'the dealer knows the podium set is loaded')
  const wins = new Set(); for (let i = 0; i < 8; i++) { const q = d.draw('podium', { after: 'win' }); ok(q.after === 'win', 'after a win, a win question'); wins.add(q.id) }
  eq(wins.size, 8, 'all eight win questions before a repeat')
  for (let i = 0; i < 20; i++) ok(d.draw('podium', { after: 'loss' }).after === 'loss', 'after a loss, a loss question')
  for (let i = 0; i < 20; i++) ok(d.draw('podium', {}).after === 'loss', 'a tie (no result given) draws from the loss set')
  ok(!Object.values(pool.lanes).flat().some(q => q.after), 'no podium question enters a content lane')
  for (let i = 0; i < 50; i++) ok(!pool.podium.includes(d.draw('locker')), 'the Locker Room never draws a podium question')
}

const dealer = makeDealer(us, manifest.courses.us11r, manifest.rules)
// BK, 2026-09-27: in-game questions stay short; documents go where the game already stops.
ok(us.lanes.sources.every(q => q.size === 'long'), 'US: every Part I item (a document) is sized long')
ok(gl.lanes.sources.every(q => q.size === 'long'), 'Global: every Part I item (a document) is sized long')
for (const gate of ['coin', 'xp', 'timeout', 'live', 'halftime', 'press', 'penalty', 'practice']) {
  const d = makeDealer(us, manifest.courses.us11r, manifest.rules)
  const dg = makeDealer(gl, manifest.courses.global10r, manifest.rules)
  for (let i = 0; i < 150; i++) {
    const q = d.draw(gate), qg = dg.draw(gate)
    ok(!q || q.size === 'short', `US: the ${gate} gate never asks a long question`)
    ok(!qg || qg.size === 'short', `Global: the ${gate} gate never asks a long question`)
  }
}
for (let i = 0; i < 200; i++) {
  const q = dealer.draw('xp')
  ok(q && q.lane !== 'sources', 'xp gate never draws a Part I document')
  ok(q && q.answerVerified !== false, 'xp gate never draws an unverified key')
}
for (let i = 0; i < 200; i++) ok(dealer.draw('halftime', { playoff: true }).answerVerified !== false, 'playoff gates never draw an unverified key')
for (const lane of ['sources']) {
  const d = makeDealer(us, manifest.courses.us11r, manifest.rules)
  for (let i = 0; i < 30; i++) ok(d.draw('training', { lane }).size === 'long', 'training asks the long questions first')
}
ok(makeDealer(us, manifest.courses.us11r, manifest.rules).draw('agency', { lane: 'sources' }).size === 'long', 'free agency asks the long questions first')
ok(makeDealer(us, manifest.courses.us11r, manifest.rules).draw('training', { lane: 'reading' }).size === 'short', 'a lane with no long questions falls back to short ones for training')
const nSources = us.lanes.sources.length
const fresh = makeDealer(us, manifest.courses.us11r, manifest.rules)
const seen = new Set(); for (let i = 0; i < nSources; i++) seen.add(fresh.draw('agency', { lane: 'sources' }).id)
eq(seen.size, nSources, `a lane deals every item before it repeats (${nSources} Part I items)`)
const mixed = makeDealer(us, manifest.courses.us11r, manifest.rules)
const mixSeen = new Set(); for (let i = 0; i < nSources; i++) mixSeen.add(mixed.draw(i % 2 ? 'training' : 'agency', { lane: 'sources' }).id)
eq(mixSeen.size, nSources, 'training and free agency share one deck: no repeats across gate types')
eq(makeDealer(gl, manifest.courses.global10r, manifest.rules).emptyLanes, ['context', 'reading'], 'Global: only context and task words are still empty')
ok(makeDealer(us, manifest.courses.us11r, manifest.rules).draw('practice'), 'the film-study gate can draw')
ok(makeDealer(us, manifest.courses.us11r, manifest.rules).draw('training', { lane: 'reading' }).lane === 'reading', 'training draws from the player\'s own lane')

// ── the stat layer ───────────────────────────────────────────────────────────
let form = { sources: 4, context: 4, vocab: 4, reading: 4, skills: 4, defense: 4 }
const r0 = values(ratings({ form, levels: {}, facilities: {} }))
for (let i = 0; i < 6; i++) form = applyAnswer(form, 'sources', true, 0, manifest.rules)
const r1 = values(ratings({ form, levels: {}, facilities: {} }))
ok(r1.throwing > r0.throwing, 'correct Part I answers raise Throwing')
ok(physics(r1, 5).throwJitter < physics(r0, 5).throwJitter, '…and tighten the throw on the field')
eq(applyAnswer(form, 'sources', true, 2, { hint_form_discount: 0 }).sources, applyAnswer(form, 'sources', true, 0, {}).sources, 'hints cost nothing by default')
const all = applyAnswerAll({ sources: 4, context: 4 }, 'sources', true, 0, {}, ['context'])
eq(all.context, 6, 'an empty lane\'s stat is built by every answer')

// ── v3 §4: Defense is its own trainable stat ────────────────────────────────
const baseCareer = newCareer('us11r', 0, 3)
eq(values(ratings(baseCareer)).defense >= 1, true, 'defense has a rating from the start')
let dForm = { ...baseCareer.form }
for (let i = 0; i < 4; i++) dForm = applyAnswer(dForm, DEFENSE, true, 0, manifest.rules)
ok(values(ratings({ ...baseCareer, form: dForm })).defense > values(ratings(baseCareer)).defense,
   'film-study answers raise Defense')
eq(applyAnswer(baseCareer.form, DEFENSE, true, 0, manifest.rules).defense - baseCareer.form.defense, 3,
   'a right film answer swings Defense harder than an in-game answer (manifest defense_gain)')
eq(applyAnswer(baseCareer.form, DEFENSE, true, 0, manifest.rules).sources, baseCareer.form.sources,
   'film study builds Defense only — it does not also inflate the lane it borrowed from')
// Levels feed Defense too: the same eleven kids play both ways.
ok(values(ratings({ ...baseCareer, levels: { throwing: 4, hands: 4, speed: 4, blocking: 4, toughness: 4 } })).defense >
   values(ratings({ ...baseCareer, levels: { throwing: 1, hands: 1, speed: 1, blocking: 1, toughness: 1 } })).defense,
   'a higher-level squad defends better')

// ── v3 §4: one threat signal, and Defense paid in proportion to it ──────────
ok(isBigMoment({ down: 3, toGo: 9, ballOn: 30 }) && isBigMoment({ down: 1, toGo: 10, ballOn: 85 }), 'big moments: 3rd-and-long and the red zone')
ok(!isBigMoment({ down: 1, toGo: 10, ballOn: 30 }), '1st-and-10 at your own 30 is not a big moment')
ok(threatOf(90) > threatOf(65) && threatOf(65) > threatOf(30), 'threat rises the closer they get')
const redZone = d => { let pts = 0; for (let i = 0; i < 3000; i++) pts += simDrive({ opp: 5, defense: d, start: 78 }).points; return pts / 3000 }
const midfield = d => { let pts = 0; for (let i = 0; i < 3000; i++) pts += simDrive({ opp: 5, defense: d, start: 20 }).points; return pts / 3000 }
const rzSwing = redZone(2) - redZone(9)
const mfSwing = midfield(2) - midfield(9)
ok(rzSwing > mfSwing, `Defense matters more on a deep drive than a shallow one (red zone ${rzSwing.toFixed(2)} vs midfield ${mfSwing.toFixed(2)})`)
ok(rzSwing > 0.5, 'a trained defense is worth real points when they are close')

// ── v3 §5: Practice Week and player levels ──────────────────────────────────
eq(newCareer('us11r', 0, 1).phase, 'practice', 'a season opens in Practice Week')
let pc = newCareer('us11r', 2, 5)
eq(finishPractice(pc).phase, 'regular', 'finishing practice puts the game on')
eq(finishPractice(pc).practiceDone, true, 'the week is marked done so a reload cannot farm it')
const trained = trainPlayer({ ...pc, cash: 10 }, 'hands')
eq(trained.levels.hands, pc.levels.hands + 1, 'training levels the player')
// v4 §1: a right answer is the whole price in the weekly loop.
eq(trained.cash, 10, 'training a player costs no cash')
eq(upgradeFacility({ ...pc, cash: 0 }, 'hands').facilities.hands, (pc.facilities.hands || 0) + 1,
   'a tier-1 facility opens with no cash either')
eq(upgradeFacility({ ...pc, facilities: { ...pc.facilities, hands: PRACTICE_FACILITY_MAX } }, 'hands').facilities.hands,
   PRACTICE_FACILITY_MAX, 'Practice Week cannot buy past tier 1 — tier 2 stays an off-season job')

// ── v4 §2: the difficulty curve ────────────────────────────────────────────
ok(WEEK_RAMP(0) < WEEK_RAMP(3) && WEEK_RAMP(3) < WEEK_RAMP(7), 'opponents ramp up across the season')
ok(WEEK_RAMP(0) <= -2, 'week 1 is the softest week of the year')
const wk = (week, phase = 'regular') => {
  let tot = 0, n = 0
  for (let seed = 0; seed < 40; seed++) {
    const c = { ...newCareer('us11r', seed % 10, seed), week, phase }
    for (let opp = 0; opp < 10; opp++) { if (opp === c.team) continue; tot += opponentStrength(c, opp); n++ }
  }
  return tot / n
}
ok(wk(0) < wk(3) && wk(3) < wk(7), `the schedule a student meets gets harder: ${wk(0).toFixed(1)} → ${wk(3).toFixed(1)} → ${wk(7).toFixed(1)}`)
// BK, 2026-09-22: "playoffs bite."
const semi = (week, round) => {
  let tot = 0, n = 0
  for (let seed = 0; seed < 40; seed++) {
    const c = { ...newCareer('us11r', seed % 10, seed), week, phase: 'playoffs', playoffRound: round }
    for (let opp = 0; opp < 10; opp++) { if (opp === c.team) continue; tot += opponentStrength(c, opp); n++ }
  }
  return tot / n
}
ok(semi(7, 1) > wk(7), `the semifinal is harder than week 8: ${semi(7, 1).toFixed(1)} vs ${wk(7).toFixed(1)}`)
ok(semi(7, 2) > semi(7, 1), `the championship is harder than the semifinal: ${semi(7, 2).toFixed(1)} vs ${semi(7, 1).toFixed(1)}`)
ok(PLAYOFF_BITE[2] > PLAYOFF_BITE[1] && PLAYOFF_BITE[1] > WEEK_RAMP(7), 'the bite is ordered: week 8 < semifinal < final')
const freshStats = values(ratings(newCareer('us11r', 1, 4)))
ok(Math.min(...Object.values(freshStats)) >= 3, `a fresh team starts competent, not broken (min ${Math.min(...Object.values(freshStats))})`)
ok(Object.values(newCareer('us11r', 1, 4).levels).every(l => l >= 2), 'no level-1 starters on a fresh squad')
let maxed = { ...pc, cash: 30, levels: { ...pc.levels, hands: MAX_LEVEL } }
eq(trainPlayer(maxed, 'hands'), maxed, 'a fully developed player cannot be levelled again')
ok(values(ratings(trained)).hands > values(ratings(pc)).hands, 'a levelled player raises his stat')
// A player's identity must survive being trained, or the student is training a stranger.
const before = player(7, 2, 'WR', 3, 1), after = player(7, 2, 'WR', 3, 4)
eq([before.name, before.number], [after.name, after.number], 'levelling a player does not rename him')
eq(roster(7, 2, 3, { hands: 3 }).hands.level, 3, 'the roster shows each player at his level')

// ── the non-negotiable: a wrong extra point never costs the touchdown ────────
let g = { ...newGame(8), ballOn: 95, toGo: 5 }
const td = applyPlay(g, { type: 'td', yardLine: 100, seconds: 3 })
eq(td.g.you, 6, 'touchdown banks six before any question')
eq(extraPoint(td.g, false).you, 6, 'wrong extra-point answer: still six')
eq(extraPoint(td.g, true).you, 7, 'right extra-point answer: seven')
// v5: the two-point try — all or nothing, and the six are never at risk
eq(twoPoint(td.g, true).you, 8, 'two-point try converted: eight')
eq(twoPoint(td.g, false).you, 6, 'two-point try missed: still six, the touchdown stands')
g = newGame(8)
const inc = applyPlay({ ...g, down: 4 }, { type: 'incomplete', yardLine: 25, seconds: 2 })
eq(inc.outcome.kind, 'downs', '4th-down incompletion turns it over')
const tk = applyPlay(g, { type: 'tackle', yardLine: 37, seconds: 3 }, () => 0.5)
ok(tk.g.down === 1 && tk.g.ballOn === 37, '12-yard gain is a first down')
ok(callTimeout(tk.g).halfLeft === tk.g.halfLeft + tk.g.lastRunoff, 'timeout refunds the runoff')

// ── v5: penalty moments (BK: "its real football, its consequences") ─────────
const bigGain = { type: 'tackle', yardLine: 49, gained: 24, seconds: 4 }
ok(isPenaltySpot(bigGain, { kind: 'continue' }, manifest.rules), 'a big gain can draw a flag')
ok(!isPenaltySpot({ type: 'tackle', gained: 4 }, { kind: 'continue' }, manifest.rules), 'a short gain cannot')
ok(!isPenaltySpot({ type: 'td', gained: 60 }, { kind: 'td' }, manifest.rules),
   'a TOUCHDOWN is never called back — the six bank and stay banked')
ok(!isPenaltySpot({ type: 'int', gained: 0 }, { kind: 'turnover' }, manifest.rules), 'a turnover cannot draw a flag')
ok(!isPenaltySpot({ type: 'sack', gained: -7 }, { kind: 'continue' }, manifest.rules), 'a loss cannot draw a flag')
{
  const before = { ...newGame(8), ballOn: 30, down: 2, toGo: 7 }
  const after = applyPlay(before, bigGain, () => 0.5).g
  ok(after.ballOn > before.ballOn && after.down === 1, 'the gain is a first down until the flag lands')
  const flagged = applyPenalty(before, after, manifest.rules)
  eq(flagged.ballOn, 20, 'the flag walks it back 10 from the previous spot')
  eq(flagged.down, 2, 'the down is replayed, not lost')
  eq(flagged.toGo, 17, 'and the distance grows by the penalty')
  eq(flagged.lastRunoff, 0, 'a flag stops the clock')
  eq(flagged.you, before.you, 'a flag never touches the score')
  const deep = { ...newGame(8), ballOn: 8, down: 1, toGo: 8 }
  const walked = applyPenalty(deep, { ...deep, ballOn: 44 }, manifest.rules)
  eq(walked.ballOn, 4, 'half the distance when the goal line is close')
  ok(walked.ballOn >= 1, 'a penalty can never walk the ball through your own goal line')
}

// ── season, league, career ───────────────────────────────────────────────────
const sch = schedule(7, 1)
ok(sch.length === 8 && sch.every(r => r.length === N_TEAMS / 2), `8 rounds of ${N_TEAMS / 2} games`)
ok(sch.every(r => new Set(r.flat()).size === N_TEAMS), 'every team plays once a round')
let c = newCareer('us11r', 3, 7)
for (let w = 0; w < 8; w++) {
  eq(c.phase, 'practice', `week ${w + 1} opens with a practice week`)
  eq(standings(c).reduce((n, r) => n + r.w + r.l + r.t, 0), w * N_TEAMS, 'standings count only the weeks actually played')
  c = finishPractice(c)
  c = afterGame(c, { result: RESULT.W, press: true }).career
}
eq(c.phase, 'playoffs', '8-0 makes the playoffs — and no practice week before a playoff game')
const st = standings(c)
eq(st.reduce((n, r) => n + r.w + r.l + r.t, 0), N_TEAMS * 8, `standings add up (${N_TEAMS} teams × 8 games)`)
ok(bracket(c).mine.includes(3), 'an 8-0 team is in the bracket')
c = afterGame(c, { result: RESULT.W }).career
c = afterGame(c, { result: RESULT.W }).career
ok(c.champ && c.titles === 1 && c.phase === 'seasonEnd', 'two playoff wins: champion')
c = applySeasonReview(c)
eq(c.phase, 'offseason', 'a champion is not fired')
c = startNextSeason(c)
ok(c.season === 2 && c.week === 0 && c.results.every(r => r === 0), 'next season resets the record, keeps the coach')
eq(c.phase, 'practice', 'a new season opens in Practice Week too')
let bad = newCareer('global10r', 1, 9)
bad.security = 8
for (let w = 0; w < 8; w++) bad = afterGame(finishPractice(bad), { result: RESULT.L }).career
eq(applySeasonReview(bad).phase, 'jobs', '0-8 with low security: fired')

// ── kits: two sides a student can tell apart (BK, 2026-09-22) ───────────────
const GRASS = ['#3B8A38', '#357F33']
let worstPair = { d: Infinity, label: '' }
for (const home of TEAMS) for (const away of TEAMS) {
  if (home === away) continue
  const k = kits(home, away)
  const d = colorDistance(k.offense.jersey, k.defense.jersey)
  if (d < worstPair.d) worstPair = { d, label: `${home.abbr} v ${away.abbr}` }
  ok(d > CLASH, `${home.abbr} v ${away.abbr}: jerseys must read as different teams (${d.toFixed(0)})`)
  for (const [side, kit] of [['home', k.offense], ['away', k.defense]])
    for (const g of GRASS)
      ok(colorDistance(kit.jersey, g) > GRASS_MIN, `${home.abbr} v ${away.abbr} ${side}: jersey must not vanish into the grass`)
}
ok(worstPair.d > CLASH, `closest of the 90 matchups is ${worstPair.d.toFixed(0)} (${worstPair.label})`)
const bng = TEAMS.find(t => t.id === 'binghamton')
eq([bng.kit.helmet, bng.kit.pants], ['#1D3FA8', '#1D3FA8'], 'Binghamton wears blue helmets and blue pants')
ok(colorDistance(bng.kit.jersey, bng.kit.helmet) > CLASH, '…which offsets the red jersey')
ok(!TEAMS.some(t => /best buy/i.test(t.colorNames)), 'Horseheads blue is just blue')
ok(TEAMS.every(t => t.kit && t.alt && t.kit.jersey && t.alt.jersey), 'every team has a home kit and a change strip')

// ── save code: the whole career, exactly ─────────────────────────────────────
for (let i = 0; i < 300; i++) {
  const x = newCareer(i % 2 ? 'us11r' : 'global10r', i % 10, i % 64)
  x.season = 1 + (i % 16); x.week = i % 9; x.phase = ['regular', 'practice', 'playoffs', 'seasonEnd', 'jobs', 'offseason'][i % 6]
  x.results = [0, 1, 2, 3, 1, 1, 2, 0].map((v, k) => (v + i + k) % 4)
  x.playoffRound = i % 3; x.champ = i % 7 === 0; x.cash = i % 32; x.security = (i * 3) % 32; x.titles = i % 4
  x.form = { sources: i % 16, context: (i + 3) % 16, vocab: (i + 5) % 16, reading: (i + 7) % 16, skills: (i + 11) % 16, defense: (i + 13) % 16 }
  x.facilities = { throwing: i % 3, hands: (i + 1) % 3, speed: (i + 2) % 3, blocking: i % 3, toughness: (i + 1) % 3, defense: (i + 2) % 3 }
  x.levels = { throwing: 1 + i % 4, hands: 1 + (i + 1) % 4, speed: 1 + (i + 2) % 4, blocking: 1 + (i + 3) % 4, toughness: 1 + i % 4 }
  x.practiceDone = i % 3 === 0
  const code = encodeSaveCode(x)
  ok(/^([0-9A-Z]{4}-){5}[0-9A-Z]{3}$/.test(code), `code shape ${code}`)
  eq(decodeSaveCode(code.toLowerCase().replace(/1/g, 'l')), x, `round trip #${i}`)
}
const good = encodeSaveCode(newCareer('us11r', 2, 5))
const typo = good.slice(0, 3) + (good[3] === 'A' ? 'B' : 'A') + good.slice(4)
let threw = null; try { decodeSaveCode(typo) } catch (e) { threw = e.message }
ok(/typo/.test(threw || ''), 'a one-character typo is caught')

// ── simulated drives stay sane ───────────────────────────────────────────────
let pts = 0; for (let i = 0; i < 2000; i++) pts += simDrive({ opp: 5, defense: 5 }).points
ok(pts / 2000 > 1.5 && pts / 2000 < 3.5, `an even matchup averages 1.5–3.5 points a drive (${(pts / 2000).toFixed(2)})`)
let strong = 0, weak = 0
for (let i = 0; i < 2000; i++) { strong += simDrive({ opp: 5, defense: 9 }).points; weak += simDrive({ opp: 5, defense: 2 }).points }
ok(strong < weak, 'a better Defense rating allows fewer points')



// ── the twelve (BK, 2026-09-28) ─────────────────────────────────────────────
eq(N_TEAMS, 12, 'twelve teams')
eq(TEAMS.filter(t => t.era === 'modern').length, 6, 'six modern')
eq(TEAMS.filter(t => t.era === 'legacy').length, 6, 'six legacy')
// A save code stores the team's place in the list, so the first ten never move.
eq(TEAMS.slice(0, 10).map(t => t.id), ['corning', 'elmira', 'horseheads', 'binghamton', 'ithaca', 'cwest', 'ceast', 'southside', 'efa', 'notredame'], 'the first ten keep their places')
eq(new Set(TEAMS.map(t => t.abbr)).size, N_TEAMS, 'every scoreboard code is different')
eq(TEAMS.map(t => t.abbr).join(' '), 'CPP ELM HHD BNG ITH WHS EHS SHS EFA ND TAE THS', 'the scoreboard codes BK set')
for (const i of [10, 11]) {
  const x = newCareer('us11r', i, 5)
  eq(decodeSaveCode(encodeSaveCode(x)).team, i, `a ${TEAMS[i].name} save code comes back as ${TEAMS[i].name}`)
}
for (let seed = 0; seed < 64; seed++) for (let s = 1; s <= 16; s++) {
  const sc = schedule(seed, s)
  const opp = new Map()
  for (const r of sc) for (const [a, b] of r) { if (a === b) throw new Error('a team scheduled against itself'); (opp.get(a) || opp.set(a, new Set()).get(a)).add(b); (opp.get(b) || opp.set(b, new Set()).get(b)).add(a) }
  if (![...opp.values()].every(v => v.size === 8)) throw new Error(`seed ${seed} season ${s}: a repeat opponent`)
}
ok(true, '64 leagues × 16 seasons: eight different opponents, nobody plays himself')
let clashes = 0, cvdClashes = 0, lastResort = []
for (const a of TEAMS) for (const b of TEAMS) if (a !== b) {
  const k = kits(a, b)
  if (colorDistance(k.offense.jersey, k.defense.jersey) <= CLASH) clashes++
  if (cvdDistance(k.offense.jersey, k.defense.jersey) <= CVD_CLASH) cvdClashes++
  if (k.defense.jersey === '#2B2F36' || k.offense.jersey === '#2B2F36') lastResort.push(`${a.abbr}-${b.abbr}`)
}
eq(clashes, 0, 'all 132 matchups: the two sides wear different-looking jerseys')
eq(cvdClashes, 0, 'all 132 matchups: still different to a red-green colour-blind eye')
// Corning West v Southside used to need the grey strip; BK's two greens (2026-09-28) fixed it.
eq(lastResort, [], 'no matchup falls back to the plain grey strip')
const cws = TEAMS.find(t => t.id === 'cwest'), shs = TEAMS.find(t => t.id === 'southside')
eq(kits(cws, shs).offense.jersey, cws.kit.jersey, 'Corning West wear their own green at home v Southside')
eq(kits(shs, cws).offense.jersey, shs.kit.jersey, 'Southside wear their own hunter green at home v Corning West')
const heights = TEAMS.findIndex(t => t.id === 'heights'), bing = TEAMS.findIndex(t => t.id === 'binghamton')
eq(kits(TEAMS[heights], TEAMS[bing]).offense.jersey, '#F2F2F2', 'Elmira Heights wear white against Binghamton (home)')
eq(kits(TEAMS[bing], TEAMS[heights]).defense.jersey, '#F2F2F2', 'Elmira Heights wear white against Binghamton (away)')

// ── the Locker Room pool (BK's Office themes 1 and 2, 2026-09-28) ─────────────
{
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/bowl.manifest.json'), 'utf8'))
  const packs = {}
  for (const p of man.culture.packs) packs[p.file] = JSON.parse(fs.readFileSync(path.join(ROOT, 'public', p.file), 'utf8'))
  const culture = buildCulture(man, packs)
  eq(culture.length, 41, 'Locker Room pool: theme 1 (5) + theme 2 (12) + Unit 0 Be a Hawk (24), none held back')
  ok(culture.every(q => q.hints.length === 2 && q.rationale), 'every Locker Room question has two hints and a reason')
}

// ── the podium (BK, 2026-09-28, Plan A) ───────────────────────────────────────
{
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/bowl.manifest.json'), 'utf8'))
  const packs = {}
  for (const p of man.culture.packs) packs[p.file] = JSON.parse(fs.readFileSync(path.join(ROOT, 'public', p.file), 'utf8'))
  const culture = buildCulture(man, packs)
  const d = makeDealer({ lanes: {}, culture }, { weights: {} }, {})
  const seen = []
  for (let game = 0; game < 8; game++) { const a = d.draw('locker'), b = d.draw('podium'); ok(a && b && a.culture && b.culture && a.id !== b.id, `game ${game + 1}: halftime and podium ask two different culture questions`); seen.push(a.id, b.id) }
  eq(new Set(seen.slice(0, 16)).size, 16, 'the first 16 culture questions of a season are all different')
}

// ── the why-not line (BK 2026-09-28) ─────────────────────────────────────────
{
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/bowl.manifest.json'), 'utf8'))
  const packs = {}
  for (const p of man.culture.packs) packs[p.file] = JSON.parse(fs.readFileSync(path.join(ROOT, 'public', p.file), 'utf8'))
  const culture = buildCulture(man, packs)
  ok(culture.every(q => q.whyNot && q.options.filter(o => o.key !== q.correct).every(o => typeof q.whyNot[o.key] === 'string' && q.whyNot[o.key].length)),
     'every culture question carries a why-not line for each wrong choice')
}

// ── volleyball: the sport pick (2026-10-03) ──────────────────────────────────
// A code written by the build that shipped 2026-09-29 (66cffef's encoder, generated from it, not by hand).
// It must still load, exactly, as a football career: the sport bit was a spare, and spares were 0.
const OLD = 'AC88-SR01-JJBV-DP29-2V8T-CD1'
const old = decodeSaveCode(OLD)
eq([old.sport, old.team, old.season, old.week, old.cash, old.security, old.seed, old.titles, old.form.skills, old.levels.speed],
   ['football', 3, 2, 4, 12, 20, 41, 1, 13, 4], 'a pre-volleyball code loads as the same football career')
eq(encodeSaveCode(old), OLD, 'and re-encodes to the very same code')
for (let i = 0; i < 64; i++) {
  const x = newCareer(i % 2 ? 'us11r' : 'global10r', i % N_TEAMS, i, 'volleyball')
  const y = decodeSaveCode(encodeSaveCode(x))
  ok(y.sport === 'volleyball' && sportOf(y) === 'volleyball', `volleyball career #${i} comes back as volleyball`)
}
ok(encodeSaveCode(newCareer('us11r', 0, 5, 'volleyball')) !== encodeSaveCode(newCareer('us11r', 0, 5, 'football')), 'the two sports write different codes')
eq(newCareer('us11r', 0, 5).sport, 'football', 'a career with no sport named is football')
for (let seed = 0; seed < 64; seed++) for (let t = 0; t < N_TEAMS; t++) {
  const ro = roster(seed, t, 1 + (seed % 5), {}, 'volleyball')
  const nums = Object.values(ro).map(p => p.number)
  if (new Set(nums).size !== 5 || nums.some(n => n < 1 || n > 9)) throw new Error(`volleyball numbers ${nums} (seed ${seed}, team ${t})`)
  if (new Set(Object.values(ro).map(p => p.name.split(' ')[0])).size !== 5) throw new Error('two starters share a first name')
}
eq(Object.values(roster(5, 0, 1, {}, 'volleyball')).map(p => p.position), ['S', 'L', 'OH', 'MB', 'DS'], 'volleyball positions: S, L, OH, MB, DS (BK 15:34)')
// Football's roster is untouched by the sport pick: same names, same numbers.
eq(roster(5, 0, 1, {}), roster(5, 0, 1, {}, 'football'), 'football roster unchanged')
eq(VB.theirServe, 'Their serve. Your passer has it.', 'the receive prompt BK approved 15:24')
eq(Object.keys(VB.coach), ['serve', 'pass', 'set', 'attack', 'block', 'dig', 'wrap'], 'seven coach cards')
eq(SHARED_VB.tagline, "You won't win the game unless you win the content.", 'the tagline BK approved 15:31')
for (const s of ['throwing', 'hands', 'speed', 'blocking', 'toughness', 'defense']) ok(explainVolley(s, 5).length > 10, `a volleyball line for ${s}`)

// ── Play Call (BK 2026-10-03 16:06) ─────────────────────────────────────────
eq(PLAYS.map(p => [p.name, p.line]), [
  ['Sweep', 'Run outside. Your blockers lead the way to the sideline.'],
  ['Dive', 'Run up the middle. Short, tough yards.'],
  ['Slants', 'Quick passes. Receivers 1 and 2 cut inside fast.'],
  ['Deep Shot', 'Go long. Your receivers run deep, so the line has to hold.'],
], 'the four plays, in the words BK approved')
eq([PLAY_WORDS.head, PLAY_WORDS.readIt, PLAY_WORDS.change], ['Play Call', 'They read it!', 'Change play'], 'Play Call words (BK 16:06, 16:13)')
const lv = n => ({ throwing: n, hands: n, speed: n, blocking: n, toughness: n })
eq([1, 2, 3, 4].map(n => +guessChance(lv(n)).toFixed(2)), [0.4, 0.32, 0.24, 0.16], 'the better trained, the less they read you')
for (const p of PLAYS) ok(!!ROUTES_OF[p.id], `${p.id} has its routes`)
// The repeat rule (BK 18:07): spamming one play gets it read more; mixing it up doesn't.
eq(+readChance(lv(3), [], 'deep').toFixed(2), 0.24, 'a first call reads at the training rate')
eq(+readChance(lv(3), ['deep', 'deep', 'deep'], 'deep').toFixed(2), 0.6, 'three Deep Shots in a row: the fourth is read 6 times in 10')
eq(+readChance(lv(3), ['dive', 'sweep', 'slants'], 'deep').toFixed(2), 0.24, 'a mixed-up call stays at the training rate')
eq(+readChance(lv(1), ['deep', 'deep', 'deep'], 'deep').toFixed(2), 0.7, 'capped at 0.70')

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
