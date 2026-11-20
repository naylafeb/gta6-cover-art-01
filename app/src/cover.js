// Palmline's poster renderer: draws a multi-panel GTA-style cover on a canvas.
// Everything is procedural — sunset sky, striped sun, skyline, palm silhouettes,
// three slanted photo panels with role ribbons, a huge gradient title and a
// billing block — so the cover is the app's own drawing, with no artwork,
// logo or font taken from any game.

/** The three colour grades the studio offers, each a sky gradient plus accents. */
export const GRADES = {
  sunset: {
    sky: [[0, '#160b33'], [0.45, '#6d1a63'], [0.68, '#d6336c'], [0.85, '#ff7a45'], [1, '#ffc46b']],
    sun: ['#ffe9a3', '#ff5e62'],
    title: ['#ffffff', '#ffe27a', '#ff7ab8'],
    panelTint: 'rgba(255, 90, 60, 0.10)',
  },
  neon: {
    sky: [[0, '#030312'], [0.4, '#160b4d'], [0.65, '#7a0e7e'], [0.85, '#00c2d8'], [1, '#00f0ff']],
    sun: ['#aefcff', '#ff2fb3'],
    title: ['#ffffff', '#7df9ff', '#ff5ce1'],
    panelTint: 'rgba(0, 229, 255, 0.10)',
  },
  midnight: {
    sky: [[0, '#01010a'], [0.45, '#0a1030'], [0.7, '#1d3a6e'], [0.9, '#c98a3d'], [1, '#f4c95d']],
    sun: ['#fff3c4', '#f0a832'],
    title: ['#ffffff', '#ffe9a3', '#9db8ff'],
    panelTint: 'rgba(60, 90, 180, 0.12)',
  },
};

/** A small deterministic PRNG, so every render of the same state is identical. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixRgb(a, b, t) {
  return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t));
}

/** The sky colour at a vertical fraction, by interpolating the grade's stops. */
export function skyColorAt(grade, y01) {
  const stops = GRADES[grade].sky;
  for (let i = 1; i < stops.length; i++) {
    if (y01 <= stops[i][0]) {
      const [y0, c0] = stops[i - 1];
      const [y1, c1] = stops[i];
      const t = (y01 - y0) / (y1 - y0 || 1);
      const [r, g, b] = mixRgb(hexRgb(c0), hexRgb(c1), t);
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  return stops[stops.length - 1][1];
}

/** Geometry of one slanted panel: centre, size and tilt, as fractions of the cover. */
export function panelGeometry(index, w, h) {
  const centres = [0.2, 0.5, 0.8];
  return {
    cx: w * centres[index],
    cy: h * 0.365,
    pw: w * 0.3,
    ph: h * 0.47,
    rot: -0.07,
  };
}

function paintSky(ctx, grade, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  for (const [at, color] of GRADES[grade].sky) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function paintStripedSun(ctx, grade, w, h) {
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
    ctx.fillStyle = skyColorAt(grade, y / h);
    ctx.fillRect(cx - r, y, r * 2, thick);
    y += thick + r * 0.09;
    thick *= 1.45;
  }
  ctx.restore();
}

function paintSkyline(ctx, grade, w, h, rand) {
  const horizon = h * 0.6;
  ctx.fillStyle = '#150826';
  let x = -w * 0.02;
  while (x < w * 1.02) {
    const bw = w * (0.04 + rand() * 0.07);
    const bh = h * (0.05 + rand() * 0.13);
    ctx.fillRect(x, horizon - bh, bw, bh + h * 0.02);
    // A few lit windows.
    ctx.fillStyle = 'rgba(255, 214, 120, 0.85)';
    const wins = Math.floor(rand() * 5);
    for (let i = 0; i < wins; i++) {
      ctx.fillRect(x + bw * (0.15 + rand() * 0.7), horizon - bh + bh * (0.15 + rand() * 0.6), 3, 4);
    }
    ctx.fillStyle = '#150826';
    x += bw + w * 0.008;
  }
}

function paintPalm(ctx, x, baseY, size, lean) {
  ctx.save();
  ctx.translate(x, baseY);
  ctx.rotate(lean);
  ctx.scale(size, size);
  ctx.fillStyle = '#10051f';
  ctx.strokeStyle = '#10051f';
  // Trunk: a tapering curve.
  ctx.beginPath();
  ctx.moveTo(-7, 0);
  ctx.quadraticCurveTo(-4, -70, 6, -128);
  ctx.quadraticCurveTo(10, -132, 12, -128);
  ctx.quadraticCurveTo(6, -66, 9, 0);
  ctx.closePath();
  ctx.fill();
  // Fronds: seven drooping blades from the crown.
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

function paintPanels(ctx, state, w, h) {
  for (let i = 0; i < 3; i++) {
    const panel = state.panels[i];
    const { cx, cy, pw, ph, rot } = panelGeometry(i, w, h);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = w * 0.02;
    ctx.shadowOffsetY = h * 0.008;
    ctx.beginPath();
    ctx.rect(-pw / 2, -ph / 2, pw, ph);
    ctx.fillStyle = '#241335';
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.rect(-pw / 2, -ph / 2, pw, ph);
    ctx.clip();
    if (panel.img) {
      const iw = panel.img.naturalWidth;
      const ih = panel.img.naturalHeight;
      const base = Math.max(pw / iw, ph / ih);
      const s = base * (panel.zoom || 1);
      const dw = iw * s;
      const dh = ih * s;
      // Centred on the panel: the transform origin is the panel centre, so the
      // image's top-left corner sits half its size left and up from the centre.
      const dx = -dw / 2 + (panel.panX || 0) * pw;
      const dy = -dh / 2 + (panel.panY || 0) * ph;
      ctx.drawImage(panel.img, dx, dy, dw, dh);
    }
    // Warm grade tint plus a shade at the foot so the ribbon reads.
    ctx.fillStyle = GRADES[state.grade].panelTint;
    ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
    const shade = ctx.createLinearGradient(0, ph * 0.15, 0, ph / 2);
    shade.addColorStop(0, 'rgba(10, 4, 24, 0)');
    shade.addColorStop(1, 'rgba(10, 4, 24, 0.55)');
    ctx.fillStyle = shade;
    ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
    // Role ribbon: dark pill with the panel's role in white capitals.
    const role = (panel.role || '').trim().toUpperCase();
    if (role) {
      const fs = Math.max(12, h * 0.021);
      ctx.font = `800 ${fs}px sans-serif`;
      const tw = ctx.measureText(role).width;
      const padX = fs * 0.9;
      const pillW = tw + padX * 2;
      const pillH = fs * 2.1;
      const px = -pillW / 2;
      const py = ph / 2 - pillH - ph * 0.045;
      ctx.fillStyle = 'rgba(12, 5, 26, 0.88)';
      ctx.fillRect(px, py, pillW, pillH);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(role, 0, py + pillH / 2 + fs * 0.04);
      ctx.textBaseline = 'alphabetic';
    }
    ctx.restore();

    // Crisp white poster border.
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.lineWidth = Math.max(3, w * 0.005);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(-pw / 2, -ph / 2, pw, ph);
    ctx.restore();
  }
}

function paintTitle(ctx, state, w, h) {
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim().toUpperCase();
  if (title) {
    let size = h * 0.115;
    ctx.font = `italic 900 ${size}px sans-serif`;
    try { ctx.letterSpacing = `${size * 0.05}px`; } catch { /* older canvas: no tracking */ }
    while (ctx.measureText(title).width > w * 0.94 && size > 20) {
      size -= 4;
      ctx.font = `italic 900 ${size}px sans-serif`;
      try { ctx.letterSpacing = `${size * 0.05}px`; } catch { /* older canvas */ }
    }
    const grad = ctx.createLinearGradient(w * 0.08, 0, w * 0.92, 0);
    const stops = GRADES[state.grade].title;
    grad.addColorStop(0, stops[0]);
    grad.addColorStop(0.55, stops[1]);
    grad.addColorStop(1, stops[2]);
    ctx.save();
    ctx.translate(w / 2, h * 0.79);
    ctx.rotate(-0.02);
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    ctx.lineWidth = size * 0.09;
    ctx.strokeStyle = '#1a0533';
    ctx.shadowColor = 'rgba(255, 46, 136, 0.55)';
    ctx.shadowBlur = size * 0.25;
    ctx.strokeText(title, 0, 0);
    ctx.fillStyle = grad;
    ctx.fillText(title, 0, 0);
    ctx.restore();
  }
  if (subtitle) {
    const fs = Math.max(13, h * 0.024);
    ctx.font = `700 ${fs}px sans-serif`;
    try { ctx.letterSpacing = `${fs * 0.42}px`; } catch { /* older canvas */ }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = fs * 0.4;
    ctx.fillText(subtitle, w / 2, h * 0.855);
    ctx.shadowBlur = 0;
  }
}

function paintBilling(ctx, state, w, h) {
  const roles = state.panels.map((p) => (p.role || '').trim().toUpperCase()).filter(Boolean);
  const line = roles.length
    ? `STARRING ${roles.join('  ·  ')}   —   A PALMLINE PICTURE`
    : 'A PALMLINE PICTURE';
  let fs = Math.max(10, h * 0.016);
  ctx.font = `600 ${fs}px sans-serif`;
  try { ctx.letterSpacing = `${fs * 0.28}px`; } catch { /* older canvas */ }
  // Shrink until the line fits the cover, so tall sizes never clip the billing.
  while (ctx.measureText(line).width > w * 0.94 && fs > 8) {
    fs -= 1;
    ctx.font = `600 ${fs}px sans-serif`;
    try { ctx.letterSpacing = `${fs * 0.28}px`; } catch { /* older canvas */ }
  }
  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.textAlign = 'center';
  ctx.fillText(line, w / 2, h * 0.955);
}

function paintVignette(ctx, w, h) {
  const g = ctx.createRadialGradient(
    w / 2, h * 0.45, Math.min(w, h) * 0.42,
    w / 2, h * 0.5, Math.max(w, h) * 0.75,
  );
  g.addColorStop(0, 'rgba(10, 4, 24, 0)');
  g.addColorStop(1, 'rgba(10, 4, 24, 0.38)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Draws the whole poster for `state` onto `canvas` at the canvas's own size. */
export function drawPoster(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const rand = mulberry32(20261121);
  paintSky(ctx, state.grade, w, h);
  paintStripedSun(ctx, state.grade, w, h);
  paintSkyline(ctx, state.grade, w, h, rand);
  paintPanels(ctx, state, w, h);
  const s = Math.min(w, h);
  paintPalm(ctx, w * 0.015, h * 0.66, s * 0.0016, -0.1);
  paintPalm(ctx, w * 0.985, h * 0.68, s * 0.0014, 0.12);
  paintTitle(ctx, state, w, h);
  paintBilling(ctx, state, w, h);
  paintVignette(ctx, w, h);
}
