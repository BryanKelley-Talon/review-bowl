// REVIEW DAY gate — the template's rules (flashpoint OUTPUTS/review-day/review-day-template-v1-README.md).
// npm run gate:review-day          checks every real unit file; sample files are listed and skipped
// npm run gate:review-day -- --ship also fails if the manifest still lists a sample (run before any push to main)
import fs from 'node:fs'
const dir = 'public/review-day'
const ship = process.argv.includes('--ship')
const m = JSON.parse(fs.readFileSync(`${dir}/manifest.json`, 'utf8'))
const fails = []; const notes = []
const empty = v => typeof v !== 'string' || !v.trim()
const DATE = /\b(Mon|Tue|Wed|Thu|Fri)(day)?\b[ ,]*\d{1,2}\/\d{1,2}|\b\d{1,2}\/\d{1,2}\/(20)?2\d\b/
if (m.lab) (ship ? fails : notes).push('manifest: "lab": true shows the draft modes')
for (const c of m.courses) for (const u of c.units) {
  const where = `${c.id} ${u.unit}`
  if (!u.file) { notes.push(`${where}: no unit file yet (Arena-content modes only)`); continue }
  if (!fs.existsSync(`${dir}/${u.file}`)) { fails.push(`${where}: file missing (${u.file})`); continue }
  const d = JSON.parse(fs.readFileSync(`${dir}/${u.file}`, 'utf8'))
  if (u.sample || d._sample) { (ship ? fails : notes).push(`${where}: SAMPLE file in the manifest`); continue }
  const text = JSON.stringify(Object.fromEntries(Object.entries(d).filter(([k]) => !k.startsWith('_'))))
  if (/Outside Evidence/i.test(text)) fails.push(`${where}: says "Outside Evidence" (it's Outside Information)`)
  if (DATE.test(text)) fails.push(`${where}: looks like a class date`)
  if (d.course !== c.id || d.unit !== u.unit) fails.push(`${where}: file says ${d.course} ${d.unit}`)
  if (!Array.isArray(d.board) || d.board.length !== 6) fails.push(`${where}: board needs 6 categories (has ${d.board?.length ?? 0})`)
  ;(d.board || []).forEach((cat, ci) => {
    if (empty(cat.category)) fails.push(`${where}: category ${ci + 1} has no name`)
    if (!Array.isArray(cat.clues) || cat.clues.length !== 5) fails.push(`${where}: "${cat.category}" needs 5 clues`)
    ;(cat.clues || []).forEach((k, i) => {
      const at = `${where}: "${cat.category}" clue ${i + 1}`
      for (const f of ['clue', 'answer', 'why']) if (empty(k[f])) fails.push(`${at}: no ${f}`)
      if (k.also && !Array.isArray(k.also)) fails.push(`${at}: also must be a list`)
      if (k.document) {
        if (empty(k.document.text)) fails.push(`${at}: document has no text`)
        if (empty(k.document.source)) fails.push(`${at}: document has no source line`)
        if (/\(adapted\)/i.test(k.document.source || '') ) fails.push(`${at}: put adapted: true, not "(adapted)" in the source`)
        if (typeof k.document.adapted !== 'boolean') fails.push(`${at}: document.adapted must be true or false`)
        if (empty(k.document._pointer)) fails.push(`${at}: document has no _pointer`)
      }
    })
  })
  // template v2 sections (drafts, 10/24 overnight): optional; checked only when present
  ;(d.detective || []).forEach((x, i) => { const at = `${where}: detective ${i + 1}`
    if (!x.document || empty(x.document.text) || empty(x.document.source)) fails.push(`${at}: needs a document with text and source`)
    if (!Array.isArray(x.questions) || x.questions.length !== 4) fails.push(`${at}: needs 4 questions`)
    ;(x.questions || []).forEach((q, j) => { if (empty(q.ask) || !Array.isArray(q.choices) || q.choices.length < 2 || !(q.answer >= 0 && q.answer < q.choices.length)) fails.push(`${at} q${j + 1}: needs ask, choices and an answer index`) }) })
  ;(d.who_am_i || []).forEach((x, i) => { if (empty(x.answer) || !Array.isArray(x.clues) || x.clues.length !== 4) fails.push(`${where}: who_am_i ${i + 1}: needs an answer and 4 clues`) })
  ;(d.odd_one_out || []).forEach((x, i) => { if (!Array.isArray(x.terms) || x.terms.length !== 4 || !(x.odd >= 0 && x.odd < 4) || empty(x.why)) fails.push(`${where}: odd_one_out ${i + 1}: needs 4 terms, odd 0-3 and why`) })
  ;(d.name_it || []).forEach((x, i) => { if (empty(x.prompt) || empty(x.answer)) fails.push(`${where}: name_it ${i + 1}: needs prompt and answer`) })
  if (!Array.isArray(d.top_answers) || d.top_answers.length !== 6) fails.push(`${where}: top_answers needs 6 lists (has ${d.top_answers?.length ?? 0})`)
  ;(d.top_answers || []).forEach((l, li) => {
    const at = `${where}: list ${li + 1}`
    if (empty(l.prompt)) fails.push(`${at}: no prompt`)
    if (!Array.isArray(l.answers) || l.answers.length < 4 || l.answers.length > 6) fails.push(`${at}: needs 4 to 6 answers`)
    ;(l.answers || []).forEach((a, ai) => { if (empty(a.text)) fails.push(`${at}: answer ${ai + 1} has no text`) })
    if (empty(l._ranked_by)) fails.push(`${at}: no _ranked_by`)
  })
}
for (const n of notes) console.log('note ·', n)
if (fails.length) { console.log(`REVIEW DAY gate: ${fails.length} fail`); for (const f of fails) console.log('FAIL ·', f); process.exit(1) }
console.log(`REVIEW DAY gate: 0 fail${ship ? ' (ship)' : ''}`)
