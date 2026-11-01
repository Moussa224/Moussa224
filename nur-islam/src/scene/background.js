// Fond 3D permanent : poussière d'étoiles dorée/turquoise + grandes étoiles géométriques
// (khatam à 8 pointes) en filaments, avec parallaxe au pointeur et au défilement.
import * as THREE from 'three';
import { quality, webgl, addTask } from './engine.js';
import { store } from '../core/store.js';
import { reducedMotion } from '../core/dom.js';

export function initBackground(canvas) {
  if (!webgl()) { canvas.style.display = 'none'; return; }
  const q = quality();
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'low-power' }); }
  catch { canvas.style.display = 'none'; return; }
  renderer.setPixelRatio(Math.min(q.dpr, 1.5));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
  camera.position.z = 30;

  // étoiles
  const N = q.particles;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N), ph = new Float32Array(N);
  const cGold = new THREE.Color('#f2cf7a'), cTeal = new THREE.Color('#5fe0c4'), cWhite = new THREE.Color('#ffffff');
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 120;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 80;
    pos[i * 3 + 2] = -Math.random() * 70 + 15;
    const r = Math.random();
    const c = r < 0.5 ? cGold : r < 0.78 ? cTeal : cWhite;
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    size[i] = 0.6 + Math.random() * 2.2;
    ph[i] = Math.random() * 6.283;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('ph', new THREE.BufferAttribute(ph, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uPx: { value: renderer.getPixelRatio() }, uA: { value: 1 } },
    vertexShader: `attribute float size; attribute float ph; attribute vec3 color; varying vec3 vC; varying float vA; uniform float uT; uniform float uPx;
      void main(){ vC=color; vec4 mv=modelViewMatrix*vec4(position,1.0); float tw=.55+.45*sin(uT*1.3+ph*3.0); vA=tw; gl_PointSize=size*uPx*(160.0/-mv.z); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vC; varying float vA; uniform float uA; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,.0,d); gl_FragColor=vec4(vC, a*a*vA*.9*uA); }`,
  });
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  // grandes étoiles géométriques en filaments
  function starShape(r, inner) {
    const pts = [];
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2 - Math.PI / 2; const rr = i % 2 ? inner : r; pts.push(new THREE.Vector3(Math.cos(a) * rr, Math.sin(a) * rr, 0)); }
    return pts;
  }
  const stars = [];
  const mkStar = (x, y, z, r, s) => {
    const g = new THREE.Group();
    const m = new THREE.LineBasicMaterial({ color: 0xe9c46a, transparent: true, opacity: 0.075, depthWrite: false });
    g.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(starShape(r, r * 0.72)), m));
    g.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(starShape(r * 0.66, r * 0.47)), m));
    const c = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 64 }, (_, i) => new THREE.Vector3(Math.cos((i / 64) * 6.283) * r * 1.12, Math.sin((i / 64) * 6.283) * r * 1.12, 0))), m);
    g.add(c);
    g.position.set(x, y, z); g.userData.s = s; scene.add(g); stars.push(g);
  };
  mkStar(-26, 12, -30, 10, 0.05);
  mkStar(30, -14, -42, 15, -0.035);
  mkStar(6, 24, -55, 8, 0.04);
  if (q.level !== 'low') mkStar(-34, -22, -60, 12, -0.03);

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  resize(); addEventListener('resize', resize);

  const m = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', (e) => { m.tx = (e.clientX / innerWidth - 0.5) * 2; m.ty = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });
  let scroll = 0;
  addEventListener('scroll', () => (scroll = scrollY), { passive: true });

  const applyTheme = () => { mat.uniforms.uA.value = document.documentElement.dataset.theme === 'clair' ? 0.5 : 1; stars.forEach((s) => s.children.forEach((c) => (c.material.color.set(document.documentElement.dataset.theme === 'clair' ? 0x9a6b10 : 0xe9c46a)))); };
  applyTheme(); store.on((k) => k === 'theme' && setTimeout(applyTheme, 20));

  let acc = 0;
  addTask((dt, t) => {
    acc += dt; if (acc < 1 / 30) return; const d = acc; acc = 0;
    const k = reducedMotion() ? 0 : 1;
    m.x += (m.tx - m.x) * 0.05; m.y += (m.ty - m.y) * 0.05;
    mat.uniforms.uT.value = t;
    points.rotation.y = t * 0.006 * k + m.x * 0.05;
    points.rotation.x = m.y * 0.03 + scroll * 0.00012;
    camera.position.x = m.x * 1.6; camera.position.y = -m.y * 1.0 - scroll * 0.004;
    camera.lookAt(0, -scroll * 0.004, 0);
    stars.forEach((s, i) => { s.rotation.z += s.userData.s * d * k; s.rotation.y = Math.sin(t * 0.1 + i) * 0.25 * k; });
    renderer.render(scene, camera);
  });
}
