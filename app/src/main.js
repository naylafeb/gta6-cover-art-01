// Wires Palmline: three photo panels, a caption, a colour grade and three post
// sizes, with a live preview and a PNG export. A `?shot=` query sets up a fixed
// scene for a screenshot instead (./shots.js).
import { drawPoster } from './cover.js';
import { runShot } from './shots.js';

/** The three post sizes the studio exports, as [width, height] pairs. */
export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

/** The studio's state: caption, grade, size and one slot per poster panel. */
export const state = {
  title: 'PALMLINE',
  subtitle: 'A SUNSET HEIST',
  grade: 'sunset',
  size: '1080x1080',
  panels: [
    { img: null, sample: 'pier', zoom: 1.15, panX: 0, panY: 0, role: 'THE DRIVER' },
    { img: null, sample: 'boulevard', zoom: 1.1, panX: 0, panY: 0, role: 'THE QUEEN' },
    { img: null, sample: 'pier', zoom: 1.25, panX: 0, panY: 0, role: 'THE FIXER' },
  ],
};

const canvas = document.getElementById('cover');
const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');
const status = document.getElementById('status');

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Redraws the preview at the state's size, then paints the poster on it. */
export function redraw() {
  const [w, h] = SIZES[state.size];
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  drawPoster(canvas, state);
}

/** Renders the poster at `sizeKey` on a fresh canvas and downloads it as a PNG. */
export function exportPoster(sizeKey) {
  const [w, h] = SIZES[sizeKey];
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawPoster(off, state);
  off.toBlob((blob) => {
    if (!blob) {
      status.textContent = 'Export failed — the browser could not make the PNG.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `palmline-${sizeKey}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    status.textContent = `Saved palmline-${sizeKey}.png`;
  }, 'image/png');
}

/** Fills one panel from a sample photo, keeping its crop and role. */
export async function loadPanelSample(index) {
  const panel = state.panels[index];
  panel.img = await loadImage(`samples/${panel.sample}.jpg`);
}

/** Binds one panel's fieldset (photo, sample, crop sliders, role) to the state. */
function bindPanel(index) {
  const panel = state.panels[index];
  const pick = (id) => document.getElementById(`panel${index}-${id}`);
  pick('photo').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    panel.img = await loadImage(URL.createObjectURL(file));
    redraw();
  });
  pick('sample').addEventListener('change', async (e) => {
    panel.sample = e.target.value;
    panel.img = await loadImage(`samples/${panel.sample}.jpg`);
    redraw();
  });
  pick('zoom').addEventListener('input', (e) => {
    panel.zoom = Number(e.target.value);
    redraw();
  });
  pick('panx').addEventListener('input', (e) => {
    panel.panX = Number(e.target.value);
    redraw();
  });
  pick('pany').addEventListener('input', (e) => {
    panel.panY = Number(e.target.value);
    redraw();
  });
  pick('role').addEventListener('input', (e) => {
    panel.role = e.target.value;
    redraw();
  });
}

titleInput.addEventListener('input', () => {
  state.title = titleInput.value;
  redraw();
});
subtitleInput.addEventListener('input', () => {
  state.subtitle = subtitleInput.value;
  redraw();
});
document.querySelectorAll('input[name="grade"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    state.grade = radio.value;
    redraw();
  });
});
document.getElementById('size').addEventListener('change', (e) => {
  state.size = e.target.value;
  redraw();
});
document.getElementById('export').addEventListener('click', () => exportPoster(state.size));
for (let i = 0; i < 3; i++) bindPanel(i);

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query);
} else {
  // First paint: load the samples, then draw.
  Promise.all(state.panels.map((_, i) => loadPanelSample(i))).then(redraw);
}
