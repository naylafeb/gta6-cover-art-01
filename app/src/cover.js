// Ocean Drive's cover painter: draws a GTA-style poster on a canvas, all
// procedural, so the art is the app's own drawing — no logo, artwork or font
// taken from any game. A hero photo pops out of its frame, the title is
// striped retro-chrome sitting over the art, and five layouts, eight grades,
// callouts, a seal and a billing block finish the poster.

/** The eight colour grades, each a sky ramp plus sun, chrome and tint. */
export const GRADES = {
  sunset: {
    sky: [[0, '#160b33'], [0.45, '#6d1a63'], [0.68, '#d6336c'], [0.85, '#ff7a45'], [1, '#ffc46b']],
    sun: ['#ffe9a3', '#ff5e62'],
    chrome: ['#ffffff', '#ffe27a', '#ff7ab8', '#ffffff'],
    tint: 'rgba(255, 90, 60, 0.10)',
  },
  neon: {
    sky: [[0, '#030312'], [0.4, '#160b4d'], [0.65, '#7a0e7e'], [0.85, '#00c2d8'], [1, '#00f0ff']],
    sun: ['#aefcff', '#ff2fb3'],
    chrome: ['#ffffff', '#7df9ff', '#ff5ce1', '#ffffff'],
    tint: 'rgba(0, 229, 255, 0.10)',
  },
  midnight: {
    sky: [[0, '#01010a'], [0.45, '#0a1030'], [0.7, '#1d3a6e'], [0.9, '#c98a3d'], [1, '#f4c95d']],
    sun: ['#fff3c4', '#f0a832'],
    chrome: ['#ffffff', '#ffe9a3', '#9db8ff', '#ffffff'],
    tint: 'rgba(60, 90, 180, 0.12)',
  },
  vicegold: {
    sky: [[0, '#1c0f02'], [0.4, '#5c2a05'], [0.65, '#b45f06'], [0.85, '#f2a541'], [1, '#ffe08a']],
    sun: ['#fff6c9', '#ff8c1a'],
    chrome: ['#ffffff', '#ffd76b', '#ff9e2c', '#fff3c4'],
    tint: 'rgba(255, 170, 40, 0.10)',
  },
  heatwave: {
    sky: [[0, '#2b0218'], [0.4, '#7d0e3f'], [0.65, '#e5383b'], [0.85, '#ff7b2f'], [1, '#ffc53d']],
    sun: ['#fff1a8', '#ff3d2e'],
    chrome: ['#ffffff', '#ffb347', '#ff4d6d', '#ffffff'],
    tint: 'rgba(255, 61, 46, 0.10)',
  },
  palmteal: {
    sky: [[0, '#02141a'], [0.4, '#074b4b'], [0.65, '#0e8a7b'], [0.85, '#5eead4'], [1, '#fde68a']],
    sun: ['#fef9c3', '#2dd4bf'],
    chrome: ['#ffffff', '#99f6e4', '#f0abfc', '#ffffff'],
    tint: 'rgba(45, 212, 191, 0.10)',
  },
  cotton: {
    sky: [[0, '#241031'], [0.4, '#7c2d6e'], [0.65, '#e879c6'], [0.85, '#fda4af'], [1, '#fef3c7']],
    sun: ['#fff7ed', '#f472b6'],
    chrome: ['#ffffff', '#fbcfe8', '#c4b5fd', '#ffffff'],
    tint: 'rgba(244, 114, 182, 0.10)',
  },
  noir: {
    sky: [[0, '#000000'], [0.45, '#111827'], [0.7, '#374151'], [0.9, '#9ca3af'], [1, '#e5e7eb']],
    sun: ['#f9fafb', '#6b7280'],
    chrome: ['#ffffff', '#d1d5db', '#9ca3af', '#ffffff'],
    tint: 'rgba(255, 255, 255, 0.06)',
  },
};

/** A tiny deterministic LCG, so a render of the same state is identical. */
export function makeRand(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function blend(a, b, t) {
  return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t));
}

/** The sky colour at a vertical fraction, by interpolating the grade's ramp. */
export function skyAt(grade, y01) {
  const stops = GRADES[grade].sky;
  for (let i = 1; i < stops.length; i++) {
    if (y01 <= stops[i][0]) {
      const [y0, c0] = stops[i - 1];
      const [y1, c1] = stops[i];
      const t = (y01 - y0) / (y1 - y0 || 1);
      const [r, g, b] = blend(hexToRgb(c0), hexToRgb(c1), t);
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  return stops[stops.length - 1][1];
}

const focusCache = new WeakMap();

/**
 * Focal detection, done on-device with no library: the photo is shrunk to a
 * small grid, each cell scored by colour saturation plus edge contrast, and
 * the weighted centre of the strongest cells is the focal point, as {x, y}
 * fractions of the image. A portrait's face, a bright sign, a lit window —
 * whatever draws the eye — ends up centred in the crop.
 */
export function focusOf(img) {
  const hit = focusCache.get(img);
  if (hit) return hit;
  const W = 48;
  const H = 48;
  const probe = document.createElement('canvas');
  probe.width = W;
  probe.height = H;
  const pctx = probe.getContext('2d');
  pctx.drawImage(img, 0, 0, W, H);
  const data = pctx.getImageData(0, 0, W, H).data;
  const score = new Float32Array(W * H);
  const at = (x, y) => {
    const i = (y * W + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const [r, g, b] = at(x, y);
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      const sat = mx === 0 ? 0 : (mx - mn) / mx;
      let edge = 0;
      if (x + 1 < W) {
        const [r2, g2, b2] = at(x + 1, y);
        edge += Math.abs(r - r2) + Math.abs(g - g2) + Math.abs(b - b2);
      }
      if (y + 1 < H) {
        const [r2, g2, b2] = at(x, y + 1);
        edge += Math.abs(r - r2) + Math.abs(g - g2) + Math.abs(b - b2);
      }
      // A gentle pull toward the middle: dead-centre subjects are common.
      const dx = (x + 0.5) / W - 0.5;
      const dy = (y + 0.5) / H - 0.5;
      const centre = 1 - Math.min(1, Math.hypot(dx, dy) * 1.4) * 0.25;
      score[y * W + x] = (sat * 1.6 + edge / 765) * centre;
    }
  }
  // One 3x3 blur pass so a single bright pixel cannot hijack the focus.
  const blur = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let sum = 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx >= 0 && xx < W && yy >= 0 && yy < H) {
            sum += score[yy * W + xx];
            n++;
          }
        }
      }
      blur[y * W + x] = sum / n;
    }
  }
  let wx = 0;
  let wy = 0;
  let wt = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const w = blur[y * W + x] * blur[y * W + x];
      wx += (x + 0.5) * w;
      wy += (y + 0.5) * w;
      wt += w;
    }
  }
  const point = wt > 0
    ? { x: Math.min(0.8, Math.max(0.2, wx / wt / W)), y: Math.min(0.8, Math.max(0.2, wy / wt / H)) }
    : { x: 0.5, y: 0.5 };
  focusCache.set(img, point);
  return point;
}

/**
 * The five layouts, each four photo slots as fractions of the cover: centre,
 * size, tilt, and whether the slot is the pop-out hero. Panels live in the
 * top two-thirds; the chrome title overlaps their feet.
 */
export function layoutSlots(layout, w, h) {
  const F = (cx, cy, pw, ph, rot, hero) => ({ cx: cx * w, cy: cy * h, pw: pw * w, ph: ph * h, rot, hero: !!hero });
  switch (layout) {
    case 'hero':
      return [
        F(0.27, 0.345, 0.46, 0.58, -0.035, true),
        F(0.72, 0.20, 0.42, 0.27, 0.02, false),
        F(0.72, 0.42, 0.42, 0.27, -0.02, false),
        F(0.72, 0.59, 0.42, 0.19, 0.02, false),
      ];
    case 'slant':
      return [
        F(0.14, 0.35, 0.24, 0.52, -0.07, false),
        F(0.38, 0.35, 0.26, 0.56, 0.05, true),
        F(0.62, 0.35, 0.24, 0.52, -0.07, false),
        F(0.86, 0.35, 0.24, 0.52, 0.05, false),
      ];
    case 'billboard':
      return [
        F(0.50, 0.22, 0.92, 0.32, 0, true),
        F(0.17, 0.52, 0.31, 0.24, -0.02, false),
        F(0.50, 0.52, 0.31, 0.24, 0.01, false),
        F(0.83, 0.52, 0.31, 0.24, -0.02, false),
      ];
    case 'duo':
      return [
        F(0.26, 0.30, 0.46, 0.46, -0.03, true),
        F(0.74, 0.30, 0.46, 0.46, 0.03, false),
        F(0.26, 0.58, 0.46, 0.18, 0.02, false),
        F(0.74, 0.58, 0.46, 0.18, -0.02, false),
      ];
    case 'mosaic':
    default:
      return [
        F(0.26, 0.27, 0.46, 0.42, -0.02, true),
        F(0.74, 0.27, 0.46, 0.42, 0.02, false),
        F(0.26, 0.56, 0.46, 0.26, 0.02, false),
        F(0.74, 0.56, 0.46, 0.26, -0.02, false),
      ];
  }
}

function drawSky(ctx, grade, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  for (const [at, color] of GRADES[grade].sky) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawSun(ctx, grade, w, h) {
  const cx = w * 0.5;
  const cy = h * 0.13;
  const r = Math.min(w, h) * 0.125;
  ctx.save();
  ctx.shadowColor = GRADES[grade].sun[1];
  ctx.shadowBlur = r * 0.9;
  const g = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  g.addColorStop(0, GRADES[grade].sun[0]);
  g.addColorStop(1, GRADES[grade].sun[1]);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Retro slats across the sun's lower half, in the sky colour at each height.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  let y = cy - r * 0.15;
  let thick = r * 0.035;
  while (y < cy + r) {
    ctx.fillStyle = skyAt(grade, y / h);
    ctx.fillRect(cx - r, y, r * 2, thick);
    y += thick + r * 0.09;
    thick *= 1.45;
  }
  ctx.restore();
}

function drawCity(ctx, grade, w, h, rand) {
  const horizon = h * 0.6;
  let x = -w * 0.02;
  while (x < w * 1.02) {
    const bw = w * (0.04 + rand() * 0.07);
    const bh = h * (0.05 + rand() * 0.13);
    ctx.fillStyle = '#150826';
    ctx.fillRect(x, horizon - bh, bw, bh + h * 0.02);
    ctx.fillStyle = 'rgba(255, 214, 120, 0.85)';
    const wins = Math.floor(rand() * 5);
    for (let i = 0; i < wins; i++) {
      ctx.fillRect(x + bw * (0.15 + rand() * 0.7), horizon - bh + bh * (0.15 + rand() * 0.6), 3, 4);
    }
    x += bw + w * 0.008;
  }
}

function drawPalmTree(ctx, x, baseY, size, lean) {
  ctx.save();
  ctx.translate(x, baseY);
  ctx.rotate(lean);
  ctx.scale(size, size);
  ctx.fillStyle = '#10051f';
  ctx.strokeStyle = '#10051f';
  ctx.beginPath();
  ctx.moveTo(-7, 0);
  ctx.quadraticCurveTo(-4, -70, 6, -128);
  ctx.quadraticCurveTo(10, -132, 12, -128);
  ctx.quadraticCurveTo(6, -66, 9, 0);
  ctx.closePath();
  ctx.fill();
  ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const a = (-160 + i * 26) * (Math.PI / 180);
    const len = 62 + (i % 3) * 12;
    const tx = Math.cos(a) * len;
    const ty = Math.sin(a) * len * 0.55 - 128;
    const mx = Math.cos(a) * len * 0.55;
    const my = -128 + Math.sin(a) * len * 0.28 - 18;
    ctx.lineWidth = 7 - (i % 3);
    ctx.beginPath();
    ctx.moveTo(8, -128);
    ctx.quadraticCurveTo(mx, my, tx, ty + 26);
    ctx.stroke();
  }
  ctx.restore();
}

function bubblePath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** Draws the four photo slots: hero pops out of its frame, the rest sit flat. */
function drawSlots(ctx, studio, w, h) {
  const slots = layoutSlots(studio.layout, w, h);
  for (let i = 0; i < 4; i++) {
    const slot = studio.slots[i];
    const { cx, cy, pw, ph, rot, hero } = slots[i];
    const pop = hero ? ph * 0.09 : 0; // hero photo spills above its frame
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = w * (hero ? 0.03 : 0.018);
    ctx.shadowOffsetY = h * 0.009;
    ctx.fillStyle = '#241335';
    ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
    ctx.restore();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.rect(-pw / 2, -ph / 2 - pop, pw, ph + pop);
    ctx.clip();
    if (slot.img) {
      const focus = slot.focus || focusOf(slot.img);
      const iw = slot.img.naturalWidth;
      const ih = slot.img.naturalHeight;
      const base = Math.max(pw / iw, (ph + pop) / ih);
      const s = base * (slot.zoom || 1) * (hero ? 1.05 : 1);
      const dw = iw * s;
      const dh = ih * s;
      // The focal point lands on the slot's centre, plus the user's pan.
      // (The frame's origin is its centre, so no half-size offset belongs here.)
      const dx = -focus.x * dw + (slot.panX || 0) * pw;
      const dy = -focus.y * dh + (slot.panY || 0) * ph;
      ctx.drawImage(slot.img, dx, dy, dw, dh);
    }
    ctx.fillStyle = GRADES[studio.grade].tint;
    ctx.fillRect(-pw / 2, -ph / 2 - pop, pw, ph + pop);
    const shade = ctx.createLinearGradient(0, ph * 0.1, 0, ph / 2);
    shade.addColorStop(0, 'rgba(10, 4, 24, 0)');
    shade.addColorStop(1, 'rgba(10, 4, 24, 0.55)');
    ctx.fillStyle = shade;
    ctx.fillRect(-pw / 2, -ph / 2 - pop, pw, ph + pop);
    ctx.restore();

    // Poster border: gold and thicker for the hero, white for the rest.
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.lineWidth = Math.max(3, w * (hero ? 0.008 : 0.005));
    ctx.strokeStyle = hero ? '#ffd76b' : '#ffffff';
    ctx.strokeRect(-pw / 2, -ph / 2, pw, ph);
    ctx.restore();
  }

  // Second pass: role ribbons, drawn after every photo, so a later slot's
  // frame can never cover an earlier slot's ribbon where panels overlap.
  for (let i = 0; i < 4; i++) {
    const slot = studio.slots[i];
    const { cx, cy, pw, ph, rot, hero } = slots[i];
    const role = (slot.role || '').trim().toUpperCase();
    if (!role) continue;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    const fs = Math.max(12, h * 0.02);
    ctx.font = `800 ${fs}px sans-serif`;
    const tw = ctx.measureText(role).width;
    const padX = fs * 0.9;
    const pillW = tw + padX * 2;
    const pillH = fs * 2.1;
    const px = -pillW / 2;
    const py = ph / 2 - pillH - ph * 0.045;
    ctx.fillStyle = hero ? 'rgba(120, 40, 10, 0.92)' : 'rgba(12, 5, 26, 0.88)';
    ctx.fillRect(px, py, pillW, pillH);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(role, 0, py + pillH / 2 + fs * 0.04);
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }
}

/** The striped retro-chrome 3D title, sitting over the art, not above it. */
function drawChromeHeading(ctx, studio, w, h) {
  const title = (studio.title || '').trim().toUpperCase();
  if (!title) return;
  let size = h * 0.115;
  ctx.font = `italic 900 ${size}px sans-serif`;
  try { ctx.letterSpacing = `${size * 0.05}px`; } catch { /* older canvas: no tracking */ }
  while (ctx.measureText(title).width > w * 0.94 && size > 20) {
    size -= 4;
    ctx.font = `italic 900 ${size}px sans-serif`;
    try { ctx.letterSpacing = `${size * 0.05}px`; } catch { /* older canvas */ }
  }
  const y = h * 0.72;
  const chrome = ctx.createLinearGradient(0, y - size, 0, y + size * 0.1);
  const bands = GRADES[studio.grade].chrome;
  for (let i = 0; i <= bands.length; i++) {
    chrome.addColorStop(i / bands.length, bands[i % bands.length]);
  }
  ctx.save();
  ctx.translate(w / 2, y);
  ctx.rotate(-0.02);
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(255, 46, 136, 0.55)';
  ctx.shadowBlur = size * 0.25;
  // Extruded 3D depth: the title drawn three times, stepping down in the dark.
  ctx.lineWidth = size * 0.1;
  ctx.strokeStyle = '#2a0a4a';
  for (const step of [7, 4, 1]) {
    ctx.strokeText(title, 0, step * size * 0.012);
  }
  ctx.lineWidth = size * 0.06;
  ctx.strokeStyle = '#1a0533';
  ctx.strokeText(title, 0, 0);
  ctx.fillStyle = chrome;
  ctx.fillText(title, 0, 0);
  ctx.restore();

  const subtitle = (studio.subtitle || '').trim().toUpperCase();
  if (subtitle) {
    const fs = Math.max(13, h * 0.024);
    ctx.font = `700 ${fs}px sans-serif`;
    try { ctx.letterSpacing = `${fs * 0.42}px`; } catch { /* older canvas */ }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = fs * 0.4;
    ctx.fillText(subtitle, w / 2, h * 0.795);
    ctx.shadowBlur = 0;
  }
  const caption = (studio.caption || '').trim();
  if (caption) {
    const fs = Math.max(12, h * 0.019);
    ctx.font = `600 ${fs}px sans-serif`;
    try { ctx.letterSpacing = `${fs * 0.18}px`; } catch { /* older canvas */ }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.textAlign = 'center';
    ctx.fillText(caption, w / 2, h * 0.835);
  }
}

/** The round seal: a stamped ring that reads around its edge, star at centre. */
function drawStamp(ctx, studio, w, h) {
  if (!studio.seal) return;
  const cx = w * 0.9;
  const cy = h * 0.885;
  const r = Math.min(w, h) * 0.052;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.21);
  ctx.globalAlpha = 0.92;
  ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.strokeStyle = '#ffd76b';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
  ctx.stroke();
  const ring = 'OCEAN DRIVE • LEONIDA • EST. 2026 • ';
  const fs = r * 0.21;
  ctx.font = `700 ${fs}px sans-serif`;
  ctx.fillStyle = '#ffd76b';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < ring.length; i++) {
    const a = (i / ring.length) * Math.PI * 2 - Math.PI / 2;
    ctx.save();
    ctx.rotate(a);
    ctx.translate(0, -r * 0.89);
    ctx.fillText(ring[i], 0, 0);
    ctx.restore();
  }
  ctx.font = `${r * 0.85}px sans-serif`;
  ctx.fillText('★', 0, r * 0.05);
  ctx.restore();
}

/** Two callout bubbles with leader lines pointing at the photo slots. */
function drawCallouts(ctx, studio, w, h) {
  const spots = [
    { x: w * 0.04, y: h * 0.075, tx: w * 0.30, ty: h * 0.16 },
    { x: w * 0.66, y: h * 0.045, tx: w * 0.70, ty: h * 0.14 },
  ];
  (studio.callouts || []).forEach((call, i) => {
    if (!call.on || !(call.text || '').trim()) return;
    const spot = spots[i % spots.length];
    const fs = Math.max(11, h * 0.017);
    ctx.font = `800 ${fs}px sans-serif`;
    const tw = ctx.measureText(call.text.trim().toUpperCase()).width;
    const bw = tw + fs * 1.8;
    const bh = fs * 2.4;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = Math.max(2, w * 0.002);
    ctx.beginPath();
    ctx.moveTo(spot.x + bw * 0.5, spot.y + bh);
    ctx.lineTo(spot.tx, spot.ty);
    ctx.stroke();
    ctx.fillStyle = 'rgba(12, 5, 26, 0.9)';
    bubblePath(ctx, spot.x, spot.y, bw, bh, bh * 0.35);
    ctx.fill();
    ctx.strokeStyle = '#ffd76b';
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(call.text.trim().toUpperCase(), spot.x + bw / 2, spot.y + bh / 2 + fs * 0.05);
    ctx.restore();
  });
}

function drawBilling(ctx, studio, w, h) {
  const roles = studio.slots.map((s) => (s.role || '').trim().toUpperCase()).filter(Boolean);
  const line = roles.length
    ? `STARRING ${roles.join('  ·  ')}   —   AN OCEAN DRIVE PICTURE`
    : 'AN OCEAN DRIVE PICTURE';
  let fs = Math.max(10, h * 0.016);
  ctx.font = `600 ${fs}px sans-serif`;
  try { ctx.letterSpacing = `${fs * 0.28}px`; } catch { /* older canvas */ }
  while (ctx.measureText(line).width > w * 0.94 && fs > 8) {
    fs -= 1;
    ctx.font = `600 ${fs}px sans-serif`;
    try { ctx.letterSpacing = `${fs * 0.28}px`; } catch { /* older canvas */ }
  }
  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.textAlign = 'center';
  ctx.fillText(line, w / 2, h * 0.955);
}

function drawVignette(ctx, w, h) {
  const g = ctx.createRadialGradient(
    w / 2, h * 0.45, Math.min(w, h) * 0.42,
    w / 2, h * 0.5, Math.max(w, h) * 0.75,
  );
  g.addColorStop(0, 'rgba(10, 4, 24, 0)');
  g.addColorStop(1, 'rgba(10, 4, 24, 0.38)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Paints the whole poster for `studio` onto `canvas` at its own size. */
export function renderCover(canvas, studio) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const rand = makeRand(20261121);
  drawSky(ctx, studio.grade, w, h);
  drawSun(ctx, studio.grade, w, h);
  drawCity(ctx, studio.grade, w, h, rand);
  drawSlots(ctx, studio, w, h);
  const s = Math.min(w, h);
  drawPalmTree(ctx, w * 0.015, h * 0.66, s * 0.0016, -0.1);
  drawPalmTree(ctx, w * 0.985, h * 0.68, s * 0.0014, 0.12);
  drawCallouts(ctx, studio, w, h);
  drawChromeHeading(ctx, studio, w, h);
  drawStamp(ctx, studio, w, h);
  drawBilling(ctx, studio, w, h);
  drawVignette(ctx, w, h);
}
