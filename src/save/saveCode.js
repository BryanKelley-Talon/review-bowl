/* Skills Review Bowl (Flashpoint History), 2026.
 *
 * The save code: a short, typeable record of a whole career. It fits on a worksheet and a teacher can read it
 * back. Adapted from Nation Builder's saveCode.js (builds/nation-builder/src/nb/saveCode.js) — same alphabet, same
 * checksum, same forgiving decoder, same student-safe error messages. What changed is the payload: Nation Builder's
 * code cannot hold a city, so it is a checkpoint beside a city file. A football career is small enough that the code
 * IS the save — every field is stored exactly, and entering the code restores the career as it was.
 *
 * Layout: 21 data characters + 2 check characters, Crockford base32, shown as XXXX-XXXX-XXXX-XXXX-XXXX-XXX.
 * Crockford's alphabet has no I, L, O or U, and decoding reads I/L as 1 and O as 0, so misread letters still work.
 *
 * Data bits (105, most significant first):
 *   version 3 · course 1 · team 4 · season 4 · phase 3 · week 4 · results 16 (8 games × 2) · playoff round 2 ·
 *   champion 1 · cash 5 · job security 5 · form 6×4 (five lanes + defense) · facilities 6×2 · player levels 5×2 ·
 *   titles 2 · seed 6 · practice-done 1 · spare 2
 *
 * Nothing in it identifies a student: no name, no school, no answers — only the team's state.
 */

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
// VERSION 2 (v3 iteration): Defense became a real trainable stat with its own form and
// facility, Practice Week added a phase and a per-week flag, and "stars" became player
// LEVELS. Those are new fields, so v1 codes cannot be read — a code written during the
// first playtest will be refused with the version message rather than silently misread.
const VERSION = 2;

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
  ['titles', 2], ['seed', 6], ['practiceDone', 1], ['spare', 2],
];

const DATA_CHARS = 21;
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
    spare: 0,
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
  if (code.length !== DATA_CHARS + CHECK_CHARS || [...code].some(c => !ALPHABET.includes(c)))
    throw new Error('That doesn’t look like a Review Bowl code. Codes have 23 letters and numbers.');

  const data = code.slice(0, DATA_CHARS);
  if (checksum(data) !== code.slice(DATA_CHARS))
    throw new Error('That code has a typo somewhere. Check each character against your worksheet.');

  let bits = 0n;
  for (const c of data)
    bits = (bits << 5n) | BigInt(ALPHABET.indexOf(c));

  const values = {};
  for (let i = FIELDS.length - 1; i >= 0; i--) {
    const [name, width] = FIELDS[i];
    values[name] = Number(bits & ((1n << BigInt(width)) - 1n));
    bits >>= BigInt(width);
  }

  if (values.version !== VERSION)
    throw new Error('That code is from a different version of Review Bowl.');
  if (values.team > 9 || values.phase >= PHASES.length)
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
  };
}
