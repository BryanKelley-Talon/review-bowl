// ============================================================
// MODE 7 — the SNES rotating floor, shared by every sport (the Pixel Standard, BK 2026-10-04
// 17:24, "Approved. Signed.").
//
// One floor texture drawn in perspective a scanline at a time, a sky strip that turns with the
// camera, and upright pieces (bleachers, a press box, a school, a scoreboard, poles, a fence)
// drawn column by column in perspective. Everything is written into one ImageData and put once,
// so a Chromebook does one blit a frame, not thousands of draws.
//
// Units: the scene is in yards. A texture holds PY pixels a yard; (OX, OY) is where yard (0, 0)
// sits in the floor texture. The camera: x, y in yards, a = heading (0 looks down +x), h =
// height in yards, hz = the horizon row, f = focal length in screen pixels.
//
// Nothing here is stored or sent. It forgets everything when the moment ends.
// ============================================================

// A canvas, read once into a texture: { w, h, d } with d the RGBA bytes.
export function texture(canvas) {
  const g = canvas.getContext('2d')
  return { w: canvas.width, h: canvas.height, d: g.getImageData(0, 0, canvas.width, canvas.height).data }
}

// Four steps of distance shade, banded the 16-bit way (never a smooth fade).
export const SHADE = [1, 0.9, 0.8, 0.7]

// Where a ground point (yards) lands on screen, or null behind the camera.
export function project(scene, cam, W, x, y, z = 0) {
  const P = scene.PY
  const ca = Math.cos(cam.a), sa = Math.sin(cam.a)
  const rx = (x + scene.OX) * P - (cam.x + scene.OX) * P, ry = (y + scene.OY) * P - (cam.y + scene.OY) * P
  const d = rx * ca + ry * sa
  if (d <= 1) return null
  const l = rx * sa - ry * ca
  return { x: W / 2 + l * cam.f / d, y: cam.hz + (cam.h * P - z * P) * cam.f / d, d }
}

export function createMode7(W, H) {
  const img = new ImageData(W, H), O = img.data

  function sky(scene, cam) {
    const s = scene.sky
    if (!s) { O.fill(0, 0, cam.hz * W * 4); return }
    // the strip turns with the camera: a full turn walks the whole strip
    const off = ((Math.round((cam.a / (Math.PI * 2)) * s.w) % s.w) + s.w) % s.w
    for (let row = 0; row < cam.hz; row++) {
      const sr = Math.min(s.h - 1, Math.max(0, s.h - cam.hz + row))
      let o = row * W * 4
      for (let col = 0; col < W; col++, o += 4) {
        const i = (sr * s.w + ((off + col) % s.w)) * 4
        O[o] = s.d[i]; O[o + 1] = s.d[i + 1]; O[o + 2] = s.d[i + 2]; O[o + 3] = 255
      }
    }
  }

  function floor(scene, cam) {
    const T = scene.floor, P = scene.PY, TD = T.d, TW = T.w, TH = T.h
    const [gr, gg, gb] = scene.out || [22, 40, 22]
    const cx = (cam.x + scene.OX) * P, cy = (cam.y + scene.OY) * P, h = cam.h * P, f = cam.f
    const ca = Math.cos(cam.a), sa = Math.sin(cam.a)
    const band = scene.band || 300
    for (let row = cam.hz; row < H; row++) {
      const dist = (h * f) / (row - cam.hz + 0.5)
      const k = SHADE[Math.min(3, Math.floor(dist / band))]
      const half = (dist * (W / 2)) / f
      let wx = cx + ca * dist - sa * half, wy = cy + sa * dist + ca * half
      const dx = (sa * 2 * half) / W, dy = (-ca * 2 * half) / W
      let o = row * W * 4
      for (let col = 0; col < W; col++, wx += dx, wy += dy, o += 4) {
        const tx = wx | 0, ty = wy | 0
        if (tx < 0 || ty < 0 || tx >= TW || ty >= TH) { O[o] = gr * k; O[o + 1] = gg * k; O[o + 2] = gb * k; O[o + 3] = 255; continue }
        const i = (ty * TW + tx) * 4
        O[o] = TD[i] * k; O[o + 1] = TD[i + 1] * k; O[o + 2] = TD[i + 2] * k; O[o + 3] = 255
      }
    }
  }

  // Upright pieces, far to near. Each texture runs left to right as seen from the field side.
  function walls(scene, cam) {
    const P = scene.PY, f = cam.f, h = cam.h * P
    const ca = Math.cos(cam.a), sa = Math.sin(cam.a)
    const cx = (cam.x + scene.OX) * P, cy = (cam.y + scene.OY) * P
    const band = scene.band || 300
    const near = 6
    const proj = (x, y) => { const rx = (x + scene.OX) * P - cx, ry = (y + scene.OY) * P - cy; return { d: rx * ca + ry * sa, l: rx * sa - ry * ca } }
    const list = []
    for (const w of scene.walls || []) {
      const A = proj(w.x0, w.y0), B = proj(w.x1, w.y1)
      if (A.d <= near && B.d <= near) continue
      list.push({ w, A, B, mid: (A.d + B.d) / 2 })
    }
    list.sort((p, q) => q.mid - p.mid)
    for (const { w, A, B } of list) {
      let a0 = { d: A.d, l: A.l, u: 0 }, b0 = { d: B.d, l: B.l, u: 1 }
      if (a0.d < near) { const k = (near - a0.d) / (b0.d - a0.d); a0 = { d: near, l: a0.l + (b0.l - a0.l) * k, u: k } }
      if (b0.d < near) { const k = (near - b0.d) / (a0.d - b0.d); b0 = { d: near, l: b0.l + (a0.l - b0.l) * k, u: 1 - k * (1 - a0.u) } }
      const sx0 = W / 2 + (a0.l * f) / a0.d, sx1 = W / 2 + (b0.l * f) / b0.d
      const t = w.tex, TD = t.d, tw = t.w, th = t.h
      const z0 = w.z0 * P, z1 = w.z1 * P
      let lo, hi
      if (Math.abs(sx1 - sx0) < 1) { lo = hi = Math.round((sx0 + sx1) / 2) } else { lo = Math.ceil(Math.min(sx0, sx1)); hi = Math.floor(Math.max(sx0, sx1)) }
      lo = Math.max(0, lo); hi = Math.min(W - 1, hi)
      for (let col = lo; col <= hi; col++) {
        const k = Math.abs(sx1 - sx0) < 1 ? 0 : (col - sx0) / (sx1 - sx0)
        const inv = (1 - k) / a0.d + k / b0.d
        const u = ((1 - k) * a0.u / a0.d + k * b0.u / b0.d) / inv
        const d = 1 / inv
        const top = cam.hz + (h - z1) * f / d, bot = cam.hz + (h - z0) * f / d
        const tc = Math.min(tw - 1, Math.max(0, Math.floor(u * tw)))
        const shadeK = SHADE[Math.min(3, Math.floor(d / band))]
        const r0 = Math.max(0, Math.ceil(top)), r1 = Math.min(H - 1, Math.floor(bot))
        const span = bot - top || 1
        for (let row = r0; row <= r1; row++) {
          const tr = Math.min(th - 1, Math.max(0, Math.floor(((row - top) / span) * th)))
          const i = (tr * tw + tc) * 4
          if (TD[i + 3] < 128) continue
          const o = (row * W + col) * 4
          O[o] = TD[i] * shadeK; O[o + 1] = TD[i + 1] * shadeK; O[o + 2] = TD[i + 2] * shadeK; O[o + 3] = 255
        }
      }
    }
  }

  // Light banks: a banded glow, a faint haze down to the field, a few moths. Skipped in lite.
  function glows(g, scene, cam, lite) {
    if (lite) return
    for (const L of scene.glows || []) {
      const p = project(scene, cam, W, L.x, L.y, L.z)
      if (!p) continue
      const r = Math.max(3, (L.r || 4.5) * scene.PY * cam.f / p.d)
      if (p.x < -r * 3 || p.x > W + r * 3) continue
      if (r > 28) continue                              // a lamp right over the lens: no glow
      if (L.toward) {
        const q = project(scene, cam, W, L.toward[0], L.toward[1], 0)
        if (q) {
          g.fillStyle = 'rgba(255,246,200,.035)'
          g.beginPath(); g.moveTo(p.x - r * 0.4, p.y); g.lineTo(p.x + r * 0.4, p.y); g.lineTo(q.x + r * 3, q.y); g.lineTo(q.x - r * 3, q.y); g.fill()
        }
      }
      for (const [m, al] of [[2.2, 0.05], [1.5, 0.09], [0.9, 0.16]]) { g.fillStyle = `rgba(255,246,200,${al})`; g.beginPath(); g.arc(p.x, p.y, r * m, 0, 7); g.fill() }
      g.fillStyle = '#ffffff'
      for (let i = 0; i < 7; i++) { const ang = i * 0.9 + L.x + (L.t || 0), rr = r * (1.2 + (i % 3) * 0.5); g.fillRect(Math.round(p.x + Math.cos(ang) * rr), Math.round(p.y + Math.sin(ang) * rr * 0.7), 1, 1) }
    }
  }

  // Sprites standing on the floor (players in a ball-cam): { x, y, cv, ax, ay, s } drawn far to near,
  // scaled by whole steps of their own pixels so they stay crisp.
  function sprites(g, scene, cam, list) {
    const items = []
    for (const sp of list || []) {
      const p = project(scene, cam, W, sp.x, sp.y, 0)
      if (p) items.push({ sp, p })
    }
    items.sort((a, b) => b.p.d - a.p.d)
    for (const { sp, p } of items) {
      // size: one sprite pixel is sp.px yards tall in the world
      const k = Math.max(1, Math.round((sp.px || 0.06) * scene.PY * cam.f / p.d))
      if (k > 12) continue
      const w = sp.cv.width * k, hh = sp.cv.height * k
      g.drawImage(sp.cv, Math.round(p.x - sp.ax * k), Math.round(p.y - sp.ay * k), w, hh)
    }
  }

  function render(g, scene, cam, opts = {}) {
    sky(scene, cam)
    floor(scene, cam)
    walls(scene, cam)
    g.putImageData(img, 0, 0)
    if (opts.sprites) sprites(g, scene, cam, opts.sprites)
    glows(g, scene, cam, !!opts.lite)
  }

  return { render, W, H }
}
