// Mosquée procédurale : dôme, tambour, minarets, arcades, bassin réfléchissant, lanternes, palmiers.
// Le ciel, la lumière, la lune et les fenêtres s'adaptent à l'heure (voir sky.js).
import { THREE, canvasTexture } from './engine.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { buildKeys, skyAt, sunAlt, sunPos, moonPos, makeSkyDome, makeStars, glowTexture, dayFactor } from './sky.js';
import { makeMoon } from './moon.js';
import { clamp, lerp } from '../core/dom.js';

// ───────── textures ─────────
const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function wallTexture() {
  const r = rng(11);
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#e9dfc7'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) { g.fillStyle = r() > 0.5 ? 'rgba(120,95,50,.045)' : 'rgba(255,255,255,.05)'; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 2); }
    g.strokeStyle = 'rgba(130,100,55,.14)'; g.lineWidth = 1;
    for (let y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(w, y + 0.5); g.stroke(); }
  });
}

function groundTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#d8cba8'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(110,85,40,.42)'; g.lineWidth = 2;
    const star = (cx, cy, r) => {
      g.beginPath();
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.62 : r; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
      g.closePath(); g.stroke();
    };
    star(w / 2, h / 2, w * 0.46); star(0, 0, w * 0.25); star(w, 0, w * 0.25); star(0, h, w * 0.25); star(w, h, w * 0.25);
    g.strokeStyle = 'rgba(14,110,92,.35)'; g.beginPath(); g.arc(w / 2, h / 2, w * 0.17, 0, 7); g.stroke();
    g.fillStyle = 'rgba(14,110,92,.22)'; g.beginPath(); g.arc(w / 2, h / 2, w * 0.09, 0, 7); g.fill();
  });
}

function domeTexture() {
  return canvasTexture(1024, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#22b49b'); gr.addColorStop(1, '#0e7566');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(245,208,110,.9)'; g.lineWidth = 3;
    const ribs = 24;
    for (let i = 0; i < ribs; i++) { const x = (i / ribs) * w; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    // motif d'écailles
    g.strokeStyle = 'rgba(245,208,110,.38)'; g.lineWidth = 1.5;
    for (let row = 0; row < 7; row++) {
      const y = 60 + row * 62;
      for (let i = 0; i < ribs; i++) { const x = ((i + (row % 2 ? 0.5 : 0)) / ribs) * w; g.beginPath(); g.arc(x, y, w / ribs / 2, 0, Math.PI); g.stroke(); }
    }
    g.fillStyle = 'rgba(245,208,110,.9)'; g.fillRect(0, h - 16, w, 6);
  });
}

function latticeTexture() {
  return canvasTexture(128, 256, (g, w, h) => {
    g.fillStyle = '#ffd08a'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(70,35,0,.75)'; g.lineWidth = 3;
    const s = 22;
    for (let y = -s; y < h + s; y += s) for (let x = -s; x < w + s; x += s) {
      g.beginPath(); g.moveTo(x + s / 2, y); g.lineTo(x + s, y + s / 2); g.lineTo(x + s / 2, y + s); g.lineTo(x, y + s / 2); g.closePath(); g.stroke();
    }
    g.lineWidth = 6; g.strokeRect(2, 2, w - 4, h - 4);
  });
}

// ───────── géométries ─────────
function archPts(w, h, x0 = 0, y0 = 0) {
  const x = w / 2, hs = Math.max(0.05, h - w * 0.58), kx = hs + (h - hs) * 0.78;
  return { x, hs, kx, x0, y0 };
}
function archShape(w, h) {
  const { x, hs, kx } = archPts(w, h);
  const s = new THREE.Shape();
  s.moveTo(-x, 0); s.lineTo(-x, hs); s.quadraticCurveTo(-x, kx, 0, h); s.quadraticCurveTo(x, kx, x, hs); s.lineTo(x, 0); s.closePath();
  return s;
}
function archPath(cx, w, h, y0 = 0) {
  const { x, hs, kx } = archPts(w, h);
  const p = new THREE.Path();
  p.moveTo(cx - x, y0); p.lineTo(cx + x, y0); p.lineTo(cx + x, y0 + hs); p.quadraticCurveTo(cx + x, y0 + kx, cx, y0 + h); p.quadraticCurveTo(cx - x, y0 + kx, cx - x, y0 + hs); p.lineTo(cx - x, y0);
  return p;
}
function archGeo(w, h) {
  const g = new THREE.ShapeGeometry(archShape(w, h), 12);
  const uv = g.attributes.uv, pos = g.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, pos.getY(i) / h);
  return g;
}
// mur percé d'arcades
function arcadeWall(W, H, n, aw, ah, depth) {
  const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(W, 0); s.lineTo(W, H); s.lineTo(0, H); s.closePath();
  const gap = W / n;
  for (let i = 0; i < n; i++) s.holes.push(archPath(gap * (i + 0.5), aw, ah));
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 10 });
  g.translate(-W / 2, 0, 0);
  return g;
}

export function mosqueScene(ctx, init) {
  const { scene, camera, renderer, q, input } = ctx;
  const root = new THREE.Group(); scene.add(root);

  // ── matériaux ──
  const wallTex = wallTexture(); wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping; wallTex.repeat.set(3, 2);
  const wall = new THREE.MeshStandardMaterial({ map: wallTex, color: 0xffffff, roughness: 0.9, metalness: 0 });
  const wallDark = new THREE.MeshStandardMaterial({ color: 0xcdbd98, roughness: 0.9 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xe6b84d, metalness: 0.95, roughness: 0.28, emissive: 0x3a2400, emissiveIntensity: 0.4 });
  const domeTex = domeTexture();
  const domeMat = new THREE.MeshStandardMaterial({ map: domeTex, roughness: 0.38, metalness: 0.35 });
  const lat = latticeTexture();
  const winMat = new THREE.MeshStandardMaterial({ color: 0x3a2610, emissive: 0xffa43c, emissiveMap: lat, emissiveIntensity: 0.1, roughness: 0.6, side: THREE.DoubleSide });
  const innerMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a, emissive: 0xff8c28, emissiveIntensity: 0.05, roughness: 1 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xffc46b, emissive: 0xffa02a, emissiveIntensity: 0.6, roughness: 0.3, transparent: true, opacity: 0.95 });
  const gTex = groundTexture(); gTex.wrapS = gTex.wrapT = THREE.RepeatWrapping; gTex.repeat.set(26, 26);
  const groundMat = new THREE.MeshStandardMaterial({ map: gTex, roughness: 0.95 });
  const paveTex = gTex.clone(); paveTex.repeat.set(10, 7); paveTex.needsUpdate = true;
  const paveMat = new THREE.MeshStandardMaterial({ map: paveTex, roughness: 0.88, color: 0xf2ead3 });
  const add = (m, parent = root) => { m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };

  // ── sol ──
  const ground = new THREE.Mesh(new THREE.CircleGeometry(160, 48), new THREE.MeshStandardMaterial({ color: 0x7c6a45, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true; root.add(ground);
  const platform = add(new THREE.Mesh(new THREE.BoxGeometry(46, 0.4, 34), paveMat)); platform.position.set(0, 0.2, 5);
  const platformEdge = add(new THREE.Mesh(new THREE.BoxGeometry(47, 0.16, 35), gold)); platformEdge.position.set(0, 0.06, 5);

  // ── salle de prière ──
  const hall = add(new THREE.Mesh(new THREE.BoxGeometry(10, 4.6, 8), wall)); hall.position.set(0, 2.7, 0);
  const cornice = add(new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.3, 8.5), wallDark)); cornice.position.set(0, 5.1, 0);
  const goldBand = add(new THREE.Mesh(new THREE.BoxGeometry(10.55, 0.1, 8.55), gold)); goldBand.position.set(0, 4.95, 0);

  // portail (iwan)
  {
    const s = new THREE.Shape(); s.moveTo(-2.4, 0); s.lineTo(2.4, 0); s.lineTo(2.4, 6.0); s.lineTo(-2.4, 6.0); s.closePath();
    s.holes.push(archPath(0, 3.1, 4.6));
    const iwan = add(new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.9, bevelEnabled: false, curveSegments: 14 }), wall)); iwan.position.set(0, 0.4, 4.0);
    const ringShape = new THREE.Shape(archPath(0, 3.5, 4.95, -0.05).getPoints(30)); ringShape.holes.push(archPath(0, 3.1, 4.6));
    const ring = new THREE.Mesh(new THREE.ExtrudeGeometry(ringShape, { depth: 0.06, bevelEnabled: false }), gold); ring.position.set(0, 0.4, 4.92); root.add(ring);
    const inner = new THREE.Mesh(archGeo(3.1, 4.6), innerMat); inner.position.set(0, 0.4, 4.08); root.add(inner);
    const mihrabWin = new THREE.Mesh(archGeo(1.5, 2.6), winMat); mihrabWin.position.set(0, 1.0, 4.1); root.add(mihrabWin);
    const rose = new THREE.Mesh(new THREE.CircleGeometry(0.5, 16), winMat); rose.position.set(0, 3.6, 4.1); root.add(rose);
  }
  // fenêtres de façade
  const wins = [];
  for (const sx of [-1, 1]) for (const x of [3.4, 4.4]) {
    const w1 = new THREE.Mesh(archGeo(0.75, 2.2), winMat); w1.position.set(sx * x, 1.4, 4.02); root.add(w1);
    const w2 = new THREE.Mesh(archGeo(0.6, 1.1), winMat); w2.position.set(sx * x, 3.9, 4.02); root.add(w2);
  }

  // tambour + dôme
  const drum = add(new THREE.Mesh(new THREE.CylinderGeometry(3.15, 3.3, 1.5, 16), wall)); drum.position.set(0, 5.85, 0);
  const drumTrim = add(new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.09, 8, 48), gold)); drumTrim.rotation.x = Math.PI / 2; drumTrim.position.set(0, 6.62, 0);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2, w = new THREE.Mesh(archGeo(0.5, 0.95), winMat);
    w.position.set(Math.sin(a) * 3.2, 5.45, Math.cos(a) * 3.2); w.rotation.y = a; root.add(w);
  }
  const dome = add(new THREE.Mesh(new THREE.SphereGeometry(3.25, q.segments * 1.5, q.segments, 0, Math.PI * 2, 0, Math.PI / 2), domeMat)); dome.scale.y = 1.22; dome.position.set(0, 6.6, 0);
  const finial = new THREE.Group(); finial.position.set(0, 6.6 + 3.25 * 1.22 - 0.05, 0); root.add(finial);
  {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.22, 0.5, 12), gold); base.position.y = 0.2; finial.add(base);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), gold); ball.position.y = 0.6; finial.add(ball);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.9, 8), gold); pole.position.y = 1.1; finial.add(pole);
    const cres = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.07, 10, 40, Math.PI * 1.55), gold); cres.rotation.z = Math.PI * 0.78 - 0.1; cres.position.y = 1.65; finial.add(cres);
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.1), gold); star.position.set(0.1, 1.65, 0); finial.add(star);
  }

  // ailes + arcades
  const wingMeshes = [];
  for (const sx of [-1, 1]) {
    const wing = add(new THREE.Mesh(new THREE.BoxGeometry(5, 3.6, 6.2), wall)); wing.position.set(sx * 7.6, 2.2, -0.1);
    const arc = add(new THREE.Mesh(arcadeWall(5, 3.2, 3, 1.15, 2.4, 0.55), wall)); arc.position.set(sx * 7.6, 0.4, 3.0);
    const dark = new THREE.Mesh(new THREE.PlaneGeometry(5, 3.0), innerMat); dark.position.set(sx * 7.6, 1.9, 3.02); root.add(dark);
    for (let i = 0; i < 3; i++) { const w = new THREE.Mesh(archGeo(0.8, 1.6), winMat); w.position.set(sx * 7.6 + (i - 1) * (5 / 3), 0.7, 3.06); root.add(w); }
    const tr = add(new THREE.Mesh(new THREE.BoxGeometry(5.3, 0.22, 6.5), wallDark)); tr.position.set(sx * 7.6, 4.1, -0.1);
    const dr = add(new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.6, 0.9, 16), wall)); dr.position.set(sx * 7.6, 4.65, -0.1);
    const d = add(new THREE.Mesh(new THREE.SphereGeometry(1.55, q.segments, q.segments / 2, 0, Math.PI * 2, 0, Math.PI / 2), domeMat)); d.scale.y = 1.15; d.position.set(sx * 7.6, 5.1, -0.1);
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 1.1, 8), gold); f.position.set(sx * 7.6, 5.1 + 1.55 * 1.15 + 0.4, -0.1); root.add(f);
    const cr = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 8, 28, Math.PI * 1.55), gold); cr.rotation.z = Math.PI * 0.78 - 0.1; cr.position.set(sx * 7.6, 5.1 + 1.55 * 1.15 + 1.05, -0.1); root.add(cr);
  }

  // minarets
  const glowTex = glowTexture('rgba(255,200,110,1)', 'rgba(255,160,40,0)');
  const minaretGlows = [];
  function minaret(x, z, k = 1) {
    const g = new THREE.Group(); g.position.set(x, 0.4, z); g.scale.setScalar(k);
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.4, 1.7), wall); b.position.y = 1.2; add(b, g);
    const bt = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.18, 1.9), wallDark); bt.position.y = 2.45; add(bt, g);
    const s1 = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.78, 6.6, 8), wall); s1.position.y = 5.7; s1.rotation.y = Math.PI / 8; add(s1, g);
    const band1 = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.12, 8), gold); band1.position.y = 4.2; band1.rotation.y = Math.PI / 8; g.add(band1);
    const bal = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.82, 0.42, 16), wallDark); bal.position.y = 9.15; add(bal, g);
    const rail = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.04, 6, 32), gold); rail.rotation.x = Math.PI / 2; rail.position.y = 9.65; g.add(rail);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283; const p = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.45, 5), gold); p.position.set(Math.cos(a) * 0.97, 9.43, Math.sin(a) * 0.97); g.add(p); }
    const s2 = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.56, 2.9, 8), wall); s2.position.y = 10.7; s2.rotation.y = Math.PI / 8; add(s2, g);
    const bal2 = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.6, 0.3, 16), wallDark); bal2.position.y = 12.3; add(bal2, g);
    const s3 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 1.7, 8), wall); s3.position.y = 13.3; s3.rotation.y = Math.PI / 8; add(s3, g);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.9, 8), domeMat); cap.position.y = 15.1; add(cap, g);
    const fi = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.9, 6), gold); fi.position.y = 16.4; g.add(fi);
    const cr = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 8, 28, Math.PI * 1.55), gold); cr.rotation.z = Math.PI * 0.78 - 0.1; cr.position.y = 16.85; g.add(cr);
    for (const y of [6.2, 7.6, 10.2, 11.2]) for (let k2 = 0; k2 < 4; k2++) {
      const w = new THREE.Mesh(archGeo(0.2, 0.62), winMat); const a = (k2 / 4) * 6.283 + Math.PI / 4; const r = y < 9 ? 0.7 : 0.5;
      w.position.set(Math.sin(a) * r * 0.97 * 1.0, y, Math.cos(a) * r * 0.97); w.rotation.y = a; g.add(w);
    }
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, fog: false }));
    gl.scale.set(4.2, 4.2, 1); gl.position.y = 9.5; g.add(gl); minaretGlows.push(gl);
    root.add(g); return g;
  }
  minaret(-12.1, 2.2, 1.0); minaret(12.1, 2.2, 1.0);
  minaret(-5.6, -5.6, 0.82); minaret(5.6, -5.6, 0.82);

  // bassin réfléchissant
  const poolW = 7.2, poolL = 13;
  const poolFrame = add(new THREE.Mesh(new THREE.BoxGeometry(poolW + 0.9, 0.22, poolL + 0.9), wallDark)); poolFrame.position.set(0, 0.46, 12.2);
  let reflector = null;
  if (q.level !== 'low') {
    reflector = new Reflector(new THREE.PlaneGeometry(poolW, poolL), { clipBias: 0.003, textureWidth: Math.floor(512 * Math.min(1.5, q.dpr)), textureHeight: Math.floor(512 * Math.min(1.5, q.dpr)), color: 0x8a97b8 });
    reflector.rotation.x = -Math.PI / 2; reflector.position.set(0, 0.585, 12.2); root.add(reflector);
  }
  const water = new THREE.Mesh(new THREE.PlaneGeometry(poolW, poolL), new THREE.MeshStandardMaterial({ color: 0x0a2a3c, transparent: true, opacity: reflector ? 0.38 : 0.92, roughness: 0.1, metalness: 0.6 }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, 0.59, 12.2); root.add(water);
  // allée
  const path = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4), paveMat); path.rotation.x = -Math.PI / 2; path.position.set(0, 0.405, 6.3); root.add(path);

  // lanternes
  const lanterns = [];
  const lanternGeo = new THREE.LatheGeometry([[0.0, -0.32], [0.16, -0.26], [0.22, -0.08], [0.2, 0.12], [0.12, 0.26], [0.05, 0.34], [0.0, 0.36]].map(([x, y]) => new THREE.Vector2(x, y)), 14);
  const capGeo = new THREE.ConeGeometry(0.2, 0.18, 14);
  const lGlow = new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.0, fog: false });
  function lantern(x, y, z, len) {
    const g = new THREE.Group(); g.position.set(x, y, z);
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, len, 4), gold); chain.position.y = -len / 2; g.add(chain);
    const body = new THREE.Group(); body.position.y = -len - 0.3; g.add(body);
    body.add(new THREE.Mesh(lanternGeo, glassMat));
    const c = new THREE.Mesh(capGeo, gold); c.position.y = 0.45; body.add(c);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.02, 6, 16), gold); ring.rotation.x = Math.PI / 2; ring.position.y = -0.3; body.add(ring);
    const s = new THREE.Sprite(lGlow.clone()); s.scale.set(1.9, 1.9, 1); body.add(s);
    g.userData = { ph: Math.random() * 6.28, sp: 0.7 + Math.random() * 0.5, glow: s };
    root.add(g); lanterns.push(g);
  }
  [[-0.95, 4.35, 5.0, 0.9], [0.95, 4.35, 5.0, 0.9], [0, 4.7, 5.2, 1.2], [-6.2, 3.1, 3.6, 0.55], [-9.0, 3.1, 3.6, 0.55], [6.2, 3.1, 3.6, 0.55], [9.0, 3.1, 3.6, 0.55]].forEach(([x, y, z, l]) => lantern(x, y, z, l));

  // palmiers
  const palmMat = new THREE.MeshStandardMaterial({ color: 0x2f6b3d, roughness: 0.8, side: THREE.DoubleSide });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5a38, roughness: 1 });
  const frondGeo = (() => {
    const g = new THREE.PlaneGeometry(0.9, 3.4, 2, 10); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const t = (p.getY(i) + 1.7) / 3.4; p.setZ(i, -t * t * 1.5); p.setX(i, p.getX(i) * (1 - t * 0.85)); p.setY(i, p.getY(i) + 1.7); }
    g.computeVertexNormals(); return g;
  })();
  const palms = [];
  function palm(x, z, h, lean) {
    const g = new THREE.Group(); g.position.set(x, 0.4, z); g.rotation.z = lean;
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.26, h, 8), trunkMat); tr.position.y = h / 2; add(tr, g);
    const crown = new THREE.Group(); crown.position.y = h; g.add(crown);
    for (let i = 0; i < 11; i++) { const f = new THREE.Mesh(frondGeo, palmMat); f.castShadow = true; const a = (i / 11) * 6.283; f.rotation.set(-0.5 - (i % 3) * 0.18, a, 0, 'YXZ'); f.rotation.order = 'YXZ'; crown.add(f); }
    root.add(g); palms.push(crown);
  }
  palm(-17.5, 6.5, 6.2, 0.05); palm(17.8, 7, 5.6, -0.06); palm(-19.5, -1, 7, -0.04); palm(20, -1.5, 6.4, 0.05);
  palm(-16, 15, 5.2, 0.07); palm(16.5, 15.5, 5.6, -0.05);

  // ── ciel ──
  const dome3 = makeSkyDome(); scene.add(dome3);
  const stars = makeStars(q.level === 'low' ? 450 : 1100); scene.add(stars); stars.material.uniforms.uPx.value = renderer.getPixelRatio();
  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,247,220,1)', 'rgba(255,200,120,0)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false })); sunSprite.scale.setScalar(46); scene.add(sunSprite);
  const sunCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false })); sunCore.scale.setScalar(11); scene.add(sunCore);
  const moon = makeMoon({ radius: 4.2, glow: 3.4 }); scene.add(moon.group);
  scene.fog = new THREE.FogExp2(0x9ec7e8, 0.0085);

  // ── lumières ──
  const hemi = new THREE.HemisphereLight(0xbfdcff, 0x5a4a30, 0.7); scene.add(hemi);
  const sunLight = new THREE.DirectionalLight(0xfff0d0, 2); scene.add(sunLight, sunLight.target);
  const moonLight = new THREE.DirectionalLight(0x8fa6ff, 0.0); scene.add(moonLight, moonLight.target);
  const lampLight = new THREE.PointLight(0xffa550, 0, 26, 1.6); lampLight.position.set(0, 3.2, 7); scene.add(lampLight);
  if (q.level === 'high') {
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    sunLight.castShadow = true; sunLight.shadow.mapSize.set(2048, 2048);
    const sc = sunLight.shadow.camera; sc.left = -26; sc.right = 26; sc.top = 26; sc.bottom = -16; sc.near = 1; sc.far = 120; sunLight.shadow.bias = -0.0006; sunLight.shadow.normalBias = 0.04;
  }

  // poussière dorée
  const dustN = q.level === 'low' ? 50 : 160;
  const dustPos = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) { dustPos[i * 3] = (Math.random() - 0.5) * 44; dustPos[i * 3 + 1] = 0.5 + Math.random() * 14; dustPos[i * 3 + 2] = -6 + Math.random() * 26; }
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.16, map: glowTexture('rgba(255,225,150,1)', 'rgba(255,200,100,0)'), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  scene.add(dust);

  // ── état ──
  let T = init.times, keys = buildKeys(T), frac = init.moonFrac ?? 0.4;
  let tNow = init.minutes ?? 720, tTarget = tNow;
  const tmpCol = { top: new THREE.Color(), hor: new THREE.Color() };
  const v = new THREE.Vector3(), v2 = new THREE.Vector3();
  moon.setPhase(frac);
  let az = 0, impulse = 0, dist = 34;

  function resize(w, h) {
    const a = w / h;
    const t = Math.tan((camera.fov * Math.PI) / 360);
    dist = clamp(14.2 / (a * t), 26, 60);
    stars.material.uniforms.uPx.value = renderer.getPixelRatio();
  }

  function applyTime(t, time) {
    skyAt(keys, t, tmpCol);
    const day = dayFactor(T, t);
    const alt = sunAlt(T, t);
    dome3.material.uniforms.uTop.value.copy(tmpCol.top);
    dome3.material.uniforms.uHor.value.copy(tmpCol.hor);
    sunPos(T, t, 140, v);
    dome3.material.uniforms.uSun.value.copy(v);
    dome3.material.uniforms.uSunI.value = clamp((alt + 0.06) * 3.5, 0, 1);
    scene.fog.color.copy(tmpCol.hor).lerp(tmpCol.top, 0.12);
    scene.fog.density = lerp(0.0105, 0.0072, day);

    // soleil
    sunSprite.position.copy(v); sunCore.position.copy(v);
    const sv = clamp((alt + 0.12) * 5, 0, 1);
    sunSprite.material.opacity = sv * 0.9; sunCore.material.opacity = sv;
    sunSprite.material.color.setRGB(1, lerp(0.62, 0.96, clamp(alt * 1.8, 0, 1)), lerp(0.35, 0.86, clamp(alt * 1.8, 0, 1)));
    sunLight.position.set(v.x * 0.55, Math.max(v.y, 6) * 0.9 + 4, 46);
    sunLight.intensity = clamp(alt * 3.2 + 0.25, 0, 1) * 3.4;
    sunLight.color.setRGB(1, lerp(0.7, 0.96, clamp(alt * 2, 0, 1)), lerp(0.45, 0.9, clamp(alt * 2, 0, 1)));

    // lune
    moonPos(T, frac, t, 135, v2);
    moon.group.position.copy(v2);
    const mv = clamp((v2.y + 8) / 22, 0, 1);
    moon.group.visible = mv > 0.01;
    moon.setGain(mv * lerp(1, 0.25, day));
    moon.halo.material.opacity *= 1; // phase gère l'opacité de base
    moon.group.scale.setScalar(1);
    const night = 1 - day;
    const illum = (1 - Math.cos(frac * Math.PI * 2)) / 2;
    moonLight.position.set(v2.x * 0.45, Math.max(v2.y, 6) * 0.9 + 4, 44);
    moonLight.intensity = night * mv * (0.35 + illum * 1.1);

    // étoiles
    stars.material.uniforms.uA.value = clamp(night * 1.4 - 0.15, 0, 1) * (1 - 0.65 * illum * mv);
    stars.material.uniforms.uT.value = time;

    // ambiance
    hemi.color.copy(tmpCol.top).lerp(new THREE.Color(0xffffff), 0.25 * day);
    hemi.groundColor.set(0x5a4a30).lerp(new THREE.Color(0x14131f), night * 0.8);
    hemi.intensity = lerp(0.3, 0.62, day) + 0.1 * illum * night;
    renderer.toneMappingExposure = lerp(1.2, 1.0, day);

    // fenêtres, lanternes
    const glow = clamp(night * 1.15 + (1 - day) * 0.3, 0, 1.2);
    winMat.emissiveIntensity = 0.12 + glow * 1.5;
    innerMat.emissiveIntensity = 0.04 + glow * 0.9;
    glassMat.emissiveIntensity = 0.5 + glow * 1.8;
    lampLight.intensity = glow * 38;
    minaretGlows.forEach((g) => (g.material.opacity = glow * 0.55));
    lanterns.forEach((l) => (l.userData.glow.material.opacity = 0.18 + glow * 0.75));
    water.material.color.copy(tmpCol.top).multiplyScalar(0.35);
    groundMat.color.setScalar(1);
  }

  applyTime(tNow, 0);

  return {
    resize,
    setTimes(times, fr) { T = times; keys = buildKeys(T); if (fr !== undefined) { frac = fr; moon.setPhase(frac); } },
    setMinutes(m, snap = false) { tTarget = clamp(m, 0, 1439); if (snap) tNow = tTarget; },
    get minutes() { return tNow; },
    impulse() { impulse = 1; },
    update(dt, time) {
      tNow += (tTarget - tNow) * Math.min(1, dt * 5);
      applyTime(tNow, time);

      // caméra : balancement lent + glisser pour tourner autour de la mosquée
      const target = clamp(-input.dragX * 0.0042, -1.05, 1.05) + Math.sin(time * 0.17) * 0.07 + input.x * 0.1;
      az += (target - az) * Math.min(1, dt * 3.5);
      const el = 4.6 + input.y * 0.9 + Math.sin(time * 0.11) * 0.25;
      camera.position.set(Math.sin(az) * dist, el, Math.cos(az) * dist + 4);
      camera.lookAt(0, 6.2, 3);
      moon.face(camera);

      // lanternes qui se balancent
      impulse *= 0.985;
      lanterns.forEach((l) => { const u = l.userData; l.rotation.z = Math.sin(time * u.sp + u.ph) * (0.05 + impulse * 0.22); l.rotation.x = Math.cos(time * u.sp * 0.8 + u.ph) * (0.03 + impulse * 0.12); });
      // palmes
      palms.forEach((c, i) => { c.rotation.z = Math.sin(time * 0.8 + i) * 0.025; c.rotation.x = Math.cos(time * 0.6 + i * 2) * 0.02; });
      // poussière
      const p = dustGeo.attributes.position;
      for (let i = 0; i < dustN; i++) { p.array[i * 3 + 1] += Math.sin(time * 0.5 + i) * 0.003 + 0.002; if (p.array[i * 3 + 1] > 15) p.array[i * 3 + 1] = 0.5; }
      p.needsUpdate = true;
      dust.material.opacity = 0.2 + 0.5 * (1 - dayFactor(T, tNow) * 0.8);
      // tap : fait vibrer les lanternes
      while (input.clicks.length) { input.clicks.pop(); impulse = 1; }
    },
    dispose() { reflector && reflector.dispose && reflector.dispose(); },
  };
}
