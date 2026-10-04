/* Skills Review Bowl (Flashpoint History), 2026.
 *
 * The save code: a short record of a student's seasons that a student copies and pastes back. Adapted from
 * Nation Builder's saveCode.js (builds/nation-builder/src/nb/saveCode.js) — same alphabet, same checksum, same
 * forgiving decoder, same student-safe error messages. The code IS the save — every field is stored exactly, and
 * entering the code restores the seasons as they were.
 *
 * Crockford base32: no I, L, O or U, and decoding reads I/L as 1 and O as 0, so misread letters still work.
 *
 * VERSION 3 (2026-10-04) · ONE CODE FOR BOTH SPORTS. BK 00:22 "what if we had one save code ... it shows your
 * progress in that season underneath the game box"; 00:26 "one code with knowledge carried across, whatever is
 * most efficient." 37 data characters + 2 check = 39, shown in groups of four.
 *   shared (45 bits): version 3 · course 1 · seed 6 · form 6×4 (the student's knowledge: it carries across both
 *     sports) · injury 4 (football; injury.js) · reserved 6 (held at 0 for Leo's class/unit picker: No class 1 +
 *     units up to N 4 + 1 spare) · last sport played 1
 *   per sport, football then volleyball (70 bits each): started 1 · team 4 · season 4 · phase 3 · week 4 ·
 *     results 16 (8 games × 2) · playoff round 2 · champion 1 · cash 5 · job security 5 · facilities 6×2 ·
 *     player levels 5×2 · titles 2 · practice-done 1
 * A sport with `started` 0 has no season yet; its other bits are 0.
 *
 * VERSION 2 (23 characters, shipped 2026-09-29 to 2026-10-03) still loads: it holds one career, which becomes that
 * sport's season in a version-3 file. The next code the game writes is a version-3 code.
 *
 * Nothing in it identifies a student: no name, no school, no answers — only the teams' state.
 */

import { TEAMS } from '../game/teams.js';
import { injuryFromBits, injuryToBits } from '../game/injury.js';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const VERSION = 3;

export const COURSES = ['global10r', 'us11r'];
export const PHASES = ['regular', 'practice', 'playoffs', 'seasonEnd', 'jobs', 'offseason'];
export const SPORTS = ['football', 'volleyball'];
const LANES = ['sources', 'context', 'vocab', 'reading', 'skills', 'defense'];
const STATS = ['throwing', 'hands', 'speed', 'blocking', 'toughness'];
const FACILITIES = [...STATS, 'defense'];

// Version 2: one career per code (kept to read old codes).
const FIELDS_V2 = [
  ['version', 3], ['course', 1], ['team', 4], ['season', 4], ['phase', 3], ['week', 4], ['results', 16],
  ['playoffRound', 2], ['champ', 1], ['cash', 5], ['security', 5],
  ...LANES.map(l => [`form_${l}`, 4]),
  ...FACILITIES.map(s => [`fac_${s}`, 2]),
  ...STATS.map(s => [`lvl_${s}`, 2]),
  ['titles', 2], ['seed', 6], ['practiceDone', 1], ['sport', 1], ['spare', 1],
];

// Version 3: one file, both sports.
const SPORT_FIELDS = [
  ['started', 1], ['team', 4], ['season', 4], ['phase', 3], ['week', 4], ['results', 16],
  ['playoffRound', 2], ['champ', 1], ['cash', 5], ['security', 5],
  ...FACILITIES.map(s => [`fac_${s}`, 2]),
  ...STATS.map(s => [`lvl_${s}`, 2]),
  ['titles', 2], ['practiceDone', 1],
];
const FIELDS = [
  ['version', 3], ['course', 1], ['seed', 6],
  ...LANES.map(l => [`form_${l}`, 4]),
  ['injury', 4], ['reserved', 6], ['lastSport', 1],
  ...SPORTS.flatMap(sp => SPORT_FIELDS.map(([n, w]) => [`${sp}_${n}`, w])),
];

const DATA_CHARS = 37;
const DATA_CHARS_V2 = 21;
const CHECK_CHARS = 2;
export const CODE_LENGTH = DATA_CHARS + CHECK_CHARS;

// Which career fields belong to one sport (the rest are shared by the file).
export const SPORT_KEYS = ['team', 'season', 'phase', 'week', 'results', 'playoffRound', 'champ', 'cash', 'security',
  'facilities', 'levels', 'titles', 'practiceDone'];


function checksum(dataChars) {
  // Position-weighted sum mod a prime just under 32², so any single wrong character or swapped neighbours change it.
  let sum = 0;
  for (let i = 0; i < dataChars.length; i++)
    sum += (i + 1) * (ALPHABET.indexOf(dataChars[i]) + 1);
  const check = sum % 1021;
  return ALPHABET[check >> 5] + ALPHABET[check & 31];
}

const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));

function pack(fields, values, nChars) {
  let bits = 0n;
  for (const [name, width] of fields) {
    const v = values[name] ?? 0;
    if (!Number.isInteger(v) || v < 0 || v >= 2 ** width)
      throw new Error(`Save code field ${name} out of range: ${v}`);
    bits = (bits << BigInt(width)) | BigInt(v);
  }
  const total = fields.reduce((n, [, w]) => n + w, 0);
  bits <<= BigInt(nChars * 5 - total);                 // pad the last character
  let data = '';
  for (let i = nChars - 1; i >= 0; i--)
    data += ALPHABET[Number((bits >> BigInt(i * 5)) & 31n)];
  return (data + checksum(data)).match(/.{1,4}/g).join('-');
}

function unpack(fields, data) {
  let bits = 0n;
  for (const c of data) bits = (bits << 5n) | BigInt(ALPHABET.indexOf(c));
  const total = fields.reduce((n, [, w]) => n + w, 0);
  bits >>= BigInt(data.length * 5 - total);
  const values = {};
  for (let i = fields.length - 1; i >= 0; i--) {
    const [name, width] = fields[i];
    values[name] = Number(bits & ((1n << BigInt(width)) - 1n));
    bits >>= BigInt(width);
  }
  return values;
}

const resultsToBits = results => {
  let b = 0;
  for (let i = 0; i < 8; i++) b = (b << 2) | clampInt((results || [])[i] || 0, 0, 3);
  return b;
};
const resultsFromBits = b => { const r = []; for (let i = 7; i >= 0; i--) r.push((b >> (i * 2)) & 3); return r; };

// ── the file: { course, seed, form, injury, lastSport, seasons: { football, volleyball } } ──
// A season is the per-sport part of a career (SPORT_KEYS), or null when that sport hasn't started.

export function fileFromCareer(career, file = null) {
  const sport = career.sport === 'volleyball' ? 'volleyball' : 'football';
  const season = Object.fromEntries(SPORT_KEYS.map(k => [k, career[k]]));
  return {
    course: career.course,
    seed: career.seed,
    form: { ...career.form },
    injury: sport === 'football' ? (career.injury || null) : (file?.injury || null),
    lastSport: sport,
    seasons: { football: null, volleyball: null, ...(file?.seasons || {}), [sport]: season },
  };
}

// The career for one sport: its season, plus what the file shares (knowledge travels).
export function careerFromFile(file, sport = file.lastSport) {
  const season = file.seasons?.[sport];
  if (!season) return null;
  return {
    ...season, course: file.course, seed: file.seed, form: { ...file.form }, sport,
    injury: sport === 'football' ? (file.injury || null) : null,
  };
}

export function encodeSaveFile(file) {
  const values = {
    version: VERSION,
    course: COURSES.indexOf(file.course),
    seed: clampInt(file.seed, 0, 63),
    injury: injuryToBits(file.injury),
    reserved: 0,
    lastSport: file.lastSport === 'volleyball' ? 1 : 0,
  };
  for (const l of LANES) values[`form_${l}`] = clampInt(file.form?.[l], 0, 15);
  for (const sp of SPORTS) {
    const s = file.seasons?.[sp];
    if (!s) continue;
    values[`${sp}_started`] = 1;
    values[`${sp}_team`] = s.team;
    values[`${sp}_season`] = clampInt(s.season, 1, 16) - 1;
    values[`${sp}_phase`] = PHASES.indexOf(s.phase);
    values[`${sp}_week`] = clampInt(s.week, 0, 8);
    values[`${sp}_results`] = resultsToBits(s.results);
    values[`${sp}_playoffRound`] = clampInt(s.playoffRound, 0, 2);
    values[`${sp}_champ`] = s.champ ? 1 : 0;
    values[`${sp}_cash`] = clampInt(s.cash, 0, 31);
    values[`${sp}_security`] = clampInt(s.security, 0, 31);
    values[`${sp}_titles`] = clampInt(s.titles, 0, 3);
    values[`${sp}_practiceDone`] = s.practiceDone ? 1 : 0;
    for (const f of FACILITIES) values[`${sp}_fac_${f}`] = clampInt(s.facilities?.[f], 0, 2);
    for (const st of STATS) values[`${sp}_lvl_${st}`] = clampInt((s.levels?.[st] ?? 2) - 1, 0, 3);
  }
  return pack(FIELDS, values, DATA_CHARS);
}

// One career (the sport it belongs to) → a code that also keeps the other sport from `file`.
export function encodeSaveCode(career, file = null) {
  return encodeSaveFile(fileFromCareer(career, file));
}

export function normalizeSaveCode(input) {
  return String(input).toUpperCase().replace(/[\s-]/g, '').replace(/[IL]/g, '1').replace(/O/g, '0');
}

// Returns the file, or throws an Error whose message is safe to show a student.
export function decodeSaveFile(input) {
  const code = normalizeSaveCode(input);

  // A 22-character code is a v1 code from before Practice Week: say so plainly rather
  // than telling a student their own handwriting is wrong.
  if (code.length === 22)
    throw new Error('That code is from an earlier version of Review Bowl, before practice weeks. Start a new career.');
  const v2 = code.length === DATA_CHARS_V2 + CHECK_CHARS;
  if ((!v2 && code.length !== CODE_LENGTH) || [...code].some(c => !ALPHABET.includes(c)))
    throw new Error(`That doesn’t look like a Review Bowl code. Codes have ${CODE_LENGTH} letters and numbers.`);
  const nData = v2 ? DATA_CHARS_V2 : DATA_CHARS;
  const data = code.slice(0, nData);
  if (checksum(data) !== code.slice(nData))
    throw new Error('That code has a typo somewhere. Check each character against your worksheet.');

  const badTeam = () => new Error('That code doesn’t match any team in this league. Check it against your worksheet.');

  if (v2) {
    const v = unpack(FIELDS_V2, data);
    if (v.version !== 2) throw new Error('That code is from a different version of Review Bowl.');
    if (v.team >= TEAMS.length || v.phase >= PHASES.length) throw badTeam();
    const career = {
      course: COURSES[v.course], team: v.team, season: v.season + 1, phase: PHASES[v.phase], week: v.week,
      results: resultsFromBits(v.results), playoffRound: v.playoffRound, champ: !!v.champ, cash: v.cash,
      security: v.security,
      form: Object.fromEntries(LANES.map(l => [l, v[`form_${l}`]])),
      facilities: Object.fromEntries(FACILITIES.map(s => [s, v[`fac_${s}`]])),
      levels: Object.fromEntries(STATS.map(s => [s, v[`lvl_${s}`] + 1])),
      titles: v.titles, seed: v.seed, practiceDone: !!v.practiceDone,
      sport: v.sport ? 'volleyball' : 'football', injury: null,
    };
    return fileFromCareer(career);
  }

  const v = unpack(FIELDS, data);
  if (v.version !== VERSION) throw new Error('That code is from a different version of Review Bowl.');
  const seasons = {};
  for (const sp of SPORTS) {
    if (!v[`${sp}_started`]) { seasons[sp] = null; continue; }
    if (v[`${sp}_team`] >= TEAMS.length || v[`${sp}_phase`] >= PHASES.length) throw badTeam();
    seasons[sp] = {
      team: v[`${sp}_team`], season: v[`${sp}_season`] + 1, phase: PHASES[v[`${sp}_phase`]], week: v[`${sp}_week`],
      results: resultsFromBits(v[`${sp}_results`]), playoffRound: v[`${sp}_playoffRound`], champ: !!v[`${sp}_champ`],
      cash: v[`${sp}_cash`], security: v[`${sp}_security`],
      facilities: Object.fromEntries(FACILITIES.map(f => [f, v[`${sp}_fac_${f}`]])),
      levels: Object.fromEntries(STATS.map(s => [s, v[`${sp}_lvl_${s}`] + 1])),
      titles: v[`${sp}_titles`], practiceDone: !!v[`${sp}_practiceDone`],
    };
  }
  if (!seasons.football && !seasons.volleyball) throw badTeam();
  const lastSport = v.lastSport ? 'volleyball' : 'football';
  return {
    course: COURSES[v.course], seed: v.seed,
    form: Object.fromEntries(LANES.map(l => [l, v[`form_${l}`]])),
    injury: injuryFromBits(v.injury),
    lastSport: seasons[lastSport] ? lastSport : (seasons.football ? 'football' : 'volleyball'),
    seasons,
  };
}

// The career of the sport played last (what older callers and the tests expect).
export function decodeSaveCode(input) {
  const file = decodeSaveFile(input);
  return careerFromFile(file, file.lastSport);
}
