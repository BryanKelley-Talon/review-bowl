// ============================================================
// SKILLS REVIEW BOWL — content staging.  `npm run stage`
//
// Copies the content packs the game reads into public/content/, and gates every
// stimulus crop before it is served. Re-run it whenever Sam or Will send more:
// add the file to PACKS below (or to the manifest), run, rebuild.
//
// WHAT THIS SCRIPT NEVER DOES:
//   • edit a desk's file — it copies, it never moves and never rewrites content
//   • serve a crop that has not passed its gate
//   • author anything — content belongs to the authoring desks
//
// THE CROP GATE (same rule the Arena's README-WHY-ONLY-JSON.md sets):
//   a crop is served only if a crop manifest on the owning desk names it
//   individually with `blessed === true` — tested strictly, not by truthiness,
//   and not inherited from a file-level blessing that names other crops.
//   Anything else is HELD, and every item built on a held crop stays out of the
//   question pool (an item that cannot show its source is not asked).
// ============================================================
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const BUILD = path.resolve(HERE, '..')
const DESK = path.resolve(BUILD, '../..')                 // Project Flashpoint (Josh)
const COWORK = path.resolve(DESK, '../..')                // Cowork parent
const OUT = path.join(BUILD, 'public/content')
const OUT_CROPS = path.join(OUT, 'stimulus')

const IN = p => path.join(DESK, 'In', p)
// Authors' own shelves (house rules 2026-09-26: Josh pulls from the desks; In/ is for orders and
// passes, and spent passes are archived, so a pack must not live only in In/).
const SAM = p => path.join(COWORK, 'us11r-curriculum', p)
// Staged copies whose only desk-level source was a pass in In/, archived in the 2026-09-26
// sweep. The staged file in public/content (git-tracked) IS the record now; when the author
// sends a new version, point its line at the author's OUTPUTS/ and it re-stages.
const KEPT = p => path.join(OUT, p)
const ARENA = p => path.join(DESK, 'builds/thearena/public/content', p)

// Every pack the manifest may point at, and where it is copied from.
const PACKS = [
  // Global 10R — Will
  [KEPT('station-gs10r-10.1-partI-mc.json'), 'station-gs10r-10.1-partI-mc.json'],
  [KEPT('station-gs10r-10.2-checkpoint-practice.json'), 'station-gs10r-10.2-checkpoint-practice.json'],
  [ARENA('matching-gs10r-10-1.json'), 'matching-gs10r-10-1.json'],
  [KEPT('scenario-questions-gs10r-founding-set1.json'), 'scenario-questions-gs10r-founding-set1.json'],
  // US 11R — Sam
  [KEPT('partI-mc-us11r-unit01.json'), 'partI-mc-us11r-unit01.json'],
  [ARENA('matching-us11r-11.1-foundation-01-contextualization.json'), 'matching-us11r-11.1-foundation-01-contextualization.json'],
  [ARENA('matching-us11r-11.1-foundation-02-causation.json'), 'matching-us11r-11.1-foundation-02-causation.json'],
  [ARENA('matching-us11r-11.1-foundation-03-continuity-change.json'), 'matching-us11r-11.1-foundation-03-continuity-change.json'],
  [ARENA('matching-us11r-11.1-foundation-04-turning-points.json'), 'matching-us11r-11.1-foundation-04-turning-points.json'],
  [KEPT('vocab-us11r-11.1-content.json'), 'vocab-us11r-11.1-content.json'],
  [KEPT('vocab-us11r-reading-taskwords.json'), 'vocab-us11r-reading-taskwords.json'],
  [ARENA('context-statements-us11r-11.1.json'), 'context-statements-us11r-11.1.json'],
  [KEPT('matching-us11r-vocab-six-skills.json'), 'matching-us11r-vocab-six-skills.json'],
  [SAM('DRILL_PACKAGES/arena/matching-us11r-11.1-vocab-civic-principles.json'), 'matching-us11r-11.1-vocab-civic-principles.json'],
  // Circuit packs, repurposed for the off-season training camp (FULL-SPEC §5.4).
  // Only drills the Arena manifest itself publishes.
  [ARENA('station-01-contextualization.json'), 'station-01-contextualization.json'],
  [ARENA('station-08-argument-development.json'), 'station-08-argument-development.json'],
  [ARENA('station-05-sourcing-hipp.json'), 'station-05-sourcing-hipp.json'],
  [ARENA('station-06-opvl.json'), 'station-06-opvl.json'],
  [ARENA('station-gs10r-historical-context.json'), 'station-gs10r-historical-context.json'],
  [ARENA('station-gs10r-document-use.json'), 'station-gs10r-document-use.json'],
  [ARENA('station-10-enduring-issues.json'), 'station-10-enduring-issues.json'],
]

// Where each desk keeps its crops and the manifests that bless them.
const CROP_BANKS = {
  us11r: {
    dir: path.join(COWORK, 'us11r-curriculum/STIMULUS_BANK'),
    manifests: dir => fs.readdirSync(dir).filter(f => /^_crop_manifest_.*\.json$/.test(f)).map(f => path.join(dir, f)),
  },
}

// ── BK's named override, 2026-09-22 ─────────────────────────────────────────
// The gate held `unit01-0626-mc01-lancaster-1744.png` in the first pass: Sam's cover
// note said his crops were blessed, but that crop's own manifest record carries no
// `blessed: true` (only a file-level blessing naming other crops). Flagged to BK, and
// BK ruled: "his crops are blessed..use them."
// This is a NAMED EXCEPTION for that one file, not a change to the gate. The gate below
// is untouched and still governs every other crop, including any Sam sends tomorrow.
const BK_OVERRIDE = {
  'unit01-0626-mc01-lancaster-1744': 'BK, 2026-09-22: "his crops are blessed..use them." Named exception to the per-crop gate.',
}

fs.mkdirSync(OUT_CROPS, { recursive: true })

// ── 1 · packs ────────────────────────────────────────────────────────────────
const copied = []
for (const [src, name] of PACKS) {
  if (!fs.existsSync(src)) { console.warn(`MISSING  ${src}`); continue }
  if (path.resolve(src) === path.resolve(path.join(OUT, name))) { copied.push(name); continue }   // KEPT: already staged
  JSON.parse(fs.readFileSync(src, 'utf8'))               // refuse to stage a pack that does not parse
  fs.copyFileSync(src, path.join(OUT, name))
  fs.chmodSync(path.join(OUT, name), 0o644)             // some desk files are owner-only; the site must read them
  copied.push(name)
}
console.log(`packs    ${copied.length} of ${PACKS.length} staged`)

// ── 2 · crops ────────────────────────────────────────────────────────────────
// Index every crop record on the owning desk by slug. A slug can appear in more
// than one manifest; it is blessed if ANY record naming it says blessed === true.
function cropIndex(bank) {
  const index = {}
  for (const file of bank.manifests(bank.dir)) {
    let data
    try { data = JSON.parse(fs.readFileSync(file, 'utf8')) } catch { continue }
    const records = [...(data.stimuli || []), ...(data.new_crops || [])]
    for (const r of records) {
      if (!r || !r.slug) continue
      const prev = index[r.slug] || { blessed: false, alt: null, citation: null, file: null, manifests: [] }
      index[r.slug] = {
        blessed: prev.blessed || r.blessed === true,
        alt: prev.alt || r.image_alt || r.alt || null,
        citation: prev.citation || r.citation || null,
        file: prev.file || r.file || null,
        manifests: [...prev.manifests, path.basename(file)],
      }
    }
  }
  return index
}

const wanted = new Set()
for (const name of copied) {
  const pack = JSON.parse(fs.readFileSync(path.join(OUT, name), 'utf8'))
  for (const it of pack.items || []) for (const ref of it.stimulus_refs || []) wanted.add(ref)
}

const bank = CROP_BANKS.us11r
const index = fs.existsSync(bank.dir) ? cropIndex(bank) : {}
const report = {}
for (const ref of [...wanted].sort()) {
  const slug = ref.replace(/\.(png|jpe?g|webp)$/i, '')
  const rec = index[slug]
  const src = rec && rec.file ? path.join(bank.dir, rec.file) : null
  const override = BK_OVERRIDE[slug]
  if (!rec) { report[ref] = { status: 'held', reason: 'named in no crop manifest on the owning desk' }; continue }
  if (!rec.blessed && !override) {
    report[ref] = { status: 'held', reason: `no record sets blessed === true for this crop (${rec.manifests.join(', ')})`,
                    citation: rec.citation }
    continue
  }
  if (!src || !fs.existsSync(src)) { report[ref] = { status: 'held', reason: 'blessed, but the file is not on disk' }; continue }
  const out = `${slug}.webp`
  // School-wifi weight rule: WebP, capped width. Text crops stay readable at 1100px.
  execFileSync('cwebp', ['-quiet', '-q', '82', '-resize', '1100', '0', src, '-o', path.join(OUT_CROPS, out)])
  report[ref] = { status: 'served', file: `stimulus/${out}`, alt: rec.alt, citation: rec.citation,
                  served_by: rec.blessed ? 'per-crop blessing' : 'BK override',
                  override: override || null,
                  alt_note: rec.alt ? null : 'image_alt not yet written on the owning desk — citation used as alt text' }
}
fs.writeFileSync(path.join(OUT, '_crops.json'), JSON.stringify({
  _README: 'Written by scripts/stage-content.mjs. One row per stimulus crop the packs reference. ' +
           'status "served" = passed the per-crop gate and copied as WebP; "held" = not served, and every item ' +
           'built on it is kept out of the question pool. Do not hand-edit — re-run npm run stage.',
  staged: new Date().toISOString(),
  crops: report,
}, null, 2))

// Camp reps (Circuit packs) point at images by image_ref. Only an image the Arena
// ALREADY serves — i.e. one that cleared the Arena's own gate and sits in its public
// content — is carried over. Anything else renders as the labelled placeholder.
const campImages = new Set()
for (const name of copied.filter(n => n.startsWith('station-') && !n.includes('partI') && !n.includes('checkpoint'))) {
  const pack = JSON.parse(fs.readFileSync(path.join(OUT, name), 'utf8'))
  for (const rep of pack.reps || []) for (const d of rep.stimulus || []) if (d.image_ref) campImages.add(d.image_ref)
}
for (const ref of campImages) {
  const src = ARENA(ref)
  if (fs.existsSync(src)) { fs.copyFileSync(src, path.join(OUT, ref)); fs.chmodSync(path.join(OUT, ref), 0o644); console.log(`camp img served (Arena already serves it): ${ref}`) }
  else console.log(`camp img HELD (not served by the Arena): ${ref}`)
}

const served = Object.values(report).filter(r => r.status === 'served').length
console.log(`crops    ${served} served, ${Object.keys(report).length - served} held`)
for (const [ref, r] of Object.entries(report)) if (r.status === 'held') console.log(`  HELD   ${ref} — ${r.reason}`)
const bytes = fs.readdirSync(OUT_CROPS).reduce((n, f) => n + fs.statSync(path.join(OUT_CROPS, f)).size, 0)
console.log(`weight   ${(bytes / 1024).toFixed(0)} KB of crops`)
