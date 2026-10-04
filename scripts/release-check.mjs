// Release check (Josh, 2026-10-04): run before a push to main. A passing test suite is not
// a release: this fails while anything a student would see is still a stand-in.
//   · the injury words are working labels until BK says yes (INJ_WORDS._approved)
//   · a rehab pack marked placeholder, or any PLACEHOLDER line in an enabled rehab pack
// A gate that passes is not a verdict: render it and look (CONVENTIONS §10).
import fs from 'node:fs'
import { INJ_WORDS, rehabSets } from '../src/game/injury.js'
import { SAVE_WORDS } from '../src/save/words.js'
const m = JSON.parse(fs.readFileSync('public/bowl.manifest.json', 'utf8'))
const errors = []
if (!SAVE_WORDS._approved) errors.push('the save-code words are working labels: BK has not approved them (SAVE_WORDS._approved in src/save/words.js)')
if (!INJ_WORDS._approved) errors.push('the injury and rehab words are working labels: BK has not approved them (INJ_WORDS._approved in src/game/injury.js)')
for (const p of m.injuries?.rehab?.packs || []) {
  if (p.enabled === false) continue
  if (p.placeholder) errors.push(`${p.file} is a placeholder rehab pack (Sam and Will write the real ones)`)
  const txt = fs.readFileSync(`public/${p.file}`, 'utf8')
  const n = (txt.match(/PLACEHOLDER/g) || []).length
  if (n) errors.push(`${p.file}: ${n} PLACEHOLDER lines`)
  const sets = rehabSets(JSON.parse(txt))
  if (!sets.length) errors.push(`${p.file}: no usable rehab set`)
  for (const st of sets) if (st.tasks.length < 3) errors.push(`${p.file}: set ${st.set} has ${st.tasks.length} usable levels, not 3`)
}
for (const course of ['us11r', 'global10r'])
  if (!(m.injuries?.rehab?.packs || []).some(p => p.enabled !== false && !p.placeholder && p.course === course))
    errors.push(`no rehab pack for ${course}, so an injured player there could only heal on schedule`)
errors.forEach(e => console.log('ERROR', e))
console.log(`\nrelease check: ${errors.length} errors`)
process.exit(errors.length ? 1 : 0)
