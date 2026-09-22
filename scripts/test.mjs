// Skills Review Bowl — rule and pipeline checks.  `npm test`
// No test framework: plain Node, no new dependency. Reads the REAL staged content.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildPool } from '../src/content/pool.js'
import { makeDealer } from '../src/content/dealer.js'
import { DEFENSE, applyAnswer, applyAnswerAll, physics, ratings, values } from '../src/game/ratings.js'
import { applyPlay, callTimeout, extraPoint, newGame } from '../src/game/matchRules.js'
import {
  afterGame, applySeasonReview, bracket, finishPractice, MAX_LEVEL, newCareer, RESULT, schedule, standings,
  startNextSeason, trainCost, trainPlayer,
} from '../src/game/season.js'
import { simDrive } from '../src/game/drive.js'
import { isBigMoment, threatOf } from '../src/game/threat.js'
import { player, roster } from '../src/game/teams.js'
import { decodeSaveCode, encodeSaveCode } from '../src/save/saveCode.js'

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
const pools = {}
for (const course of Object.keys(manifest.courses)) {
  const packs = {}
  for (const p of manifest.courses[course].packs) packs[p.file] = pub(p.file)
  const pool = buildPool(manifest, course, packs, crops)
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
eq(us.lanes.skills.length, 29, 'US: 6 skill lines + 4 principles + 19 foundation pairs')
// v3 §6: Global had no vocabulary or skills content of its own until Will's scenario set was wired.
eq(gl.lanes.vocab.length, 15, 'Global: 8 region pairs + 7 Enlightenment terms')
eq(gl.lanes.skills.length, 5, 'Global: 5 skill moves')
ok(gl.lanes.vocab.filter(q => q.id.startsWith('sq-')).every(q => q.hints.length === 2), 'Global: the scenario terms carry their hints')
ok(gl.lanes.skills.every(q => q.options.length === 4), 'Global: skill moves render as four-option questions')
eq(us.lanes.sources.filter(q => q.answerVerified === false).map(q => q.id).sort(),
   ['cppu1-mc08', 'cppu1-mc09', 'cppu1-mc14', 'cppu1-mc15', 'cppu1-mc16', 'cppu1-mc17'], 'US: answer_verified:false carried on exactly the six')
eq(gl.lanes.sources.filter(q => q.licence === 'teach-only').length, 11, 'Global: licence carried (11 teach-only)')
ok(gl.lanes.sources.every(q => q.hints.length === 2), 'Global: every Part I item has its two hints')
ok(us.lanes.sources.every(q => q.stimulus.images.length > 0), 'US: every Part I item shows its source crop')

// ── the dealer ───────────────────────────────────────────────────────────────
const dealer = makeDealer(us, manifest.courses.us11r, manifest.rules)
for (let i = 0; i < 200; i++) {
  const q = dealer.draw('xp')
  ok(q.lane === 'sources', 'xp gate draws Part I only')
  ok(q.answerVerified !== false, 'xp gate never draws an unverified key')
}
for (let i = 0; i < 200; i++) ok(dealer.draw('halftime', { playoff: true }).answerVerified !== false, 'playoff gates never draw an unverified key')
const fresh = makeDealer(us, manifest.courses.us11r, manifest.rules)
const seen = new Set(); for (let i = 0; i < 13; i++) seen.add(fresh.draw('xp').id)
eq(seen.size, 13, 'a lane deals every item before it repeats (13 verified Part I items)')
const mixed = makeDealer(us, manifest.courses.us11r, manifest.rules)
const mixSeen = new Set(); for (let i = 0; i < 16; i++) mixSeen.add(mixed.draw(i % 2 ? 'xp' : 'agency', { lane: 'sources' }).id)
eq(mixSeen.size, 16, 'scoring and non-scoring gates share one deck: no repeats across gate types')
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
eq(trained.cash, 10 - trainCost(pc.levels.hands), 'training spends the cash')
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
g = newGame(8)
const inc = applyPlay({ ...g, down: 4 }, { type: 'incomplete', yardLine: 25, seconds: 2 })
eq(inc.outcome.kind, 'downs', '4th-down incompletion turns it over')
const tk = applyPlay(g, { type: 'tackle', yardLine: 37, seconds: 3 }, () => 0.5)
ok(tk.g.down === 1 && tk.g.ballOn === 37, '12-yard gain is a first down')
ok(callTimeout(tk.g).halfLeft === tk.g.halfLeft + tk.g.lastRunoff, 'timeout refunds the runoff')

// ── season, league, career ───────────────────────────────────────────────────
const sch = schedule(7, 1)
ok(sch.length === 8 && sch.every(r => r.length === 5), '8 rounds of 5 games')
ok(sch.every(r => new Set(r.flat()).size === 10), 'every team plays once a round')
let c = newCareer('us11r', 3, 7)
for (let w = 0; w < 8; w++) {
  eq(c.phase, 'practice', `week ${w + 1} opens with a practice week`)
  eq(standings(c).reduce((n, r) => n + r.w + r.l + r.t, 0), w * 10, 'standings count only the weeks actually played')
  c = finishPractice(c)
  c = afterGame(c, { result: RESULT.W, press: true }).career
}
eq(c.phase, 'playoffs', '8-0 makes the playoffs — and no practice week before a playoff game')
const st = standings(c)
eq(st.reduce((n, r) => n + r.w + r.l + r.t, 0), 80, 'standings add up (10 teams × 8 games)')
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

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
