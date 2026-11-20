// Fixed scenes for screenshots: ?shot=editor shows the studio with sample photos
// loaded; ?shot=cover shows the exported cover alone at the size the query names.
// `photo` picks the sample for all three panels, `caption` the title, `size` the
// post size. window.__shotReady is set once the scene has painted.
import { state, redraw, loadPanelSample, SIZES } from './main.js';

/** Paints the requested shot scene, then flags it ready for the screenshot. */
export async function runShot(shot, query) {
  const caption = query.get('caption') ?? 'PALMLINE';
  const photo = query.get('photo') ?? 'pier';
  state.title = caption;
  state.subtitle = query.get('subtitle') ?? 'A SUNSET HEIST';
  state.grade = query.get('grade') ?? 'sunset';
  // One sample for every panel, or one per panel (?photo0=&photo1=&photo2=).
  for (let i = 0; i < state.panels.length; i++) {
    state.panels[i].sample = query.get(`photo${i}`) ?? photo;
  }
  await Promise.all(state.panels.map((_, i) => loadPanelSample(i)));
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const sizeKey = query.get('size') ?? '1920x1080';
    if (SIZES[sizeKey]) state.size = sizeKey;
  }
  const titleInput = document.getElementById('title');
  if (titleInput) titleInput.value = state.title;
  const subtitleInput = document.getElementById('subtitle');
  if (subtitleInput) subtitleInput.value = state.subtitle;
  redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
