// REVIEW DAY sample files, for the preview link only (BK 2026-10-24 22:35: "placeholders instead of content is fine...i just want to get a feel").
// Global's first two categories reuse the live 10.2 checkpoint set (Will's words, Danny-cleared, already in this repo), field for field:
// prompt → clue, the right option → answer, rationale → why, stimulus + source → document. Nothing is reworded.
// Everything else is a marked placeholder. Josh writes no content. These files never ship: the ship gate fails on them.
import fs from 'node:fs'
const out = 'public/review-day'
const cp = JSON.parse(fs.readFileSync('public/content/station-gs10r-10.2-checkpoint-practice.json', 'utf8'))
const fromItem = it => ({
  clue: it.prompt,
  answer: it.options[it.correct_index],
  also: [],
  why: it.rationale,
  document: { text: it.stimulus, source: it.source.replace(/\s*\(adapted\)\s*/i, '').trim(), adapted: /\(adapted\)/i.test(it.source), _pointer: `review-bowl public/content/station-gs10r-10.2-checkpoint-practice.json ${it.id}` },
})
const ph = (c, i) => ({ clue: `Sample clue for category ${c}, square ${i + 1}. Sam or Will writes the real one.`, answer: `Sample answer ${c}.${i + 1}`, also: ['another answer the teacher would take'], why: 'The one-line reason shows here after the reveal.' })
const phCat = c => ({ category: `Sample category ${c}`, clues: [0, 1, 2, 3, 4].map(i => ph(c, i)) })
const phLists = n => Array.from({ length: 6 }, (_, k) => ({
  prompt: `Sample list ${k + 1}: name one … (the desk writes this prompt)`,
  answers: Array.from({ length: k % 2 ? 6 : 4 }, (_, r) => ({ text: `Sample answer #${r + 1}`, also: [] })),
  _ranked_by: 'sample',
}))
const global = {
  _sample: true, course: 'gs10r', unit: 'SAMPLE', unit_title: 'Sample, not for class',
  board: [
    { category: '10.2 checkpoint, part 1', clues: cp.items.slice(0, 5).map(fromItem) },
    { category: '10.2 checkpoint, part 2', clues: cp.items.slice(5, 10).map(fromItem) },
    ...[3, 4, 5, 6].map(phCat),
  ],
  top_answers: phLists(),
  _licence: cp._licence,
}
const us = { _sample: true, course: 'us11r', unit: 'SAMPLE', unit_title: 'Sample, not for class', board: [1, 2, 3, 4, 5, 6].map(phCat), top_answers: phLists() }
const us2 = { ...us, unit: 'SAMPLE-2', unit_title: 'Second sample unit, to try the picker', board: [7, 8, 9, 10, 11, 12].map(phCat) }
fs.writeFileSync(`${out}/review-gs10r-SAMPLE.json`, JSON.stringify(global, null, 1))
fs.writeFileSync(`${out}/review-us11r-SAMPLE.json`, JSON.stringify(us, null, 1))
fs.writeFileSync(`${out}/review-us11r-SAMPLE-2.json`, JSON.stringify(us2, null, 1))
console.log('samples written')
