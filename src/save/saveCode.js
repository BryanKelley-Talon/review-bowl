/* Skills Review Bowl (Flashpoint History), 2026.
 *
 * The save code: a short, typeable record of a whole career. It fits on a worksheet and a teacher can read it
 * back. Adapted from Nation Builder's saveCode.js (builds/nation-builder/src/nb/saveCode.js) — same alphabet, same
 * checksum, same forgiving decoder, same student-safe error messages. What changed is the payload: Nation Builder's
 * code cannot hold a city, so it is a checkpoint beside a city file. A football career is small enough that the code
 * IS the save — every field is stored exactly, and entering the code restores the career as it was.
 *
 * Layout (version 2): 21 data characters + 2 check characters, Crockford base32, shown as XXXX-XXXX-XXXX-XXXX-XXXX-XXX.
 * Crockford's alphabet has no I, L, O or U, and decoding reads I/L as 1 and O as 0, so misread letters still work.
 *
 * Data bits (105, most significant first):
 *   version 3 · course 1 · team 4 · season 4 · phase 3 · week 4 · results 16 (8 games × 2) · playoff round 2 ·
 *   champion 1 · cash 5 · job security 5 · form 6×4 (five lanes + defense) · facilities 6×2 · player levels 5×2 ·
 *   titles 2 · seed 6 · practice-done 1 · sport 1 · spare 1
 *
 * SPORT (2026-10-03, volleyball): one of the two spare bits. Every code written before volleyball
 * carries 0 there, which reads as football, so every old code still loads exactly as it was.
 *
 * VERSION 3 (2026-10-04, injuries; BK 23:57 "let's start building the injury mechanic"): two more
 * data characters, 23 + 2 = 25, shown XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-X. The new 10 bits:
 *   injury 4 (0 = nobody hurt; else which starter and 1 or 2 games left, injury.js) ·
 *   reserved 6 (held at 0 for Leo's class/unit picker, the next Review Bowl update: No class 1 +
 *   units up to N 4 + 1 spare), so the code changes length once, not twice.
 * A version-2 code (23 characters) still loads exactly as it was, with nobody hurt; the next code
 * the game writes for that career is a version-3 code.
 *
 * Nothing in it identifies a student: no name, no school, no answers — only the team's state.
 */

import { TEAMS } from '../game/teams.js';
import { injuryFromBits, injuryToBits } from '../game/injury.js';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
// VERSION 2 (v3 iteration): Defense became a real trainable stat with its own form and
// facility, Practice Week added a phase and a per-week flag, and "stars" became player
// LEVELS. Those are new fields, so v1 codes cannot be read — a code written during the
// first playtest will be refused with the version message rather than silently misread.
const VERSION = 3;

export const COURSES = ['global10r', 'us11r'];
export const PHASES = ['regular', 'practice', 'playoffs', 'seasonEnd', 'jobs', 'offseason'];
const LANES = ['sources', 'context', 'vocab', 'reading', 'skills', 'defense'];
const STATS = ['throwing', 'hands', 'speed', 'blocking', 'toughness'];
const FACILITIES = [...STATS, 'defense'];

const FIELDS = [
  ['version', 3], ['course', 1], ['team', 4], ['season', 4], ['phase', 3], ['week', 4], ['results', 16],
  ['playoffRound', 2], ['champ', 1], ['cash', 5], ['security', 5],
  ...LANES.map(l => [`form_${l}`, 4]),
  ...FACILITIES.map(s => [`fac_${s}`, 2]),
  ...STATS.map(s => [`lvl_${s}`, 2]),
  ['titles', 2], ['seed', 6], ['practiceDone', 1], ['sport', 1], ['spare', 1],
];
const FIELDS_V2 = FIELDS.slice();
FIELDS.push(['injury', 4], ['reserved', 6]);

const DATA_CHARS = 23;
const DATA_CHARS_V2 = 21;
const CHECK_CHARS = 2;


function checksum(dataChars) {
  // Position-weighted sum mod a prime just under 32², so any single wrong character or swapped neighbours change it.
  let sum = 0;
  for (let i = 0; i < dataChars.length; i++)
    sum += (i + 1) * (ALPHABET.indexOf(dataChars[i]) + 1);
  const check = sum % 1021;
  return ALPHABET[check >> 5] + ALPHABET[check & 31];
}


const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));


// career: see App.jsx newCareer() for the shape.
export function encodeSaveCode(career) {
  const results = (career.results || []).slice(0, 8);
  let resultBits = 0;
  for (let i = 0; i < 8; i++)
    resultBits = (resultBits << 2) | clampInt(results[i] || 0, 0, 3);

  const values = {
    version: VERSION,
    course: COURSES.indexOf(career.course),
    team: career.team,
    season: clampInt(career.season, 1, 16) - 1,
    phase: PHASES.indexOf(career.phase),
    week: clampInt(career.week, 0, 8),
    results: resultBits,
    playoffRound: clampInt(career.playoffRound, 0, 2),
    champ: career.champ ? 1 : 0,
    cash: clampInt(career.cash, 0, 31),
    security: clampInt(career.security, 0, 31),
    titles: clampInt(career.titles, 0, 3),
    seed: clampInt(career.seed, 0, 63),
    practiceDone: career.practiceDone ? 1 : 0,
    sport: career.sport === 'volleyball' ? 1 : 0,
    spare: 0,
    injury: injuryToBits(career.injury),
    reserved: 0,
  };
  for (const l of LANES) values[`form_${l}`] = clampInt(career.form?.[l], 0, 15);
  for (const s of FACILITIES) values[`fac_${s}`] = clampInt(career.facilities?.[s], 0, 2);
  for (const s of STATS) values[`lvl_${s}`] = clampInt((career.levels?.[s] ?? 2) - 1, 0, 3);

  let bits = 0n;
  for (const [name, width] of FIELDS) {
    const v = values[name];
    if (!Number.isInteger(v) || v < 0 || v >= 2 ** width)
      throw new Error(`Save code field ${name} out of range: ${v}`);
    bits = (bits << BigInt(width)) | BigInt(v);
  }

  let data = '';
  for (let i = DATA_CHARS - 1; i >= 0; i--)
    data += ALPHABET[Number((bits >> BigInt(i * 5)) & 31n)];

  const code = data + checksum(data);
  return code.match(/.{1,4}/g).join('-');
}


export function normalizeSaveCode(input) {
  return String(input).toUpperCase().replace(/[\s-]/g, '').replace(/[IL]/g, '1').replace(/O/g, '0');
}


// Returns the career, or throws an Error whose message is safe to show a student.
export function decodeSaveCode(input) {
  const code = normalizeSaveCode(input);

  // A 22-character code is a v1 code from before Practice Week: say so plainly rather
  // than telling a student their own handwriting is wrong.
  if (code.length === 22)
    throw new Error('That code is from an earlier version of Review Bowl, before practice weeks. Start a new career.');
  // 25 characters: version 3 (injuries). 23: version 2, which still loads, with nobody hurt.
  const v2 = code.length === DATA_CHARS_V2 + CHECK_CHARS;
  const nData = v2 ? DATA_CHARS_V2 : DATA_CHARS;
  if ((!v2 && code.length !== DATA_CHARS + CHECK_CHARS) || [...code].some(c => !ALPHABET.includes(c)))
    throw new Error('That doesn’t look like a Review Bowl code. Codes have 25 letters and numbers.');

  const data = code.slice(0, nData);
  if (checksum(data) !== code.slice(nData))
    throw new Error('That code has a typo somewhere. Check each character against your worksheet.');

  let bits = 0n;
  for (const c of data)
    bits = (bits << 5n) | BigInt(ALPHABET.indexOf(c));

  const layout = v2 ? FIELDS_V2 : FIELDS;
  const values = {};
  for (let i = layout.length - 1; i >= 0; i--) {
    const [name, width] = layout[i];
    values[name] = Number(bits & ((1n << BigInt(width)) - 1n));
    bits >>= BigInt(width);
  }

  if (values.version !== (v2 ? 2 : VERSION))
    throw new Error('That code is from a different version of Review Bowl.');
  if (values.team >= TEAMS.length || values.phase >= PHASES.length)   // 12 teams since 2026-09-28; the field holds 16
    throw new Error('That code doesn’t match any team in this league. Check it against your worksheet.');

  const results = [];
  for (let i = 7; i >= 0; i--)
    results.push((values.results >> (i * 2)) & 3);

  return {
    course: COURSES[values.course],
    team: values.team,
    season: values.season + 1,
    phase: PHASES[values.phase],
    week: values.week,
    results,
    playoffRound: values.playoffRound,
    champ: !!values.champ,
    cash: values.cash,
    security: values.security,
    form: Object.fromEntries(LANES.map(l => [l, values[`form_${l}`]])),
    facilities: Object.fromEntries(FACILITIES.map(s => [s, values[`fac_${s}`]])),
    levels: Object.fromEntries(STATS.map(s => [s, values[`lvl_${s}`] + 1])),
    titles: values.titles,
    seed: values.seed,
    practiceDone: !!values.practiceDone,
    sport: values.sport ? 'volleyball' : 'football',
    injury: v2 ? null : injuryFromBits(values.injury),
  };
}
