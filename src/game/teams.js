// ============================================================
// TEAMS — BK's local roster, colors as he gave them (FULL-SPEC §5.2).
// Town and school names only, no mascots.
//
// PLAYERS ARE FAKE, ALWAYS (FULL-SPEC §5.3, non-negotiable). Every player name is
// assembled from two generic lists by a seeded generator — never typed in, never
// taken from a class list. A real student's name never appears on a public build.
// ============================================================

export const TEAMS = [
  // Scoreboard codes and names as BK set them, 2026-09-28 13:23: CPP, ELM, WHS, EHS (Corning East), THS,
  // and Elmira Free Academy spelled out on its card (EFA on the scoreboard).
  // BK's twelve, with his colours: six modern schools and six legacy schools (BK, 2026-09-28).
  // ORDER IS LOCKED. A save code stores the team as its place in this list, so a team never
  // moves and a new team is only ever added at the end. `era` is BK's grouping; nothing shows it yet.
  //
  // BK's ten (2026-09-22), with his colours. `kit` is what they wear at home: jersey, helmet, pants.
  // `alt` is the change strip, worn when the home kit would clash with the other side or
  // vanish into the grass. Helmets and pants are separate from the jersey on purpose —
  // Binghamton's blue hat and blue pants are what keep their red readable (BK, 2026-09-22).
  { id: 'corning', name: 'Corning', abbr: 'CPP', era: 'modern', colors: ['#111111', '#C5B358'], colorNames: 'Black / Vegas gold',
    kit: { jersey: '#151515', helmet: '#C5B358', pants: '#C5B358' },
    alt: { jersey: '#C5B358', helmet: '#151515', pants: '#151515' } },

  // Elmira (ELM): black jersey, scarlet helmet and pants; a scarlet jersey is the change strip (BK, 2026-09-28).
  { id: 'elmira', name: 'Elmira', abbr: 'ELM', era: 'modern', colors: ['#141414', '#D9261C'], colorNames: 'Black / scarlet',
    kit: { jersey: '#141414', helmet: '#D9261C', pants: '#D9261C' },
    alt: { jersey: '#D9261C', helmet: '#D9261C', pants: '#141414' } },

  // "Best Buy blue" was BK's shorthand for the shade; the colour is just blue (BK, 2026-09-22).
  { id: 'horseheads', name: 'Horseheads', abbr: 'HHD', era: 'modern', colors: ['#1155CC', '#FFFFFF', '#8C9199'], colorNames: 'Blue / white / grey',
    kit: { jersey: '#1155CC', helmet: '#FFFFFF', pants: '#8C9199' },
    alt: { jersey: '#F2F2F2', helmet: '#1155CC', pants: '#1155CC' } },

  // Blue helmets and blue pants to offset the red jersey — BK's direction, 2026-09-22.
  { id: 'binghamton', name: 'Binghamton', abbr: 'BNG', era: 'modern', colors: ['#C8102E', '#1D3FA8', '#FFFFFF'], colorNames: 'Red / blue / white',
    kit: { jersey: '#C8102E', helmet: '#1D3FA8', pants: '#1D3FA8' },
    alt: { jersey: '#F2F2F2', helmet: '#1D3FA8', pants: '#C8102E' } },

  { id: 'ithaca', name: 'Ithaca', abbr: 'ITH', era: 'modern', colors: ['#7A1F2B', '#FFCD00'], colorNames: 'Maroon / yellow',
    kit: { jersey: '#7A1F2B', helmet: '#FFCD00', pants: '#FFCD00' },
    alt: { jersey: '#FFCD00', helmet: '#7A1F2B', pants: '#7A1F2B' } },

  // Corning West is the LIGHTER green, with a white helmet and white pants; Southside is the darker
  // hunter green, with green helmet and pants (BK, 2026-09-28). Both greens are chosen to stay
  // readable on the grass, and they are far enough apart that the two never need the grey strip.
  { id: 'cwest', name: 'Corning West', abbr: 'WHS', era: 'legacy', colors: ['#5DA36A', '#FFFFFF'], colorNames: 'Green / white',
    kit: { jersey: '#5DA36A', helmet: '#F2F2F2', pants: '#F2F2F2' },
    alt: { jersey: '#F2F2F2', helmet: '#F2F2F2', pants: '#5DA36A' } },

  // Darker crimson / maroon: maroon helmet and jersey, white pants (BK, 2026-09-28).
  { id: 'ceast', name: 'Corning East', abbr: 'EHS', era: 'legacy', colors: ['#6A1B2A', '#FFFFFF'], colorNames: 'Maroon / white',
    kit: { jersey: '#6A1B2A', helmet: '#6A1B2A', pants: '#F2F2F2' },
    alt: { jersey: '#F2F2F2', helmet: '#6A1B2A', pants: '#6A1B2A' } },

  { id: 'southside', name: 'Southside', abbr: 'SHS', era: 'legacy', colors: ['#2F5233', '#FFFFFF'], colorNames: 'Hunter green / white',
    kit: { jersey: '#2F5233', helmet: '#2F5233', pants: '#2F5233' },
    alt: { jersey: '#F2F2F2', helmet: '#2F5233', pants: '#2F5233' } },

  { id: 'efa', name: 'Elmira Free Academy', abbr: 'EFA', era: 'legacy', colors: ['#1B2A4A', '#FFFFFF'], colorNames: 'Navy blue / white',
    kit: { jersey: '#1B2A4A', helmet: '#F2F2F2', pants: '#F2F2F2' },
    alt: { jersey: '#F2F2F2', helmet: '#1B2A4A', pants: '#1B2A4A' } },

  { id: 'notredame', name: 'Elmira Notre Dame', abbr: 'ND', era: 'legacy', colors: ['#14244B', '#E0B43A'], colorNames: 'Navy blue / gold',
    kit: { jersey: '#14244B', helmet: '#E0B43A', pants: '#E0B43A' },
    alt: { jersey: '#E0B43A', helmet: '#14244B', pants: '#14244B' } },

  // Added 2026-09-28 (BK). Elmira Heights plays as Thomas A. Edison (TAE): orange jersey, blue helmet
  // and pants, the Broncos' '80s look.
  { id: 'heights', name: 'Elmira Heights', abbr: 'TAE', era: 'modern', colors: ['#FB4F14', '#1D3F8F'], colorNames: 'Orange / blue',
    kit: { jersey: '#FB4F14', helmet: '#1D3F8F', pants: '#1D3F8F' },
    alt: { jersey: '#F2F2F2', helmet: '#1D3F8F', pants: '#1D3F8F' },
    // Binghamton wears the same blue helmet and pants over a red jersey. Rendered side by side
    // (2026-09-28) the two read as one team at sprite size, worst for a red-green colour-blind
    // eye, so against Binghamton the Heights wear white.
    changeAgainst: ['binghamton'] },

  // Troy: bright red helmet and jersey, white pants; white jersey on the road.
  { id: 'troy', name: 'Troy', abbr: 'THS', era: 'legacy', colors: ['#E4002B', '#FFFFFF'], colorNames: 'Red / white',
    kit: { jersey: '#E4002B', helmet: '#E4002B', pants: '#F2F2F2' },
    alt: { jersey: '#F2F2F2', helmet: '#E4002B', pants: '#F2F2F2' } },
]

// ── telling two teams apart ─────────────────────────────────────────────────
// Two sides in similar colours is the one thing that makes a pixel field unreadable,
// and "are these the same colour?" is not a string comparison — Corning's black and
// EFA's navy are different hex and the same jersey at this size. So compare perceptually
// (redmean, close enough to how an eye weighs red/green/blue) and give every team a
// change strip to fall back to.
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))

export function colorDistance(a, b) {
  const [r1, g1, b1] = rgb(a), [r2, g2, b2] = rgb(b)
  const rm = (r1 + r2) / 2
  return Math.sqrt((2 + rm / 256) * (r1 - r2) ** 2 + 4 * (g1 - g2) ** 2 + (2 + (255 - rm) / 256) * (b1 - b2) ** 2)
}

// Two thresholds, because they are two different jobs: telling the sides apart from each
// other is a stricter test than telling a jersey from the grass. Black v navy measures 97,
// which is why CLASH sits above it — at this sprite size they are the same shirt.
export const CLASH = 115         // jerseys closer than this read as the same team
export const GRASS_MIN = 85      // jerseys closer than this to the turf disappear into it
const GRASS = ['#3B8A38', '#357F33']
const CLASH_KIT = { jersey: '#2B2F36', helmet: '#F2F2F2', pants: '#F2F2F2' }   // last resort

// Red-green colour blindness (about one boy in twelve) folds red, maroon and orange together.
// Two jerseys must also stay apart as a deuteranope and a protanope see them (Machado 2009
// matrices, full severity). Red v maroon measures about 10 here: one shirt (2026-09-28).
const CVD = {
  deut: [[0.367, 0.861, -0.228], [0.280, 0.673, 0.047], [-0.012, 0.043, 0.969]],
  prot: [[0.152, 1.053, -0.205], [0.115, 0.786, 0.099], [-0.004, -0.048, 1.052]],
}
const toHex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
const seenAs = (hex, m) => { const c = rgb(hex); return toHex(CVD[m].map(r => r[0] * c[0] + r[1] * c[1] + r[2] * c[2])) }
export function cvdDistance(a, b) {
  return Math.min(...Object.keys(CVD).map(m => colorDistance(seenAs(a, m), seenAs(b, m))))
}
export const CVD_CLASH = 40      // below this, a colour-blind kid sees one team
export const apart = (a, b) => colorDistance(a, b) > CLASH && cvdDistance(a, b) > CVD_CLASH

const readableOnGrass = kit => GRASS.every(g => colorDistance(kit.jersey, g) > GRASS_MIN)
// A team with `changeAgainst` skips its home strip when it meets one of those teams.
const strips = (team, other) => [team.kit, team.alt, CLASH_KIT]
  .filter((k, i) => !(i === 0 && (team.changeAgainst || []).includes(other.id)))

// The home side wears the first strip that does not vanish into the grass; the away side
// wears the first that also reads clearly against what the home side is wearing.
export function kits(offense, defense) {
  const o = strips(offense, defense).find(readableOnGrass) || CLASH_KIT
  const d = strips(defense, offense).find(k => readableOnGrass(k) && apart(k.jersey, o.jersey)) || CLASH_KIT
  return {
    offense: { ...o, zone: offense.colors[0] },
    defense: { ...d, zone: defense.colors[0] },
  }
}

// Kept for the team-select swatches and anywhere else that wants one team's own look.
export function fieldKit(team) {
  const kit = [team.kit, team.alt, CLASH_KIT].find(readableOnGrass) || CLASH_KIT
  return { ...kit, zone: team.colors[0] }
}

// ── seeded randomness ────────────────────────────────────────────────────────
export function rng(seed) {
  let a = (seed >>> 0) || 0x9e3779b9
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export const mix = (...n) => n.reduce((h, x) => Math.imul(h ^ (x >>> 0), 2654435761) >>> 0, 0x811c9dc5)

// ── fake players ─────────────────────────────────────────────────────────────
const FIRST = ['Dale', 'Marcus', 'Trey', 'Owen', 'Jalen', 'Caleb', 'Reggie', 'Tyler', 'Andre', 'Wes', 'Brody',
  'Nate', 'Darius', 'Colt', 'Isaiah', 'Mason', 'Terrell', 'Grady', 'Luis', 'Deshawn', 'Hank', 'Micah', 'Rory',
  'Jaylen', 'Quinn', 'Emmett', 'Tobias', 'Cole', 'Xavier', 'Beau', 'Dante', 'Silas', 'Keenan', 'Rhett', 'Ellis',
  'Malik', 'Gus', 'Carter', 'Roman', 'Tate']
const LAST = ['Hollis', 'Barnes', 'Whitaker', 'Pruitt', 'Okafor', 'Delaney', 'Crane', 'Mercer', 'Tolliver',
  'Vance', 'Ruiz', 'Stroud', 'Kessler', 'Abernathy', 'Fontaine', 'Gaines', 'Holloway', 'Iverson', 'Jessup',
  'Kincaid', 'Larkin', 'Maddox', 'Nolan', 'Pickett', 'Quarles', 'Rourke', 'Sutter', 'Thibodeaux', 'Underhill',
  'Voss', 'Wendell', 'Yates', 'Zeller', 'Ashby', 'Burrell', 'Colvin', 'Dunmore', 'Everly', 'Farrow', 'Gentry']
const NUMBERS = { QB: [1, 19], WR: [80, 89], RB: [20, 39], OL: [60, 79], TE: [40, 49] }

// A player's NAME and NUMBER are seeded by team, position and season only — never by
// his level. Training him raises the level; it must not turn him into a different kid.
// A free agent signed in the off-season is generated at season + 1, which is exactly
// the name next season's roster will show for that position: you signed him, he's yours.
export function player(seed, teamIndex, position, season, level) {
  const r = rng(mix(seed, teamIndex, position.charCodeAt(0), position.charCodeAt(1), season))
  const [lo, hi] = NUMBERS[position]
  return {
    name: `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`,
    number: lo + Math.floor(r() * (hi - lo + 1)),
    position,
    level,
  }
}

// The key players, one per stat: QB throws, WR catches, RB runs, OL blocks, TE takes hits.
export const POSITION_OF = { throwing: 'QB', hands: 'WR', speed: 'RB', blocking: 'OL', toughness: 'TE' }

export function roster(seed, teamIndex, season, levels) {
  // Five starters on one screen: nudge a repeated first name along the list rather than
  // fielding two players called Trey. Identity still depends only on team/position/season.
  const used = new Set()
  return Object.fromEntries(Object.entries(POSITION_OF).map(([stat, pos]) => {
    const p = player(seed, teamIndex, pos, season, levels?.[stat] ?? 2)
    let first = p.name.split(' ')[0]
    if (used.has(first)) {
      const i = FIRST.indexOf(first)
      for (let n = 1; n <= FIRST.length; n++) {
        const alt = FIRST[(i + n * 7) % FIRST.length]
        if (!used.has(alt)) { first = alt; break }
      }
      p.name = `${first} ${p.name.split(' ').slice(1).join(' ')}`
    }
    used.add(first)
    return [stat, p]
  }))
}

// A team's hidden strength for a season (the opponents' "rating" in the engine and
// in simulated drives). Varies by season so the league is not the same every year.
export function teamStrength(seed, season, teamIndex) {
  const r = rng(mix(seed, season, teamIndex, 77))
  return 3 + Math.floor(r() * 5)          // 3..7
}
