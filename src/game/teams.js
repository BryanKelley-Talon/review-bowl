// ============================================================
// TEAMS — BK's local roster, colors as he gave them (FULL-SPEC §5.2).
// Town and school names only, no mascots.
//
// PLAYERS ARE FAKE, ALWAYS (FULL-SPEC §5.3, non-negotiable). Every player name is
// assembled from two generic lists by a seeded generator — never typed in, never
// taken from a class list. A real student's name never appears on a public build.
// ============================================================

export const TEAMS = [
  { id: 'corning',    name: 'Corning',           abbr: 'COR', colors: ['#111111', '#C5B358'],            colorNames: 'Black / Vegas gold' },
  { id: 'elmira',     name: 'Elmira',            abbr: 'ELM', colors: ['#9E1B32', '#111111', '#FFFFFF'], colorNames: 'Crimson / black / white' },
  { id: 'horseheads', name: 'Horseheads',        abbr: 'HHD', colors: ['#0046BE', '#FFFFFF', '#8C9199'], colorNames: 'Best Buy blue / white / grey' },
  { id: 'binghamton', name: 'Binghamton',        abbr: 'BNG', colors: ['#C8102E', '#FFFFFF'],            colorNames: 'Red / white' },
  { id: 'ithaca',     name: 'Ithaca',            abbr: 'ITH', colors: ['#7A1F2B', '#FFCD00'],            colorNames: 'Maroon / yellow' },
  { id: 'cwest',      name: 'Corning West',      abbr: 'CWS', colors: ['#2F5233', '#FFFFFF'],            colorNames: 'Hunter green / white' },
  { id: 'ceast',      name: 'Corning East',      abbr: 'CEA', colors: ['#A6192E', '#FFFFFF'],            colorNames: 'Crimson / white' },
  { id: 'southside',  name: 'Southside',         abbr: 'STH', colors: ['#355E3B', '#FFFFFF'],            colorNames: 'Hunter green / white' },
  { id: 'efa',        name: 'EFA',               abbr: 'EFA', colors: ['#1B2A4A', '#FFFFFF'],            colorNames: 'Navy blue / white' },
  { id: 'notredame',  name: 'Elmira Notre Dame', abbr: 'END', colors: ['#14244B', '#E0B43A'],            colorNames: 'Navy blue / gold' },
]

// A green jersey vanishes on a green field, so green teams wear their white.
const GREENISH = c => { const [r, g, b] = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)); return g > r + 12 && g > b }
export function fieldKit(team) {
  const [a, b] = team.colors
  return GREENISH(a) ? { jersey: b, trim: a, zone: a } : { jersey: a, trim: b, zone: a }
}
// When both sides would wear the same jersey, the defense flips to its trim.
export function kits(offense, defense) {
  const o = fieldKit(offense)
  let d = fieldKit(defense)
  if (d.jersey.toLowerCase() === o.jersey.toLowerCase()) d = { ...d, jersey: d.trim, trim: d.jersey }
  if (d.jersey.toLowerCase() === o.jersey.toLowerCase()) d = { ...d, jersey: '#2A2A2A', trim: '#DDDDDD' }
  return { offense: o, defense: d }
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

export function player(seed, teamIndex, position, season, stars) {
  const r = rng(mix(seed, teamIndex, position.charCodeAt(0), position.charCodeAt(1), season, stars))
  const [lo, hi] = NUMBERS[position]
  return {
    name: `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`,
    number: lo + Math.floor(r() * (hi - lo + 1)),
    position,
    stars,
  }
}

// The key players, one per stat: QB throws, WR catches, RB runs, OL blocks, TE takes hits.
export const POSITION_OF = { throwing: 'QB', hands: 'WR', speed: 'RB', blocking: 'OL', toughness: 'TE' }

export function roster(seed, teamIndex, season, stars) {
  return Object.fromEntries(Object.entries(POSITION_OF).map(([stat, pos]) =>
    [stat, player(seed, teamIndex, pos, season, stars[stat] ?? 2)]))
}

// A team's hidden strength for a season (the opponents' "rating" in the engine and
// in simulated drives). Varies by season so the league is not the same every year.
export function teamStrength(seed, season, teamIndex) {
  const r = rng(mix(seed, season, teamIndex, 77))
  return 3 + Math.floor(r() * 5)          // 3..7
}
