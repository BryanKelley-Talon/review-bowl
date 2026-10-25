// REVIEW DAY sample files, for preview links only (BK 2026-10-24 22:35: "placeholders instead of content is fine").
// Global's first two categories reuse the live 10.2 checkpoint set (Will's words, Danny-cleared, already in this repo),
// field for field. Everything else is a marked placeholder; Josh writes no content. The template v2 sections
// (detective, who_am_i, odd_one_out, name_it) are SAMPLE placeholders too (overnight build, 10/24).
// These files never ship: the ship gate fails while the manifest lists a sample or has "lab": true.
import fs from 'node:fs'
const out = 'public/review-day'
const cp = JSON.parse(fs.readFileSync('public/content/station-gs10r-10.2-checkpoint-practice.json', 'utf8'))
const fromItem = it => ({
  clue: it.prompt, answer: it.options[it.correct_index], also: [], why: it.rationale,
  document: { text: it.stimulus, source: it.source.replace(/\s*\(adapted\)\s*/i, '').trim(), adapted: /\(adapted\)/i.test(it.source), _pointer: `review-bowl public/content/station-gs10r-10.2-checkpoint-practice.json ${it.id}` },
})
const ph = (c, i) => ({ clue: `Sample clue for category ${c}, square ${i + 1}. Sam or Will writes the real one.`, answer: `Sample answer ${c}.${i + 1}`, also: ['another answer the teacher would take'], why: 'The one-line reason shows here after the reveal.' })
const phCat = c => ({ category: `Sample category ${c}`, clues: [0, 1, 2, 3, 4].map(i => ph(c, i)) })
const phLists = () => Array.from({ length: 6 }, (_, k) => ({
  prompt: `Sample list ${k + 1}: name one … (the desk writes this prompt)`,
  answers: Array.from({ length: k % 2 ? 6 : 4 }, (_, r) => ({ text: `Sample answer #${r + 1}`, also: [] })),
  _ranked_by: 'sample',
}))
const v2 = tag => ({
  detective: [1, 2, 3].map(d => ({
    document: { text: `Sample document ${d}. The desk puts a real document here, with its source line.`, source: `Sample source line ${d}`, adapted: false, _pointer: 'sample' },
    questions: ['Who made it?', 'Who was it for?', 'Why was it made?', 'What was going on when it was made?'].map((ask, q) => ({
      ask: `Sample: ${ask}`, choices: ['Sample choice A', 'Sample choice B', 'Sample choice C', 'Sample choice D'], answer: (d + q) % 4, why: 'The one-line reason shows here.',
    })),
  })),
  who_am_i: [1, 2, 3, 4].map(w => ({
    answer: `Sample person ${w}`, also: [], why: 'The one-line reason shows here.',
    clues: [`Sample clue 1 (hardest) for person ${w}.`, `Sample clue 2 for person ${w}.`, `Sample clue 3 for person ${w}.`, `Sample clue 4 (easiest) for person ${w}.`],
  })),
  odd_one_out: [1, 2, 3, 4, 5].map(o => ({ terms: [`Sample term ${o}A`, `Sample term ${o}B`, `Sample term ${o}C`, `Sample term ${o}D`], odd: o % 4, why: 'Why the odd one is odd shows here.' })),
  ...(tag === 'us' ? { name_it: [1, 2, 3, 4, 5, 6].map(n => ({ prompt: `Sample event ${n}. The desk describes an event or a situation here.`, answer: 'Sample principle (card words)', also: [], why: 'The one-line reason shows here.' })) } : {}),
})
const global = {
  _sample: true, course: 'gs10r', unit: 'SAMPLE', unit_title: 'Sample, not for class',
  board: [
    { category: '10.2 checkpoint, part 1', clues: cp.items.slice(0, 5).map(fromItem) },
    { category: '10.2 checkpoint, part 2', clues: cp.items.slice(5, 10).map(fromItem) },
    ...[3, 4, 5, 6].map(phCat),
  ],
  top_answers: phLists(), ...v2('gl'), _licence: cp._licence,
}
const us = { _sample: true, course: 'us11r', unit: 'SAMPLE', unit_title: 'Sample, not for class', board: [1, 2, 3, 4, 5, 6].map(phCat), top_answers: phLists(), ...v2('us') }
const us2 = { ...us, unit: 'SAMPLE-2', unit_title: 'Second sample unit, to try the picker', board: [7, 8, 9, 10, 11, 12].map(phCat) }
fs.writeFileSync(`${out}/review-gs10r-SAMPLE.json`, JSON.stringify(global, null, 1))
fs.writeFileSync(`${out}/review-us11r-SAMPLE.json`, JSON.stringify(us, null, 1))
fs.writeFileSync(`${out}/review-us11r-SAMPLE-2.json`, JSON.stringify(us2, null, 1))
console.log('samples written')
