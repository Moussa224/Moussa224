// Moteur 3D minimal : un renderer par « scène », boucle commune, pause hors écran,
// entrées pointeur (parallaxe + glisser), qualité adaptative, nettoyage complet.
import * as THREE from 'three';
import { store } from '../core/store.js';
import { reducedMotion } from '../core/dom.js';

export { THREE };

let _gl;
export function webgl() {
  if (_gl !== undefined) return _gl;
  try { const c = document.createElement('canvas'); _gl = !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { _gl = false; }
  return _gl;
}

export function quality() {
  const q = store.get('quality');
  const coarse = matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 700;
  const weak = (navigator.hardwareConcurrency || 4) <= 4;
  const level = q === 'auto' ? (coarse || weak ? 'mid' : 'high') : q === 'high' ? 'high' : 'low';
  const dpr = window.devicePixelRatio || 1;
  return {
    level,
    dpr: level === 'high' ? Math.min(dpr, 2) : level === 'mid' ? Math.min(dpr, 1.5) : 1,
    aa: level !== 'low',
    particles: level === 'high' ? 900 : level === 'mid' ? 520 : 220,
    segments: level === 'high' ? 48 : level === 'mid' ? 32 : 20,
  };
}

// ───────── boucle commune ─────────
const tasks = new Set();
let raf = 0, last = 0;
function loop(now) {
  raf = requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
  last = now;
  for (const t of tasks) t(dt, now / 1000);
}
function startLoop() { if (!raf && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } }
function stopLoop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
document.addEventListener('visibilitychange', () => (document.hidden ? stopLoop() : tasks.size && startLoop()));
export function addTask(fn) { tasks.add(fn); startLoop(); return () => { tasks.delete(fn); if (!tasks.size) stopLoop(); }; }

export function disposeObject(root) {
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of mats) {
      for (const k in m) { const v = m[k]; if (v && v.isTexture) v.dispose(); }
      m.dispose();
    }
  });
}

/**
 * Crée une scène 3D dans `container`.
 * build(ctx) → { update?(dt, t), dispose?(), resize?(w, h) }
 * ctx : { THREE, scene, camera, renderer, canvas, container, q, input, size }
 *   input : { x, y (−1…1), down, dragX, dragY (cumulés, en px), vx, vy (vitesse), clicks[] }
 */
export function createStage(container, build, opts = {}) {
  const q = quality();
  if (!webgl()) { showFallback(container); return null; }
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  container.prepend(canvas);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: q.aa, alpha: opts.alpha ?? true, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.preserve });
  } catch (e) { canvas.remove(); showFallback(container); return null; }
  renderer.setPixelRatio(q.dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = opts.exposure ?? 1.0;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(opts.fov ?? 45, 1, 0.1, 400);
  const size = { w: 1, h: 1 };
  const input = { x: 0, y: 0, tx: 0, ty: 0, down: false, dragX: 0, dragY: 0, vx: 0, vy: 0, clicks: [], moved: 0 };

  function resize() {
    const w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
    size.w = w; size.h = h;
    renderer.setSize(w, h, false);
    canvas.style.width = '100%'; canvas.style.height = '100%';
    camera.aspect = w / h; camera.updateProjectionMatrix();
    mod && mod.resize && mod.resize(w, h);
  }

  let mod;
  try { mod = build({ THREE, scene, camera, renderer, canvas, container, q, input, size }) || {}; }
  catch (e) { console.error(e); renderer.dispose(); canvas.remove(); showFallback(container); return null; }

  const ro = new ResizeObserver(resize); ro.observe(container); resize();

  // pointeur
  let sx = 0, sy = 0, downAt = 0;
  const rect = () => canvas.getBoundingClientRect();
  const onMove = (e) => {
    const r = rect();
    input.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
    input.ty = -(((e.clientY - r.top) / r.height) * 2 - 1);
    if (input.down) {
      const dx = e.clientX - sx, dy = e.clientY - sy;
      sx = e.clientX; sy = e.clientY;
      input.dragX += dx; input.dragY += dy; input.vx = dx; input.vy = dy; input.moved += Math.abs(dx) + Math.abs(dy);
    }
  };
  const onDown = (e) => { input.down = true; sx = e.clientX; sy = e.clientY; downAt = performance.now(); input.moved = 0; try { canvas.setPointerCapture(e.pointerId); } catch {} };
  const onUp = (e) => {
    if (input.down && input.moved < 8 && performance.now() - downAt < 450) {
      const r = rect();
      input.clicks.push({ x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -(((e.clientY - r.top) / r.height) * 2 - 1) });
    }
    input.down = false;
  };
  const onLeave = () => { input.tx = 0; input.ty = 0; };
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', () => (input.down = false));
  canvas.addEventListener('pointerleave', onLeave);

  let visible = true;
  const io = new IntersectionObserver(([en]) => (visible = en.isIntersecting), { threshold: 0.01 });
  io.observe(container);

  let t0 = 0, frames = 0;
  const stop = addTask((dt, t) => {
    if (!visible) return;
    input.x += (input.tx - input.x) * Math.min(1, dt * 4);
    input.y += (input.ty - input.y) * Math.min(1, dt * 4);
    mod.update && mod.update(reducedMotion() ? dt * 0.15 : dt, t);
    renderer.render(scene, camera);
    input.vx *= 0.9; input.vy *= 0.9;
    if (opts.onFrame) opts.onFrame(++frames);
  });

  return {
    scene, camera, renderer, canvas, input, size, mod,
    renderOnce() { mod.update && mod.update(0.016, 0); renderer.render(scene, camera); },
    dispose() {
      stop(); ro.disconnect(); io.disconnect();
      try { mod.dispose && mod.dispose(); } catch (e) { console.error(e); }
      disposeObject(scene);
      renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss();
      canvas.remove();
    },
  };
}

function showFallback(container) {
  if (container.querySelector('.stage-fallback')) return;
  const d = document.createElement('div');
  d.className = 'stage-fallback';
  d.innerHTML = '<div><div style="font-size:2.2rem;margin-bottom:8px">🕌</div><b>La 3D n’est pas disponible sur cet appareil.</b><p style="margin-top:6px;opacity:.75">Tout le contenu de l’application reste utilisable.</p></div>';
  container.prepend(d);
}

// Texture canvas utilitaire (texte, motifs).
export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
