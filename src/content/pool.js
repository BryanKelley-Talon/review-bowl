// ============================================================
// THE POOL — every desk's file shape, read into one question shape.
//
// Sam and Will write the same kind of item four different ways. This file is the
// seam: it reads each shape as the desk wrote it and never asks a desk to reshape.
//
//   Will's MC        options: [..], correct_index, stimulus (text), document, source
//   Sam's MC         options: {"1": ..}, correct, stem, stimulus_refs (crops), citation, rationale
//   context stmt     options: {"1": ..}, correct, stem            (FULL-SPEC §2.3)
//   vocab            term, definition                             → pick the term for the definition
//   matching         left / right / correct / rationale           → one question per left tile
//   Arena stimulus   question, choices [{key,text}], correct      (so an Arena item pack drops in too)
//
// Carried through untouched, per the build order: `licence` (Will's per-item split)
// and `answer_verified` (Sam's six unverified keys). Nothing here decides what they
// mean for a sale; the game uses answer_verified to keep an unverified key from
// deciding a point (see rules.unverified_in_scoring_gates).
// ============================================================

const KEYS = ['1', '2', '3', '4']

// Deterministic per-item shuffle, so a vocab or matching question shows the same
// four options every time it is drawn (and a screenshot of it still makes sense).
function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
function seededShuffle(arr, seedStr) {
  const a = arr.slice()
  let s = hash(seedStr) || 1
  for (let i = a.length - 1; i > 0; i--) {
    s = Math.imul(s ^ (s >>> 15), 2246822519) >>> 0
    const j = s % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function hintsOf(item) {
  return Array.isArray(item?.hints) ? item.hints.filter(h => typeof h === 'string' && h.trim()).slice(0, 2) : []
}

// Four options from one right answer and a list of wrong ones. Keys are 1–4, the
// way the Regents numbers them.
function fourOptions(right, wrongs, seedStr) {
  const picks = seededShuffle(wrongs.filter(w => w && w !== right), seedStr + ':d').slice(0, 3)
  const all = seededShuffle([right, ...picks], seedStr + ':o')
  return {
    options: all.map((text, i) => ({ key: KEYS[i], text })),
    correct: KEYS[all.indexOf(right)],
  }
}

function base(pack, meta, extra) {
  return {
    lane: meta.lane,
    unit: meta.unit || null,
    file: meta.file,
    hints: [],
    rationale: null,
    licence: null,
    answerVerified: null,
    stimulus: null,
    ...extra,
  }
}

// ── the shapes ──────────────────────────────────────────────────────────────

function fromWillMc(pack, meta, it) {
  const options = (it.options || []).map((text, i) => ({ key: KEYS[i], text }))
  return base(pack, meta, {
    id: it.id,
    format: 'mc',
    prompt: it.prompt,
    stimulus: it.stimulus ? { text: it.stimulus, title: it.document || null, citation: it.source || null, images: [] } : null,
    options,
    correct: KEYS[it.correct_index],
    hints: hintsOf(it),
    // Will caught this 2026-09-27: his shape carries `rationale`; without it every Will MC item
    // failed the two-hints-and-a-reason rule however complete the file was.
    rationale: it.rationale || it.reason || null,
    licence: it.licence || null,
  })
}

function fromSamMc(pack, meta, it, crops) {
  const refs = it.stimulus_refs || []
  const images = []
  const held = []
  for (const ref of refs) {
    const c = crops?.[ref]
    if (c && c.status === 'served') images.push({ src: `content/${c.file}`, alt: c.alt || c.citation || it.citation || 'Source document' })
    else held.push(ref)
  }
  const options = Object.keys(it.options || {}).sort().map(k => ({ key: k, text: it.options[k] }))
  const q = base(pack, meta, {
    id: it.item_id || it.id,
    format: meta.lane === 'context' ? 'context' : 'mc',
    prompt: it.stem,
    stimulus: refs.length || it.citation ? { text: null, title: null, citation: it.citation || null, images } : null,
    options,
    correct: String(it.correct),
    hints: hintsOf(it),
    rationale: it.rationale ? String(it.rationale).replace(/^Correct=\(\d\)\.\s*/, '') : null,
    licence: it.licence || null,
    answerVerified: it.answer_verified === false ? false : (it.answer_verified === true ? true : null),
    administration: it.administration || null,
  })
  return { q, held }
}

function fromContext(pack, meta, it) {
  const options = Object.keys(it.options || {}).sort().map(k => ({ key: k, text: it.options[k] }))
  return base(pack, meta, {
    id: it.id,
    format: 'context',
    prompt: it.stem,
    options,
    correct: String(it.correct),
    // A one-line quote in a short item carries its source line (Sam, cp-07).
    stimulus: it.citation ? { text: null, title: null, citation: it.citation, images: [] } : null,
    hints: hintsOf(it),
    rationale: it.rationale || it.reason || null,
  })
}

function fromVocab(pack, meta, items) {
  const terms = items.map(t => t.term)
  return items.map((t, i) => {
    const id = `${meta.file}#${i}`
    const { options, correct } = fourOptions(t.term, terms, id)
    return base(pack, meta, {
      id,
      format: 'vocab',
      prompt: 'Which term matches this definition?',
      stimulus: { text: t.definition, title: null, citation: null, images: [], plain: true },
      options,
      correct,
      hints: hintsOf(t),
      rationale: `${t.term}: ${t.definition}`,
    })
  })
}

function fromMatching(pack, meta) {
  const right = pack.right || []
  const labelOf = key => (right.find(r => r.key === key) || {}).label
  return (pack.left || []).map(l => {
    const answer = labelOf(pack.correct?.[l.key])
    if (!answer) return null
    const id = `${meta.file}#${l.key}`
    const { options, correct } = fourOptions(answer, right.map(r => r.label), id)
    return base(pack, meta, {
      id,
      format: 'match',
      prompt: 'Which one goes with this?',
      stimulus: { text: l.label, title: null, citation: null, images: [], plain: true },
      options,
      correct,
      hints: hintsOf(l),
      rationale: pack.rationale?.[l.key] || null,
    })
  }).filter(Boolean)
}

// Will's scenario-question shape (`will-pass-2026-09-21-scenario-questions-founding-set1.json`):
//   { id, type: 'vocab' | 'move', term | move, prompt, resolution, hints }
// It was authored for Nation Builder's scenario questions — a type-the-answer format —
// so there are no options to show. The answer IS a term (or a skill move), and the file
// carries enough of them to build a real four-option question: the right one, plus three
// of its siblings. Lane comes per item from the pack's `lanes` map: vocabulary builds
// Speed, the skill moves build Toughness.
function fromScenarioTerm(pack, meta, items, kind) {
  const answers = items.map(it => it.term || it.move)
  return items.map((it, i) => {
    const answer = it.term || it.move
    const id = it.id || `${meta.file}#${kind}${i}`
    const { options, correct } = fourOptions(answer, answers, id)
    return base(pack, meta, {
      id,
      lane: (meta.lanes && meta.lanes[kind]) || meta.lane,
      format: kind === 'move' ? 'match' : 'vocab',
      prompt: it.prompt,
      options,
      correct,
      hints: hintsOf(it),
      rationale: it.resolution || null,
    })
  })
}

function fromArenaStimulus(pack, meta, it) {
  const s = it.stimulus || null
  return base(pack, meta, {
    id: it.item_id || `${meta.file}#${it.n}`,
    format: 'mc',
    prompt: it.question,
    stimulus: s ? { text: typeof s.content === 'string' ? s.content : null, title: s.caption || null,
                    citation: s.citation || null, images: [] } : null,
    options: (it.choices || []).map(c => ({ key: String(c.key), text: c.text })),
    correct: String(it.correct),
    hints: hintsOf(it),
    rationale: it.reasoning || null,
    // The "why not" line for each wrong choice (Arena/Office shape). Shown after a wrong
    // pick on culture questions (BK, 2026-09-28: "yes show it").
    whyNot: it.distractors && typeof it.distractors === 'object' ? it.distractors : null,
  })
}

// One pack → questions. Returns what was held back and why, so the content report
// can say so rather than a question silently vanishing.
export function readPack(pack, meta, crops) {
  const questions = []
  const held = []
  if (Array.isArray(pack.left) && Array.isArray(pack.right)) {
    questions.push(...fromMatching(pack, meta))
  } else if (Array.isArray(pack.items)) {
    const vocab = pack.items.filter(it => it && it.term && it.definition)
    if (vocab.length) questions.push(...fromVocab(pack, meta, vocab))
    // Scenario-question shape: grouped by type so each group supplies its own distractors.
    for (const kind of ['vocab', 'move']) {
      const group = pack.items.filter(it => it && it.prompt && (it.term || it.move) && !it.definition && !it.options && it.type === kind)
      if (group.length >= 2) questions.push(...fromScenarioTerm(pack, meta, group, kind))
      else for (const it of group) held.push({ id: it.id || '?', file: meta.file, reason: `only one ${kind} item — not enough for four options` })
    }
    for (const it of pack.items) {
      if (!it || (it.term && it.definition)) continue
      if (it.prompt && (it.term || it.move) && !it.options) continue          // handled above
      if (Array.isArray(it.options) && Number.isInteger(it.correct_index)) questions.push(fromWillMc(pack, meta, it))
      else if (it.options && typeof it.options === 'object' && it.stem && Array.isArray(it.stimulus_refs)) {
        const { q, held: h } = fromSamMc(pack, meta, it, crops)
        if (h.length) held.push({ id: q.id, file: meta.file, reason: `stimulus not cleared: ${h.join(', ')}` })
        else questions.push(q)
      }
      else if (it.options && typeof it.options === 'object' && it.stem) questions.push(fromContext(pack, meta, it))
      else if (Array.isArray(it.choices) && it.question) questions.push(fromArenaStimulus(pack, meta, it))
      else held.push({ id: it.id || it.item_id || '?', file: meta.file, reason: 'shape not recognised' })
    }
  }
  // A question the game cannot grade is not a question: exactly one right key, and it must exist.
  const ok = questions.filter(q => q.prompt && q.options.length >= 2 && q.options.some(o => o.key === q.correct))
  for (const q of questions) if (!ok.includes(q)) held.push({ id: q.id, file: meta.file, reason: 'no gradable answer key' })
  return { questions: ok, held }
}

// The whole door's pool.
// SHORT or LONG (BK, 2026-09-27: "keep the in game questions short… longer questions/docs going
// with off season, between games, bigger reward items"). A question is LONG when it carries a
// real document: an image, or a passage longer than short_cue_words. A definition
// or a one-line cue is not a document. It is also LONG when everything a student has to read
// (cue, prompt and options) runs past short_max_words. Everything else is SHORT, and only SHORT
// questions are asked in-game (dealer.js).
const wordsIn = s => (typeof s === 'string' ? s.trim().split(/\s+/).filter(Boolean).length : 0)
export function sizeOf(q, rules = {}) {
  const st = q.stimulus || {}
  const cue = wordsIn(st.text)
  // A citation alone is a source line under a one-line quote, not a document to read.
  const isDoc = !!((st.images && st.images.length) || cue > (rules.short_cue_words ?? 45))
  if (isDoc) return 'long'
  const words = cue + wordsIn(q.prompt) + (q.options || []).reduce((n, o) => n + wordsIn(o.text), 0)
  return words > (rules.short_max_words ?? 90) ? 'long' : 'short'
}

export function buildPool(manifest, courseId, packsByFile, crops) {
  const course = manifest.courses[courseId]
  const lanes = {}
  const held = []
  for (const lane of Object.keys(manifest.lanes).filter(k => !k.startsWith('_'))) lanes[lane] = []
  for (const meta of course.packs || []) {
    if (meta.enabled === false) continue
    const pack = packsByFile[meta.file]
    if (!pack) { held.push({ id: '—', file: meta.file, reason: 'pack did not load' }); continue }
    const r = readPack(pack, meta, crops)
    held.push(...r.held)
    for (const q of r.questions) {
      // The Arena's rule (CONVENTIONS §7, 2026-09-25): every question carries two hints and a
      // reason line. With require_hints_and_reason on, a question short of that is held back,
      // named in the content report, and comes back the day its author's words land.
      const rules = manifest.rules || {}
      if (rules.require_hints_and_reason && (q.hints.length < 2 || !q.rationale)) {
        held.push({ id: q.id, file: meta.file,
                    reason: [q.hints.length < 2 && 'needs two hints', !q.rationale && 'needs a reason line'].filter(Boolean).join(' and ') })
        continue
      }
      q.size = sizeOf(q, rules)
      ;(lanes[q.lane] || (lanes[q.lane] = [])).push(q)
    }
  }
  const culture = buildCulture(manifest, packsByFile)
  return { course: courseId, lanes, held, culture, podium: buildPodium(manifest, packsByFile),
           comeback: buildComeback(manifest, culture, packsByFile) }
}

// The Locker Room's questions (BK, 2026-09-27): the current Office theme's practice items,
// shared by both courses. They build the culture stat lane (Toughness) and never enter the
// content lanes, so no content gate ever draws one. The same two-hints-and-a-reason rule applies.
export function buildCulture(manifest, packsByFile) {
  const c = manifest.culture
  const out = []
  if (!c) return out
  for (const meta of c.packs || []) {
    if (meta.enabled === false) continue
    const pack = packsByFile[meta.file]
    const items = pack?.[meta.section || 'practice']?.items
    if (!Array.isArray(items)) continue
    const { questions } = readPack({ items }, { lane: c.stat_lane || 'skills', file: meta.file, unit: meta.month || null }, {})
    for (const q of questions) {
      if ((manifest.rules || {}).require_hints_and_reason && (q.hints.length < 2 || !q.rationale)) continue
      out.push({ ...q, culture: true, size: 'short' })
    }
  }
  return out
}

// The podium after a regular-season game (Leo's LOCKED set, BK 2026-09-29 12:35): 16
// questions, each marked `after: "win" | "loss"`. A tie draws from the loss set (the
// dealer decides that). Culture questions: they build the same stat lane as the Locker
// Room and show Leo's why-not lines. Choices keep the order they were written in.
export function buildPodium(manifest, packsByFile) {
  const meta = manifest.culture?.podium
  const pack = meta && packsByFile[meta.file]
  const out = []
  if (!Array.isArray(pack?.items)) return out
  for (const it of pack.items) {
    if (it.after !== 'win' && it.after !== 'loss') continue
    const { questions } = readPack({ items: [it] }, { lane: manifest.culture.stat_lane || 'skills', file: meta.file, unit: null }, {})
    const q = questions[0]
    if (!q) continue
    if ((manifest.rules || {}).require_hints_and_reason && (q.hints.length < 2 || !q.rationale)) continue
    out.push({ ...q, culture: true, size: 'short', after: it.after })
  }
  return out
}

// The football timeout's comeback set (BK 2026-10-03 23:43 "a culture question about adversity
// or perseverance"; words and mechanic approved 23:57). Two sources, both already approved:
// `ids` picks culture items already in the pool (Office and Unit 0, by file#n), and `packs` adds
// Leo's comeback files when they land (same item shape as an Office theme's practice items).
// Empty: the timeout falls back to the content draw it had before.
export function buildComeback(manifest, culture, packsByFile) {
  const c = manifest.culture?.comeback
  if (!c) return []
  const byId = Object.fromEntries(culture.map(q => [q.id, q]))
  const out = (c.ids || []).map(id => byId[id]).filter(Boolean)
  for (const meta of c.packs || []) {
    if (meta.enabled === false) continue
    const items = packsByFile[meta.file]?.[meta.section || 'practice']?.items
    if (!Array.isArray(items)) continue
    const { questions } = readPack({ items }, { lane: manifest.culture.stat_lane || 'skills', file: meta.file, unit: null }, {})
    for (const q of questions) {
      if ((manifest.rules || {}).require_hints_and_reason && (q.hints.length < 2 || !q.rationale)) continue
      out.push({ ...q, culture: true, size: 'short' })
    }
  }
  return out
}

// Everything the manifest points at for one door, fetched. Browser only.
export async function loadDoor(manifest, courseId) {
  const course = manifest.courses[courseId]
  const files = [...(course.packs || []).filter(p => p.enabled !== false).map(p => p.file),
                 ...(course.camp || []).map(c => c.file),
                 ...((manifest.culture?.packs) || []).filter(p => p.enabled !== false).map(p => p.file),
                 ...(manifest.culture?.podium?.file ? [manifest.culture.podium.file] : []),
                 ...((manifest.culture?.comeback?.packs) || []).filter(p => p.enabled !== false).map(p => p.file)]
  const packsByFile = {}
  await Promise.all(files.map(f => fetch(`/${f}`).then(r => r.ok ? r.json() : null)
    .then(d => { if (d) packsByFile[f] = d }).catch(() => {})))
  const crops = await fetch('/content/_crops.json').then(r => r.ok ? r.json() : { crops: {} })
    .then(d => d.crops || {}).catch(() => ({}))
  const pool = buildPool(manifest, courseId, packsByFile, crops)
  const camp = (course.camp || []).map(c => ({ ...c, pack: packsByFile[c.file] || null }))
  // Rehab packs for football injuries (2026-10-04): this course's pack (Sam's CLE for US, Will's EIE for Global).
  const rehabFiles = ((manifest.injuries?.rehab?.packs) || []).filter(p => p.enabled !== false && (!p.course || p.course === courseId)).map(p => p.file)
  const rehab = (await Promise.all(rehabFiles.map(f => fetch(`/${f}`).then(r => r.ok ? r.json() : null).catch(() => null))))
    .filter(Boolean)
  return { pool, camp, rehab }
}
