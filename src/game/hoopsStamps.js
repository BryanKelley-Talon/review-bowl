// ============================================================
// HAND-PIXELED PIECES for Review Bowl basketball (BK 2026-10-31 20:03: "I want the best art u can do").
// The skeleton (hoops.js) poses the body; the parts geometry draws worst (heads, faces, shoes) are
// placed pixel by pixel here, facing right, and recoloured per player. The Pixel Standard holds:
// art drawn in code, nothing downloaded.
//
// Keys: . clear · o outline · h hair · H hair light · d hair dark · s skin · S skin shadow · L skin
// light · e eye · m mouth · w white (sneaker) · W sneaker shadow · t team stripe · g sole
// ============================================================
// Heads are 9 wide × 10 tall; the anchor (the head joint) is column 4, row 5.
export const HEADS = {
  short: [
    '..ooooo..',
    '.ohhHHhoo',
    'ohhhHhhho',
    'ohhhhhhso',
    'ohhSssLso',
    'ohSSsseso',
    'oSSssssso',
    '.oSssmso.',
    '..oSsso..',
    '...ooo...',
  ],
  fade: [
    '..ooooo..',
    '.oddhhhoo',
    'oSdhHhhho',
    'oSSdhhhso',
    'oSSSssLso',
    'oSSSsseso',
    'oSSssssso',
    '.oSssmso.',
    '..oSsso..',
    '...ooo...',
  ],
  buzz: [
    '..ooooo..',
    '.odddddoo',
    'oddSddddo',
    'odSSsssso',
    'oSSSssLso',
    'oSSssseso',
    'oSSssssso',
    '.oSssmso.',
    '..oSsso..',
    '...ooo...',
  ],
  afro: [
    '.ooooooo.',
    'ohhhHHhho',
    'hhhHHhhhho',
    'ohhhhhhhso',
    'ohhhSssLso',
    'ohhSsssesO',
    'ohSSsssss',
    '.oSSssmso',
    '..oSssso.',
    '...oooo..',
  ],
  braids: [
    '..ooooo..',
    '.ohdhdhoo',
    'ohdhdhdho',
    'ohdhdhhso',
    'ohdSssLso',
    'ohSSsseso',
    'oSSssssso',
    '.oSssmso.',
    '..oSsso..',
    '...ooo...',
  ],
  pony: [
    '..ooooo..',
    '.ohhHHhoo',
    'ohhhHhhho',
    'ohhhhhhso',
    'ohhSssLso',
    'ohhSsseso',
    'ohSssssso',
    'ohoSsmso.',
    'oho.Ssso.',
    '.o..ooo..',
  ],
  bun: [
    'oho......',
    'hHhooooo.',
    'ohhhHHhoo',
    'ohhhhhhso',
    'ohhSssLso',
    'ohSSsseso',
    'oSSssssso',
    '.oSssmso.',
    '..oSsso..',
    '...ooo...',
  ],
  puffs: [
    'oho.oho..',
    'hHhohHho.',
    'ohhhHhhho',
    'ohhhhhhso',
    'ohhSssLso',
    'ohSSsseso',
    'oSSssssso',
    '.oSssmso.',
    '..oSsso..',
    '...ooo...',
  ],
}
// The open-mouth face for the dunk close-up: the same heads with the mouth row shouting.
export const SHOUT_ROW = 7
// High-tops, 8 wide × 4 tall, toe to the right; anchor (the ankle) column 2, row 0.
export const SHOE = [
  '.owwwo..',
  'owwtwwwo',
  'owWwwwwo',
  'oggggggo',
]
export const ANCHOR = { head: [4, 5], shoe: [2, 0] }
// Paint one stamp: pal maps keys to colours, s is the pixel size, f flips it to face left.
export function stamp(ctx, map, pal, x, y, s, f, anchor) {
  const [ax, ay] = anchor
  for (let r = 0; r < map.length; r++) {
    const row = map[r]
    for (let c = 0; c < row.length; c++) {
      const k = row[c]; if (k === '.' || k === ' ') continue
      const col = pal[k] || pal[k.toLowerCase()]; if (!col) continue
      const dx = (c - ax) * f
      ctx.fillStyle = col
      ctx.fillRect(Math.round(x + (f > 0 ? dx : dx - 1) * s), Math.round(y + (r - ay) * s), Math.ceil(s), Math.ceil(s))
    }
  }
}
