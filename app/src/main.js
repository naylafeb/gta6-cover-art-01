// Wires Ocean Drive: four photo slots led by a pop-out hero, five layouts,
// eight colour grades, callouts, a seal and auto cast tags, with a live
// preview and a PNG export. A `?shot=` query sets up a fixed scene for a
// screenshot instead (./shots.js).
import { renderCover, layoutSlots, focusOf } from './cover.js';
import { runShot } from './shots.js';

/** The three post sizes the studio exports, as [width, height] pairs. */
export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

/** Four ready-made casts, one role per slot, for the auto-cast button. */
export const CAST_SETS = [
  ['THE DRIVER', 'THE QUEEN', 'THE FIXER', 'THE GETAWAY'],
  ['THE KINGPIN', 'THE LOOKOUT', 'THE HACKER', 'THE MUSCLE'],
  ['LUCIA', 'JASON', 'THE DEALER', 'THE COP'],
  ['THE HEIST LEAD', 'THE INSIDE MAN', 'THE WHEELMAN', 'THE FENCE'],
];

/** The studio's state: wording, grade, layout, size and one slot per photo. */
export const studio = {
  title: 'OCEAN DRIVE',
  subtitle: 'WELCOME TO LEONIDA',
  caption: 'A NEON HEIST IN VICE CITY',
  grade: 'sunset',
  layout: 'hero',
  size: '1080x1080',
  seal: true,
  callouts: [
    { text: 'WANTED: ONE LAST JOB', on: true },
    { text: 'NEW IN LEONIDA', on: true },
  ],
  slots: [
    { img: null, sample: 'pier', zoom: 1.2, panX: 0, panY: 0, role: 'THE DRIVER', focus: null },
    { img: null, sample: 'boulevard', zoom: 1.1, panX: 0, panY: 0, role: 'THE QUEEN', focus: null },
    { img: null, sample: 'pier', zoom: 1.15, panX: 0, panY: 0, role: 'THE FIXER', focus: null },
    { img: null, sample: 'boulevard', zoom: 1.2, panX: 0, panY: 0, role: 'THE GETAWAY', focus: null },
  ],
};

let castIndex = 0;

const canvas = document.getElementById('cover');
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

/** Repaints the preview at the studio's size, then renders the poster on it. */
export function paintPreview() {
  const [w, h] = SIZES[studio.size];
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  renderCover(canvas, studio);
}

/** Renders the poster at `sizeKey` on a fresh canvas and downloads it as a PNG. */
export function savePng(sizeKey) {
  const [w, h] = SIZES[sizeKey];
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  renderCover(off, studio);
  off.toBlob((blob) => {
    if (!blob) {
      status.textContent = 'Export failed — the browser could not make the PNG.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ocean-drive-${sizeKey}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    status.textContent = `Saved ocean-drive-${sizeKey}.png`;
  }, 'image/png');
}

/** Fills one slot from a sample photo, keeping its crop, role and focus. */
export async function fillSlotFromSample(index) {
  const slot = studio.slots[index];
  slot.img = await loadImage(`samples/${slot.sample}.jpg`);
  slot.focus = null;
}

/** Binds one slot's fieldset (photo, sample, crop sliders, role, focus) to the state. */
function wireSlot(index) {
  const slot = studio.slots[index];
  const pick = (id) => document.getElementById(`slot${index}-${id}`);
  pick('photo').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    slot.img = await loadImage(URL.createObjectURL(file));
    slot.focus = null;
    paintPreview();
  });
  pick('sample').addEventListener('change', async (e) => {
    slot.sample = e.target.value;
    slot.img = await loadImage(`samples/${slot.sample}.jpg`);
    slot.focus = null;
    paintPreview();
  });
  pick('zoom').addEventListener('input', (e) => {
    slot.zoom = Number(e.target.value);
    paintPreview();
  });
  pick('panx').addEventListener('input', (e) => {
    slot.panX = Number(e.target.value);
    paintPreview();
  });
  pick('pany').addEventListener('input', (e) => {
    slot.panY = Number(e.target.value);
    paintPreview();
  });
  pick('role').addEventListener('input', (e) => {
    slot.role = e.target.value;
    paintPreview();
  });
  pick('focus-auto').addEventListener('click', () => {
    slot.focus = null;
    paintPreview();
    status.textContent = `Slot ${index + 1}: focus auto-detected again.`;
  });
  pick('focus-centre').addEventListener('click', () => {
    slot.focus = { x: 0.5, y: 0.5 };
    paintPreview();
    status.textContent = `Slot ${index + 1}: focus centred.`;
  });
}

/** Clicking the preview sets the hero slot's focus where the user clicked. */
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const px = ((e.clientX - rect.left) / rect.width) * canvas.width;
  const py = ((e.clientY - rect.top) / rect.height) * canvas.height;
  const slots = layoutSlots(studio.layout, canvas.width, canvas.height);
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    if (Math.abs(px - s.cx) <= s.pw / 2 && Math.abs(py - s.cy) <= s.ph / 2) {
      const slot = studio.slots[i];
      if (!slot.img) return;
      const cur = slot.focus || focusOf(slot.img);
      const pop = s.hero ? s.ph * 0.09 : 0;
      const iw = slot.img.naturalWidth;
      const ih = slot.img.naturalHeight;
      const base = Math.max(s.pw / iw, (s.ph + pop) / ih);
      const scale = base * (slot.zoom || 1) * (s.hero ? 1.05 : 1);
      const dw = iw * scale;
      const dh = ih * scale;
      // Invert the draw math: the image's top-left in cover coordinates is
      // (centre - focus * size + pan). Rotation is ignored here; the slots
      // tilt only a few degrees.
      const left = s.cx - cur.x * dw + (slot.panX || 0) * s.pw;
      const top = s.cy - cur.y * dh + (slot.panY || 0) * s.ph;
      slot.focus = {
        x: Math.min(0.85, Math.max(0.15, (px - left) / dw)),
        y: Math.min(0.85, Math.max(0.15, (py - top) / dh)),
      };
      paintPreview();
      status.textContent = `Slot ${i + 1}: focus set where you clicked.`;
      return;
    }
  }
});

document.getElementById('title').addEventListener('input', (e) => {
  studio.title = e.target.value;
  paintPreview();
});
document.getElementById('subtitle').addEventListener('input', (e) => {
  studio.subtitle = e.target.value;
  paintPreview();
});
document.getElementById('caption').addEventListener('input', (e) => {
  studio.caption = e.target.value;
  paintPreview();
});
document.querySelectorAll('input[name="grade"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    studio.grade = radio.value;
    paintPreview();
  });
});
document.getElementById('layout').addEventListener('change', (e) => {
  studio.layout = e.target.value;
  paintPreview();
});
document.getElementById('size').addEventListener('change', (e) => {
  studio.size = e.target.value;
  paintPreview();
});
document.getElementById('seal').addEventListener('change', (e) => {
  studio.seal = e.target.checked;
  paintPreview();
});
studio.callouts.forEach((call, i) => {
  document.getElementById(`callout${i}`).addEventListener('input', (e) => {
    call.text = e.target.value;
    paintPreview();
  });
  document.getElementById(`callout${i}-on`).addEventListener('change', (e) => {
    call.on = e.target.checked;
    paintPreview();
  });
});
document.getElementById('autocast').addEventListener('click', () => {
  castIndex = (castIndex + 1) % CAST_SETS.length;
  const set = CAST_SETS[castIndex];
  studio.slots.forEach((slot, i) => {
    slot.role = set[i];
    document.getElementById(`slot${i}-role`).value = set[i];
  });
  paintPreview();
  status.textContent = `Cast set ${castIndex + 1} of ${CAST_SETS.length} applied.`;
});
document.getElementById('export').addEventListener('click', () => savePng(studio.size));
for (let i = 0; i < 4; i++) wireSlot(i);

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query);
} else {
  // First paint: load the samples, then draw.
  Promise.all(studio.slots.map((_, i) => fillSlotFromSample(i))).then(paintPreview);
}
