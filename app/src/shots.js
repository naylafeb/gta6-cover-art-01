// Fixed scenes for screenshots: ?shot=editor shows the studio with sample
// photos loaded; ?shot=cover shows the exported cover alone at the size the
// query names. `photo` picks the sample for all four slots, `caption` the
// title, `size` the post size, `layout` the arrangement, `grade` the colour
// grade. window.__shotReady is set once the scene has painted.
import { studio, paintPreview, fillSlotFromSample, SIZES } from './main.js';

/** Paints the requested shot scene, then flags it ready for the screenshot. */
export async function runShot(shot, query) {
  const caption = query.get('caption') ?? 'OCEAN DRIVE';
  const photo = query.get('photo') ?? 'pier';
  studio.title = caption;
  studio.subtitle = query.get('subtitle') ?? 'WELCOME TO LEONIDA';
  studio.caption = query.get('tagline') ?? 'A NEON HEIST IN VICE CITY';
  studio.grade = query.get('grade') ?? 'sunset';
  studio.layout = query.get('layout') ?? 'hero';
  // One sample for every slot, or one per slot (?photo0=&photo1=&photo2=&photo3=).
  for (let i = 0; i < studio.slots.length; i++) {
    studio.slots[i].sample = query.get(`photo${i}`) ?? photo;
  }
  await Promise.all(studio.slots.map((_, i) => fillSlotFromSample(i)));
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const sizeKey = query.get('size') ?? '1920x1080';
    if (SIZES[sizeKey]) studio.size = sizeKey;
  }
  const titleInput = document.getElementById('title');
  if (titleInput) titleInput.value = studio.title;
  const subtitleInput = document.getElementById('subtitle');
  if (subtitleInput) subtitleInput.value = studio.subtitle;
  paintPreview();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
