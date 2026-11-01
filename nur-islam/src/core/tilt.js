// Inclinaison 3D au pointeur pour tout élément .tilt (délégation d'événements).
import { reducedMotion } from './dom.js';

let on = false;
export function initTilt() {
  if (on) return; on = true;
  const view = document.getElementById('view');
  let active = null;
  view.addEventListener('pointermove', (e) => {
    if (reducedMotion() || e.pointerType === 'touch') return;
    const el = e.target.closest?.('.tilt');
    if (active && active !== el) reset(active);
    if (!el) { active = null; return; }
    active = el;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    el.classList.add('hot');
    el.style.setProperty('--ry', ((px - 0.5) * 14).toFixed(2) + 'deg');
    el.style.setProperty('--rx', ((0.5 - py) * 12).toFixed(2) + 'deg');
    el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
    el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
  });
  view.addEventListener('pointerleave', () => active && reset(active), true);
  function reset(el) { el.classList.remove('hot'); el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); }
}

// Apparition progressive en perspective (frise, listes) via IntersectionObserver.
export function revealOnScroll(root) {
  const items = root.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window) || reducedMotion()) { items.forEach((i) => i.classList.add('in')); return () => {}; }
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.15 });
  items.forEach((i) => io.observe(i));
  return () => io.disconnect();
}
