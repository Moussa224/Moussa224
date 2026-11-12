'use strict';
/* ============================================================
   NetCore Lab : monde 3D (salle technique, hall, cafétéria)
   Repère : X vers l'est, Z vers le sud, Y vers le haut. Unités : mètres.
   ============================================================ */

const H = 3.2, DOORH = 2.5, WT = 0.3;
let renderer, scene, camera, handsRig, handTip, handCable;
const COLLIDERS = [], DEV3D = {}, NPCS = [], DOORS = [], TICKERS = [];
const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* ---------- Outils ---------- */
function canvasTex(w, h, fn) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); fn(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  t.userData = { canvas: c, ctx: g };
  return t;
}
const phong = (c, o) => new THREE.MeshPhongMaterial(Object.assign({ color: c, shininess: 10 }, o || {}));
const basic = (c, o) => new THREE.MeshBasicMaterial(Object.assign({ color: c }, o || {}));

function mesh(geo, mat, x, y, z, parent) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0);
  (parent || scene).add(m); return m;
}
function box(w, h, d, mat, x, y, z, parent) { return mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent); }
function cyl(rt, rb, h, mat, x, y, z, parent, seg) { return mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 16), mat, x, y, z, parent); }
function addCollider(x0, z0, x1, z1, tag) { const c = { x0, z0, x1, z1, on: true, tag }; COLLIDERS.push(c); return c; }
function solidBox(w, h, d, mat, x, y, z, parent) {
  const m = box(w, h, d, mat, x, y, z, parent);
  addCollider(x - w / 2, z - d / 2, x + w / 2, z + d / 2);
  return m;
}
function light(color, intensity, dist, x, y, z) {
  const l = new THREE.PointLight(color, intensity, dist, 1.6); l.position.set(x, y, z); scene.add(l); return l;
}

/* ---------- Matériaux ---------- */
const MAT = {};
function initMaterials() {
  MAT.wall = phong(0x1a3b3b, { shininess: 6 });
  MAT.wallLobby = phong(0x1b3038, { shininess: 6 });
  MAT.wallLounge = phong(0x2b211c, { shininess: 4 });
  MAT.metal = phong(0x1b2125, { shininess: 60, specular: 0x445555 });
  MAT.black = phong(0x090c0d, { shininess: 90, specular: 0x667777 });
  MAT.dark = phong(0x0e1315, { shininess: 20 });
  MAT.sw = phong(0x2a3236, { shininess: 70, specular: 0x99aaaa });
  MAT.portOff = basic(0x050909);
  MAT.portOn = basic(0x39ff7a);
  MAT.portDim = basic(0x17803f);
  MAT.portSfp = basic(0x2a2008);
  MAT.portCon = basic(0x0b3a46);
  MAT.neonG = basic(0x2dff8e);
  MAT.neonC = basic(0x35e0ff);
  MAT.neonA = basic(0xffb02e);
  MAT.glass = new THREE.MeshPhongMaterial({ color: 0x66e0d0, transparent: true, opacity: 0.13, shininess: 100, specular: 0xffffff, depthWrite: false });
  MAT.light = basic(0xa8fff0);
  MAT.skin = phong(0xd9a87a, { shininess: 14 });
}

function floorMat(w, d, base, line, shiny) {
  const t = canvasTex(256, 256, (g, W, Hh) => {
    g.fillStyle = base; g.fillRect(0, 0, W, Hh);
    for (let i = 0; i < 700; i++) { g.fillStyle = 'rgba(255,255,255,' + Math.random() * 0.025 + ')'; g.fillRect(Math.random() * W, Math.random() * Hh, 2, 2); }
    g.strokeStyle = line; g.lineWidth = 4; g.strokeRect(2, 2, W - 4, Hh - 4);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w / 1.5, d / 1.5);
  return phong(0xffffff, { map: t, shininess: shiny || 40, specular: 0x142222 });
}
function woodMat(w, d) {
  const t = canvasTex(256, 256, (g, W, Hh) => {
    for (let i = 0; i < 8; i++) {
      const l = 22 + Math.random() * 10; g.fillStyle = 'hsl(24,' + (38 + Math.random() * 10) + '%,' + l + '%)'; g.fillRect(0, i * 32, W, 32);
      g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, i * 32, W, 2);
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(Math.random() * W, i * 32, 2, 32);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w / 2, d / 2);
  return phong(0xffffff, { map: t, shininess: 30, specular: 0x553322 });
}

function signMesh(text, wm, hm, o) {
  o = o || {};
  const t = canvasTex(1024, Math.round(1024 * hm / wm), (g, W, Hh) => {
    g.fillStyle = o.bg || 'rgba(2,10,8,0.92)'; g.fillRect(0, 0, W, Hh);
    g.strokeStyle = o.color || '#2dff8e'; g.lineWidth = 10; g.strokeRect(8, 8, W - 16, Hh - 16);
    g.shadowColor = o.color || '#2dff8e'; g.shadowBlur = 24;
    g.fillStyle = o.color || '#2dff8e'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const lines = text.split('\n'), fs = Math.min(Hh / (lines.length + 0.6), o.size || 120);
    g.font = '700 ' + fs + 'px "Chakra Petch","Arial Black",Impact,sans-serif';
    lines.forEach((ln, i) => g.fillText(ln, W / 2, Hh / 2 + (i - (lines.length - 1) / 2) * fs * 1.1, W - 60));
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(wm, hm), basic(0xffffff, { map: t }));
  return m;
}

/* ---------- Murs, sols, portes ---------- */
function wallBox(axis, fixed, a, b, y0, y1, mat, solid) {
  const len = b - a, h = y1 - y0, mid = (a + b) / 2;
  if (axis === 'x') { box(len, h, WT, mat, mid, y0 + h / 2, fixed); if (solid) addCollider(a, fixed - WT / 2, b, fixed + WT / 2); }
  else { box(WT, h, len, mat, fixed, y0 + h / 2, mid); if (solid) addCollider(fixed - WT / 2, a, fixed + WT / 2, b); }
}
function buildWall(axis, fixed, from, to, gaps, mat) {
  gaps = gaps || []; mat = mat || MAT.wall;
  let cur = from; const segs = [];
  gaps.forEach(([a, b]) => { if (a > cur) segs.push([cur, a]); cur = b; });
  if (cur < to) segs.push([cur, to]);
  segs.forEach(([a, b]) => wallBox(axis, fixed, a, b, 0, H, mat, true));
  gaps.forEach(([a, b]) => wallBox(axis, fixed, a, b, DOORH, H, mat, false));
}
function room(x0, z0, x1, z1, fMat, ceilColor) {
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const f = mesh(new THREE.PlaneGeometry(w, d), fMat, cx, 0, cz); f.rotation.x = -Math.PI / 2;
  const c = mesh(new THREE.PlaneGeometry(w, d), phong(ceilColor || 0x0a1517), cx, H, cz); c.rotation.x = Math.PI / 2;
}
function neonStrip(axis, fixed, a, b, y, mat, off) {
  const len = b - a, mid = (a + b) / 2;
  if (axis === 'x') box(len, 0.04, 0.03, mat, mid, y, fixed + (off || 0));
  else box(0.03, 0.04, len, mat, fixed + (off || 0), y, mid);
}

function makeDoor(o) {
  // o: {id, axis:'x'|'z', fixed, center, width, label, nameKey}
  const g = new THREE.Group(); scene.add(g);
  const half = o.width / 2, pw = half - 0.01, side = o.side || -0.2;
  const panels = [];
  for (let s = -1; s <= 1; s += 2) {
    const p = new THREE.Group();
    const glass = box(pw, DOORH - 0.05, 0.05, MAT.glass, 0, DOORH / 2, 0, p);
    box(pw, 0.04, 0.06, MAT.neonC, 0, DOORH - 0.06, 0, p);
    box(pw, 0.04, 0.06, MAT.neonC, 0, 0.04, 0, p);
    box(0.04, DOORH - 0.1, 0.06, MAT.neonC, -s * (pw / 2 - 0.02), DOORH / 2, 0, p);
    p.userData.base = s * (half / 2);
    g.add(p); panels.push(p);
  }
  const col = o.axis === 'x'
    ? addCollider(o.center - half, o.fixed - WT / 2, o.center + half, o.fixed + WT / 2, o.id)
    : addCollider(o.fixed - WT / 2, o.center - half, o.fixed + WT / 2, o.center + half, o.id);
  const d = { id: o.id, g, panels, axis: o.axis, fixed: o.fixed, center: o.center, width: o.width, side, t: 0, open: false, col, label: o.label };
  placeDoor(d);
  DOORS.push(d); return d;
}
function placeDoor(d) {
  d.panels.forEach(p => {
    const slide = p.userData.base + Math.sign(p.userData.base) * d.t * (d.width / 2 - 0.05);
    if (d.axis === 'x') { p.position.set(d.center + slide, 0, d.fixed + d.side); p.rotation.y = 0; }
    else { p.position.set(d.fixed + d.side, 0, d.center + slide); p.rotation.y = Math.PI / 2; }
  });
  d.col.on = d.t < 0.75;
}

/* ---------- Câbles 3D ---------- */
class Cable3D {
  constructor(hex, radius, seg, rad) {
    this.seg = seg || 56; this.rad = rad || 6; this.r = radius || 0.0075;
    const g = new THREE.BufferGeometry(), nv = (this.seg + 1) * this.rad;
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nv * 3), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nv * 3), 3));
    const idx = [];
    for (let i = 0; i < this.seg; i++) for (let j = 0; j < this.rad; j++) {
      const a = i * this.rad + j, b = i * this.rad + (j + 1) % this.rad, c = (i + 1) * this.rad + j, d = (i + 1) * this.rad + (j + 1) % this.rad;
      idx.push(a, c, b, b, c, d);
    }
    g.setIndex(idx);
    this.mat = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.5, emissive: hex, emissiveIntensity: 0.4, side: THREE.DoubleSide });
    this.group = new THREE.Group();
    this.tube = new THREE.Mesh(g, this.mat); this.tube.frustumCulled = false;
    const pm = new THREE.MeshPhongMaterial({ color: 0xd4dde0, shininess: 60 });
    this.plugs = [new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.011, 0.03), pm), new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.011, 0.03), pm)];
    this.group.add(this.tube, this.plugs[0], this.plugs[1]);
    scene.add(this.group);
  }
  update(points) {
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    const pts = curve.getSpacedPoints(this.seg);
    const pos = this.tube.geometry.attributes.position, nor = this.tube.geometry.attributes.normal;
    const T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), alt = new THREE.Vector3(1, 0, 0);
    for (let i = 0; i <= this.seg; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(this.seg, i + 1)];
      T.subVectors(b, a).normalize();
      N.crossVectors(T, Math.abs(T.y) > 0.95 ? alt : up).normalize();
      B.crossVectors(T, N).normalize();
      for (let j = 0; j < this.rad; j++) {
        const ang = j / this.rad * Math.PI * 2, c = Math.cos(ang), s = Math.sin(ang);
        const nx = N.x * c + B.x * s, ny = N.y * c + B.y * s, nz = N.z * c + B.z * s, k = i * this.rad + j;
        pos.setXYZ(k, pts[i].x + nx * this.r, pts[i].y + ny * this.r, pts[i].z + nz * this.r);
        nor.setXYZ(k, nx, ny, nz);
      }
    }
    pos.needsUpdate = true; nor.needsUpdate = true;
    // fiches aux extrémités
    [[0, 1], [this.seg, this.seg - 1]].forEach(([i, j], n) => {
      const d = new THREE.Vector3().subVectors(pts[j], pts[i]);
      const pl = this.plugs[n];
      pl.position.copy(pts[i]).addScaledVector(d.normalize(), -0.012);
      pl.quaternion.setFromUnitVectors(V(0, 0, 1), d.clone().negate());
    });
  }
  setVisible(v) { this.group.visible = v; }
  dispose() { scene.remove(this.group); this.tube.geometry.dispose(); this.mat.dispose(); this.plugs.forEach(p => { p.geometry.dispose(); p.material.dispose(); }); }
}

function anchorOf(e) {
  const d3 = DEV3D[e.dev];
  return d3.anchor(e.port);
}
const _tmp = V(0, 0, 0);
function wobble(id, n) { const s = Math.sin(id * 12.9898 + n * 78.233) * 43758.5453; return (s - Math.floor(s)) - 0.5; }

/* Chemin d'un câble entre deux ports branchés */
function pathBetween(a0, a1, id) {
  const p0 = a0.pos.clone(), p1 = a1.pos.clone();
  const pts = [p0, p0.clone().addScaledVector(a0.dir, 0.06)];
  const lowA = p0.clone().addScaledVector(a0.dir, 0.3); lowA.y = 0.03;
  const lowB = p1.clone().addScaledVector(a1.dir, 0.3); lowB.y = 0.03;
  pts.push(lowA);
  const dist = lowA.distanceTo(lowB), n = Math.max(1, Math.floor(dist / 1.1));
  for (let i = 1; i < n; i++) {
    const t = i / n, q = lowA.clone().lerp(lowB, t);
    q.x += wobble(id, i) * 0.4; q.z += wobble(id, i + 9) * 0.4; q.y = 0.03 + Math.abs(wobble(id, i + 3)) * 0.02;
    pts.push(q);
  }
  pts.push(lowB, p1.clone().addScaledVector(a1.dir, 0.06), p1);
  return pts;
}
/* Chemin d'un câble tenu : un bout branché, l'autre dans la main */
function pathToHand(a0, hand) {
  const p0 = a0.pos.clone();
  const pts = [p0, p0.clone().addScaledVector(a0.dir, 0.06)];
  const lowA = p0.clone().addScaledVector(a0.dir, 0.3); lowA.y = Math.max(0.03, Math.min(p0.y - 0.4, 0.6));
  pts.push(lowA);
  const toP = V(p0.x - hand.x, 0, p0.z - hand.z); const L = toP.length(); toP.normalize();
  const q1 = hand.clone().addScaledVector(toP, 0.7); q1.y = 0.04;
  const q2 = hand.clone().addScaledVector(toP, 0.25); q2.y = Math.max(0.12, hand.y - 0.5);
  const d = lowA.distanceTo(q1), n = Math.max(0, Math.floor(d / 1.2));
  for (let i = 1; i <= n; i++) { const q = lowA.clone().lerp(q1, i / (n + 1)); q.y = 0.04; pts.push(q); }
  if (L > 0.4) pts.push(q1);
  pts.push(q2, hand.clone());
  return pts;
}

/* ---------- Appareils ---------- */
function swPortLocal(pid) {
  let m;
  if ((m = pid.match(/^fa0\/(\d+)$/))) {
    const n = +m[1], col = Math.floor((n - 1) / 2);
    return { x: -0.2 + col * 0.0245, y: n % 2 ? 0.012 : -0.011, mat: MAT.portOff, w: 0.019 };
  }
  if (pid === 'gi0/1') return { x: 0.095, y: 0.0, mat: MAT.portSfp, w: 0.026 };
  if (pid === 'gi0/2') return { x: 0.127, y: 0.0, mat: MAT.portSfp, w: 0.026 };
  return { x: 0.19, y: -0.011, mat: MAT.portCon, w: 0.02 }; // con0
}

function makeSwitch(id, x, y, z, rotY) {
  const g = new THREE.Group(); g.position.set(x, y + 0.0125, z); g.rotation.y = rotY; g.scale.setScalar(1.35); scene.add(g);
  const W = 0.46, Hh = 0.055, D = 0.26, front = D / 2 + 0.001;
  box(W, Hh, D, MAT.sw, 0, 0, 0, g);
  box(W - 0.02, 0.003, D - 0.02, phong(0x39444a, { shininess: 80, specular: 0xaabbbb }), 0, Hh / 2 + 0.001, 0, g);
  cyl(0.032, 0.032, 0.003, phong(0x2b3338, { shininess: 80 }), -0.12, Hh / 2 + 0.004, -0.02, g, 24);
  const ring = mesh(new THREE.TorusGeometry(0.02, 0.0025, 6, 24), MAT.neonC, -0.12, Hh / 2 + 0.006, -0.02, g); ring.rotation.x = Math.PI / 2;
  const led = mesh(new THREE.SphereGeometry(0.006, 8, 8), MAT.portOn, 0.19, Hh / 2 + 0.003, -0.08, g);
  const ports = {};
  DEVICES[id].ports.forEach(p => {
    const l = swPortLocal(p.id);
    const m = box(l.w, 0.014, 0.004, l.mat, l.x, l.y, front, g);
    ports[p.id] = { m, base: l.mat };
  });
  const dir = V(0, 0, 1).applyAxisAngle(V(0, 1, 0), rotY);
  const anchor = pid => { const l = swPortLocal(pid); return { pos: g.localToWorld(V(l.x, l.y, front + 0.005)), dir: dir.clone() }; };
  let linked = [];
  TICKERS.push(t => {
    linked.forEach((e, i) => { e.m.material = Math.sin(t * 6.5 + i * 2.1) > -0.55 ? MAT.portOn : MAT.portDim; });
    led.visible = Math.sin(t * 3 + x) > -0.2;
  });
  DEV3D[id] = {
    g, anchor, center: g.position.clone().add(V(0, 0.05, 0)), ports,
    refresh() {
      linked = [];
      DEVICES[id].ports.forEach(p => {
        const e = ports[p.id], on = peer(id, p.id) && !(CFG[id].ifs[p.id] && CFG[id].ifs[p.id].shutdown);
        if (on) linked.push(e); else e.m.material = e.base;
      });
    }
  };
  return g;
}

function makeServer(x, z, rotY) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; scene.add(g);
  box(0.7, 1.9, 0.9, MAT.metal, 0, 0.97, 0, g);
  const slits = canvasTex(128, 256, (c, W, Hh) => {
    c.fillStyle = '#0c1214'; c.fillRect(0, 0, W, Hh);
    for (let i = 0; i < 28; i++) { c.fillStyle = '#060a0b'; c.fillRect(10, 10 + i * 8.4, W - 20, 3); }
  });
  const fp = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.7), basic(0xffffff, { map: slits }));
  fp.position.set(0, 0.97, 0.451); g.add(fp);
  const leds = [];
  for (let i = 0; i < 8; i++) {
    const m = box(0.012, 0.012, 0.004, basic(0x39ff7a), -0.26, 1.7 - i * 0.12, 0.455, g); leds.push(m);
  }
  box(0.4, 0.14, 0.02, MAT.dark, 0, 1.1, 0.46, g);
  box(0.03, 0.025, 0.012, MAT.portOff, -0.1, 1.1, 0.472, g);
  box(0.03, 0.025, 0.012, MAT.portSfp, 0.1, 1.1, 0.472, g);
  const sign = signMesh('SRV-APP', 0.5, 0.12, { color: '#35e0ff', size: 70 }); sign.position.set(0, 1.45, 0.455); g.add(sign);
  TICKERS.push(t => leds.forEach((m, i) => { m.visible = Math.sin(t * 5 + i * 1.7) > -0.3; }));
  const dir = V(0, 0, 1).applyAxisAngle(V(0, 1, 0), rotY);
  const loc = { eth0: V(-0.1, 1.1, 0.48), sfp0: V(0.1, 1.1, 0.48) };
  DEV3D.srv = {
    g, anchor: pid => ({ pos: g.localToWorld(loc[pid].clone()), dir: dir.clone() }),
    get center() { return g.localToWorld(V(0, 1.2, 0.3)); }, refresh() {}
  };
  const c = Math.abs(Math.sin(rotY)) > 0.5 ? [0.45, 0.35] : [0.35, 0.45];
  addCollider(x - c[0], z - c[1], x + c[0], z + c[1]);
}

function chair(x, z, rotY) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; scene.add(g);
  const m = phong(0x14181a, { shininess: 25 });
  box(0.46, 0.07, 0.46, m, 0, 0.5, 0, g);
  box(0.06, 0.52, 0.44, m, 0.25, 0.8, 0, g);
  cyl(0.03, 0.03, 0.46, MAT.metal, 0, 0.25, 0, g, 8);
  cyl(0.28, 0.28, 0.03, MAT.metal, 0, 0.04, 0, g, 5);
}

function pcScreenTex() {
  return canvasTex(256, 144, () => {});
}
function drawPcScreen(id) {
  const d3 = DEV3D[id]; if (!d3 || !d3.screen) return;
  const t = d3.screen, g = t.userData.ctx, W = 256, Hh = 144;
  g.fillStyle = '#02070a'; g.fillRect(0, 0, W, Hh);
  g.fillStyle = '#0c2a22'; g.fillRect(0, 0, W, 14);
  g.fillStyle = '#2dff8e'; g.font = '9px monospace'; g.fillText(DEVICES[id].name + '  ·  NetCore OS', 6, 10);
  const con = cables.find(c => c.type === 'console' && c.ends.some(e => e.dev === id));
  const lines = con
    ? ['C:\\> putty -serial COM1', 'Connecté : ' + DEVICES[con.ends.find(e => e.dev !== id).dev].name, 'Appuyez sur C pour ouvrir', 'la console.']
    : ['C:\\> putty -serial COM1', 'Erreur : COM1 non connecté.', 'Branchez un câble console.'];
  g.fillStyle = con ? '#2dff8e' : '#ffb02e'; g.font = '11px monospace';
  lines.forEach((l, i) => g.fillText(l, 8, 34 + i * 16));
  if (!con) { g.fillStyle = '#2dff8e'; g.fillRect(8, 34 + lines.length * 16 - 8, 7, 11); }
  t.needsUpdate = true;
}

function makeDesk(id, cx, cz, rotY, opts) {
  const g = new THREE.Group(); g.position.set(cx, 0, cz); g.rotation.y = rotY; scene.add(g);
  box(0.9, 0.05, 1.8, MAT.black, 0, 0.74, 0, g);
  box(0.9, 0.012, 1.8, MAT.neonG, 0, 0.714, 0, g).scale.set(1.002, 1, 1.002);
  box(0.8, 0.72, 0.04, MAT.metal, 0, 0.36, 0.88, g);
  box(0.8, 0.72, 0.04, MAT.metal, 0, 0.36, -0.88, g);
  box(0.6, 0.5, 0.02, MAT.dark, -0.2, 0.4, 0, g);
  // moniteur (écran tourné vers +x local)
  box(0.04, 0.2, 0.12, MAT.metal, -0.28, 0.86, 0, g);
  box(0.03, 0.36, 0.62, MAT.black, -0.28, 1.14, 0, g);
  const stex = pcScreenTex();
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.326), basic(0xffffff, { map: stex }));
  scr.rotation.y = Math.PI / 2; scr.position.set(-0.26, 1.14, 0); g.add(scr);
  const led = mesh(new THREE.SphereGeometry(0.008, 8, 8), MAT.portOn, -0.255, 0.97, 0.27, g);
  box(0.3, 0.004, 0.62, phong(0x070a0c), 0.15, 0.768, 0, g);
  box(0.16, 0.014, 0.4, phong(0x1d2427, { shininess: 40 }), 0.14, 0.78, 0, g);
  // mini PC avec ports
  box(0.2, 0.06, 0.2, MAT.sw, 0.0, 0.8, -0.62, g);
  const pm = opts.ports;
  const loc = {};
  Object.keys(pm).forEach(pid => {
    const z = pm[pid].z; loc[pid] = V(0.1, 0.805, -0.62 + z);
    box(0.004, 0.016, 0.022, pid === 'com1' ? MAT.portCon : MAT.portOff, 0.1, 0.805, -0.62 + z, g);
  });
  const dir = V(1, 0, 0).applyAxisAngle(V(0, 1, 0), rotY);
  DEV3D[id] = {
    g, screen: stex, anchor: pid => ({ pos: g.localToWorld(loc[pid].clone()), dir: dir.clone() }),
    get center() { return g.localToWorld(V(0.05, 0.85, -0.3)); }, refresh() { drawPcScreen(id); }
  };
  drawPcScreen(id);
  addCollider(cx - 0.47, cz - 0.92, cx + 0.47, cz + 0.92);
}

/* ---------- Décors ---------- */
let POSTER_TEX = [];
function initPosters() {
  const msgs = [['// ACCESS', 'GRANTED', 'ID 4F-22'], ['PORT SEC', 'ENABLED', 'sticky'], ['VLAN 10', 'COMPTA', 'trunk'],
    ['RACK 02', 'UPTIME', '99.98%'], ['NO LOGIN', 'NO ENTRY', '///']];
  POSTER_TEX = msgs.map(ms => canvasTex(128, 160, (g, W, Hh) => {
    g.fillStyle = '#031a10'; g.fillRect(0, 0, W, Hh);
    g.strokeStyle = '#2dff8e'; g.lineWidth = 6; g.strokeRect(4, 4, W - 8, Hh - 8);
    g.fillStyle = '#2dff8e'; g.font = '700 15px monospace'; g.textAlign = 'center';
    ms.forEach((l, i) => g.fillText(l, W / 2, 50 + i * 26));
    for (let i = 0; i < 4; i++) g.fillRect(24, 120 + i * 7, 20 + Math.random() * 70, 2);
  }));
  POSTER_TEX.push(canvasTex(160, 180, (g, W, Hh) => {
    g.fillStyle = '#04150e'; g.fillRect(0, 0, W, Hh);
    g.strokeStyle = '#2dff8e'; g.lineWidth = 4;
    g.beginPath(); g.arc(80, 70, 38, 0, 7); g.stroke(); g.beginPath(); g.arc(80, 70, 18, 0, 7); g.stroke();
    g.beginPath(); g.moveTo(80, 20); g.lineTo(80, 120); g.moveTo(30, 70); g.lineTo(130, 70); g.stroke();
    g.fillStyle = '#2dff8e'; g.font = '700 11px monospace'; g.textAlign = 'center';
    ['// CONNECT', '// ANALYZE', '// SECURE'].forEach((l, i) => g.fillText(l, 80, 140 + i * 14));
  }));
}
function poster(x, y, z, rotY, k, w, h) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w || 0.62, h || 0.78), basic(0xffffff, { map: POSTER_TEX[k % POSTER_TEX.length] }));
  m.position.set(x, y, z); m.rotation.y = rotY; scene.add(m);
}

let attackTex = null; const attackLines = [];
function initAttackMap() {
  attackTex = canvasTex(400, 480, () => {});
  const ips = () => [185, 91, 45, 103, 77].map(a => a + '.' + (Math.random() * 255 | 0) + '.x.x');
  const push = () => {
    const ok = Math.random() > 0.35;
    attackLines.push({ t: ips()[Math.random() * 5 | 0] + (ok ? '  BLOCKED' : '  ALERT'), ok });
    if (attackLines.length > 22) attackLines.shift();
  };
  for (let i = 0; i < 22; i++) push();
  let acc = 0;
  TICKERS.push((t, dt) => {
    acc += dt; if (acc < 0.45) return; acc = 0; push();
    const g = attackTex.userData.ctx;
    g.fillStyle = '#020a06'; g.fillRect(0, 0, 400, 480);
    g.strokeStyle = '#2dff8e'; g.lineWidth = 6; g.strokeRect(4, 4, 392, 472);
    g.fillStyle = '#2dff8e'; g.font = '700 26px monospace'; g.fillText('LIVE ATTACK MAP', 18, 44);
    g.fillRect(18, 56, 364, 2);
    g.font = '15px monospace';
    attackLines.forEach((l, i) => { g.fillStyle = l.ok ? '#2dff8e' : '#ff5468'; g.fillText('> ' + l.t, 18, 86 + i * 19.5); });
    g.fillStyle = 'rgba(45,255,142,.12)'; g.fillRect(0, (t * 90) % 480, 400, 6);
    attackTex.needsUpdate = true;
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 2.28), basic(0xffffff, { map: attackTex }));
  m.position.set(-6, 1.85, -8.84); scene.add(m);
}

function skylineTex() {
  return canvasTex(1024, 256, (g, W, Hh) => {
    const gr = g.createLinearGradient(0, 0, 0, Hh); gr.addColorStop(0, '#07101e'); gr.addColorStop(1, '#16283f');
    g.fillStyle = gr; g.fillRect(0, 0, W, Hh);
    for (let x = 0; x < W;) {
      const w = 30 + Math.random() * 60, h = 60 + Math.random() * 150;
      g.fillStyle = '#0a1320'; g.fillRect(x, Hh - h, w, h);
      for (let y = Hh - h + 8; y < Hh - 6; y += 12) for (let xx = x + 5; xx < x + w - 6; xx += 10)
        if (Math.random() > 0.55) { g.fillStyle = Math.random() > 0.5 ? '#ffd27a' : '#8fd8ff'; g.fillRect(xx, y, 4, 6); }
      x += w + 4;
    }
  });
}

function plant(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  cyl(0.24, 0.18, 0.5, phong(0x15191b), 0, 0.25, 0, g);
  const leaf = phong(0x1c7a46, { shininess: 20 });
  for (let i = 0; i < 7; i++) {
    const l = mesh(new THREE.SphereGeometry(0.2, 8, 6), leaf, Math.cos(i * 0.9) * 0.2, 0.75 + (i % 3) * 0.2, Math.sin(i * 0.9) * 0.2, g);
    l.scale.set(1, 1.5, 0.35); l.rotation.z = Math.cos(i) * 0.5; l.rotation.y = i;
  }
  addCollider(x - 0.25, z - 0.25, x + 0.25, z + 0.25);
}

/* ---------- Personnages ---------- */
function makePerson(o) {
  const g = new THREE.Group();
  const skin = phong(o.skin || 0xd9a87a, { shininess: 14, emissive: o.skin || 0xd9a87a, emissiveIntensity: 0.18 }), cloth = phong(o.cloth || 0x222a30), pants = phong(o.pants || 0x15191c), shoe = phong(0x0b0c0d);
  const mkLeg = x => {
    const l = new THREE.Group(); l.position.set(x, 0.84, 0); g.add(l);
    box(0.15, 0.78, 0.16, pants, 0, -0.4, 0, l); box(0.16, 0.08, 0.26, shoe, 0, -0.8, 0.04, l); return l;
  };
  const legL = mkLeg(-0.1), legR = mkLeg(0.1);
  const torso = box(0.46, 0.64, 0.25, cloth, 0, 1.17, 0, g);
  const mkArm = x => {
    const a = new THREE.Group(); a.position.set(x, 1.44, 0); g.add(a);
    box(0.11, 0.58, 0.13, cloth, 0, -0.29, 0, a); mesh(new THREE.SphereGeometry(0.06, 8, 8), skin, 0, -0.62, 0, a); return a;
  };
  const armL = mkArm(-0.3), armR = mkArm(0.3);
  cyl(0.06, 0.06, 0.08, skin, 0, 1.52, 0, g, 8);
  const head = new THREE.Group(); head.position.set(0, 1.68, 0); g.add(head);
  const skull = mesh(new THREE.SphereGeometry(0.15, 16, 12), skin, 0, 0, 0, head); skull.scale.set(1, 1.12, 1);
  const eye = phong(0x0a0a0a);
  mesh(new THREE.SphereGeometry(0.016, 6, 6), eye, -0.055, 0.02, 0.135, head);
  mesh(new THREE.SphereGeometry(0.016, 6, 6), eye, 0.055, 0.02, 0.135, head);
  if (o.hair !== null) {
    const hm = phong(o.hair || 0x111111);
    const h = mesh(new THREE.SphereGeometry(0.158, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), hm, 0, 0.035, -0.012, head); h.scale.set(1, 1.1, 1.04);
  }
  if (o.beard) { const b = mesh(new THREE.SphereGeometry(0.15, 12, 8, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.35), phong(0x16110e), 0, -0.01, 0.01, head); b.scale.set(1.02, 1.1, 1.05); }
  if (o.glasses) {
    const gm = phong(0x050505);
    [-0.055, 0.055].forEach(x => { const r = mesh(new THREE.TorusGeometry(0.036, 0.006, 6, 14), gm, x, 0.02, 0.145, head); });
    box(0.04, 0.006, 0.006, gm, 0, 0.025, 0.148, head);
  }
  if (o.tie) box(0.05, 0.4, 0.02, phong(o.tie), 0, 1.22, 0.135, g);
  if (o.hood) { const hd = mesh(new THREE.TorusGeometry(0.15, 0.05, 8, 16), cloth, 0, 1.55, -0.03, g); hd.rotation.x = Math.PI / 2; }
  if (o.pack) box(0.34, 0.42, 0.14, phong(o.pack), 0, 1.2, -0.2, g);
  if (o.cap) { const c = mesh(new THREE.SphereGeometry(0.16, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), phong(o.cap), 0, 0.05, 0, head); c.scale.set(1, 0.9, 1.05); box(0.2, 0.012, 0.12, phong(o.cap), 0, 0.04, 0.16, head); }
  if (o.vest) box(0.48, 0.5, 0.27, phong(o.vest), 0, 1.2, 0, g);
  return { g, legL, legR, armL, armR, head, torso };
}

function addNPC(o) {
  const p = makePerson(o);
  p.g.position.set(o.x, 0, o.z); p.g.rotation.y = o.yaw || 0;
  scene.add(p.g);
  const n = Object.assign({ p, x: o.x, z: o.z, yaw: o.yaw || 0, home: o.yaw || 0, phase: Math.random() * 6, look: true, path: null, wp: 0, col: null }, { id: o.id, name: o.name, role: o.role });
  if (o.solid) n.col = addCollider(o.x - 0.28, o.z - 0.28, o.x + 0.28, o.z + 0.28, 'npc:' + o.id);
  NPCS.push(n); return n;
}

/* ---------- Construction de la scène ---------- */
function buildWorld(canvas) {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02090a);
  scene.fog = new THREE.Fog(0x03100f, 7, 36);
  camera = new THREE.PerspectiveCamera(72, 1, 0.05, 80);
  scene.add(camera);
  scene.add(new THREE.AmbientLight(0x6aa89c, 0.55));
  initMaterials(); initPosters();

  /* ===== SALLE TECHNIQUE (x -8..8, z -9..5) ===== */
  room(-8, -9, 8, 5, floorMat(16, 14, '#0e1b20', '#173540', 45), 0x0a1517);
  buildWall('x', -9, -8, 8);
  buildWall('z', -8, -9, 5);
  buildWall('z', 8, -9, 5);
  buildWall('x', 5, -8, 8, [[-1.2, 1.2]]);
  [[-8, 'z'], [8, 'z']].forEach(([f, ax]) => neonStrip(ax, f, -9, 5, 0.12, MAT.neonC, f < 0 ? 0.17 : -0.17));
  neonStrip('x', -9, -8, 8, 0.12, MAT.neonC, 0.17);
  neonStrip('x', -9, -8, 8, H - 0.12, MAT.neonG, 0.17);
  for (let i = 0; i < 5; i++) { const t = box(1.6, 0.03, 0.5, MAT.light, -6 + i * 3, H - 0.02, -2.5); }
  for (let i = 0; i < 5; i++) { box(1.6, 0.03, 0.5, MAT.light, -6 + i * 3, H - 0.02, 2); }
  light(0x8ffff0, 1.0, 17, 0, 2.9, -1);
  light(0x8ffff0, 0.8, 13, 0, 2.9, -6.5);
  light(0x2dff8e, 0.8, 8, 6.5, 2.4, -2.5);
  light(0xbfffee, 1.2, 6.5, 0, 1.9, -7.0);
  light(0xffa733, 0.8, 6.5, -6.4, 2.6, 0.5);

  // Établi avec les deux switchs
  const benchTop = 0.9;
  box(6.6, 0.06, 0.82, MAT.black, 0, benchTop, -8.2);
  box(6.6, 0.012, 0.82, MAT.neonC, 0, benchTop - 0.04, -8.2).scale.set(1.001, 1, 1.001);
  [[-3.2, -8.5], [3.2, -8.5], [-3.2, -7.9], [3.2, -7.9]].forEach(([x, z]) => box(0.05, benchTop, 0.05, MAT.metal, x, benchTop / 2, z));
  box(6.6, 0.04, 0.03, MAT.metal, 0, 1.45, -8.58);
  addCollider(-3.3, -8.62, 3.3, -7.78);
  makeSwitch('sw1', -1.5, benchTop + 0.0425, -8.15, 0);
  makeSwitch('sw2', 1.5, benchTop + 0.0425, -8.15, 0);
  [[-3.0, 0.3], [2.9, 0.25]].forEach(([x, r]) => box(0.3, 0.04, 0.2, MAT.dark, x, benchTop + 0.05, -8.2));

  // Serveur contre le mur est
  makeServer(7.35, -6.3, -Math.PI / 2);
  const sl = signMesh('SERVEUR', 1.7, 0.4, { color: '#35e0ff', size: 110 }); sl.position.set(7.84, 2.55, -6.3); sl.rotation.y = -Math.PI / 2; scene.add(sl);

  // Postes de travail
  makeDesk('pc1', 6.4, -2.5, Math.PI, { ports: { eth0: { z: -0.05 }, com1: { z: 0.06 } } });
  chair(5.2, -2.5, Math.PI);
  makeDesk('pc2', -6.4, -5.0, 0, { ports: { eth0: { z: 0.0 } } });
  chair(-5.2, -5.0, 0);

  // Affiches
  [-3.7, -2.5, -1.3].forEach((z, i) => poster(7.84, 1.9, z, -Math.PI / 2, i));
  poster(7.84, 1.9, 0.0, -Math.PI / 2, 5, 0.7, 0.8);
  [-6.2, -5.0, -3.8].forEach((z, i) => poster(-7.84, 1.9, z, Math.PI / 2, i + 2));
  [-5, 4.6, 5.8].forEach((x, i) => poster(x, 1.95, -8.84, 0, i + 1));
  initAttackMap();

  // Cabine vitrée « Technical & Repair »
  box(0.05, 2.5, 4, MAT.glass, -5.8, 1.25, 0.5);
  box(2.2, 2.5, 0.05, MAT.glass, -6.9, 1.25, -1.5);
  box(2.2, 2.5, 0.05, MAT.glass, -6.9, 1.25, 2.5);
  box(0.07, 0.05, 4.05, MAT.neonA, -5.8, 2.5, 0.5);
  box(0.07, 0.05, 4.05, MAT.neonA, -5.8, 0.04, 0.5);
  addCollider(-5.85, -1.55, -5.75, 2.55); addCollider(-8, -1.55, -5.75, -1.45); addCollider(-8, 2.45, -5.75, 2.55);
  const tr = signMesh('TECHNICAL & REPAIR', 3.6, 0.52, { color: '#ffb02e', size: 90, bg: 'rgba(30,14,0,0.92)' });
  tr.position.set(-5.76, 2.85, 0.5); tr.rotation.y = Math.PI / 2; scene.add(tr);
  box(1.0, 0.9, 0.6, MAT.black, -7.4, 0.45, 0.5);
  box(0.3, 0.05, 0.4, MAT.sw, -7.4, 0.93, 0.35);
  box(0.2, 0.2, 0.3, MAT.dark, -7.4, 1.0, 0.8);
  addCollider(-7.9, 0.2, -6.9, 0.8);

  // Panneau d'entrée au-dessus de la porte
  const nc = signMesh('NETWORK COMPANY', 3.6, 0.55, { color: '#2dff8e', size: 96 });
  nc.position.set(0, 2.85, 4.82); nc.rotation.y = Math.PI; scene.add(nc);
  const nc2 = signMesh('NETWORK COMPANY', 3.6, 0.55, { color: '#2dff8e', size: 96 });
  nc2.position.set(0, 2.85, 5.18); scene.add(nc2);

  makeDoor({ id: 'doorLab', axis: 'x', fixed: 5, center: 0, width: 2.4, side: -0.2, label: 'Porte d’entrée (Network Company)' });

  /* ===== HALL D'ACCUEIL (x -8..8, z 5..19) ===== */
  room(-8, 5, 8, 19, floorMat(16, 14, '#0f2a3a', '#1c4c66', 120), 0x08121a);
  buildWall('z', -8, 5, 19, [], MAT.wallLobby);
  buildWall('x', 19, -8, 8, [], MAT.wallLobby);
  buildWall('z', 8, 5, 19, [[10.8, 13.2]], MAT.wallLobby);
  for (let i = 0; i < 14; i++) {
    const p = box(0.9 + (i % 3) * 0.4, 0.03, 0.9 + (i % 2) * 0.5, basic(0x6fe8ff), -6 + (i * 2.7) % 13, H - 0.02, 7 + (i * 1.9) % 11);
  }
  box(5.2, 1.1, 0.06, MAT.neonG, 0, 2.2, 5.28);
  light(0x7fd8ff, 1.0, 17, 0, 2.9, 12);
  light(0x2dff8e, 0.8, 9, 0, 2.6, 6.2);
  // accueil
  solidBox(4.2, 1.05, 0.9, MAT.black, -3.8, 0.52, 14.5);
  box(4.2, 0.05, 0.05, MAT.neonG, -3.8, 0.9, 14.03);
  box(0.5, 0.35, 0.03, MAT.dark, -3.8, 1.25, 14.7);
  poster(-7.84, 1.9, 14, Math.PI / 2, 4, 1.2, 1.4);
  signMesh('ACCUEIL', 2, 0.4, { color: '#35e0ff', size: 100 });
  const ac = signMesh('ACCUEIL', 1.8, 0.4, { color: '#35e0ff', size: 100 }); ac.position.set(-3.8, 2.3, 18.84); ac.rotation.y = Math.PI; scene.add(ac);
  // canapé et table basse
  const sofa = phong(0x15191d, { shininess: 25 });
  solidBox(2.3, 0.45, 0.95, sofa, 3.6, 0.28, 16.5);
  box(2.3, 0.55, 0.2, sofa, 3.6, 0.7, 16.9);
  box(0.2, 0.3, 0.95, sofa, 2.55, 0.5, 16.5); box(0.2, 0.3, 0.95, sofa, 4.65, 0.5, 16.5);
  solidBox(1.0, 0.04, 0.6, MAT.black, 3.6, 0.38, 15.0);
  [[3.2, 14.8], [4.0, 14.8], [3.2, 15.2], [4.0, 15.2]].forEach(([x, z]) => box(0.04, 0.36, 0.04, MAT.metal, x, 0.18, z));
  plant(6.9, 6.4); plant(-6.9, 6.4); plant(6.9, 18.0); plant(-6.9, 18.0);
  makeDoor({ id: 'doorLounge', axis: 'z', fixed: 8, center: 12, width: 2.4, side: -0.2, label: 'Porte de la cafétéria' });
  const cf = signMesh('CAFÉTÉRIA', 2.2, 0.4, { color: '#ffb02e', size: 96, bg: 'rgba(30,14,0,0.92)' });
  cf.position.set(7.84, 2.85, 12); cf.rotation.y = -Math.PI / 2; scene.add(cf);

  /* ===== CAFÉTÉRIA (x 8..20, z 5..19) ===== */
  room(8, 5, 20, 19, woodMat(12, 14), 0x120c09);
  buildWall('x', 5, 8, 20, [], MAT.wallLounge);
  buildWall('z', 20, 5, 19, [], MAT.wallLounge);
  buildWall('x', 19, 8, 20, [], MAT.wallLounge);
  light(0xffb877, 1.1, 15, 14, 2.6, 12);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(9, 2), basic(0xffffff, { map: skylineTex() }));
  sky.position.set(19.82, 1.7, 12); sky.rotation.y = -Math.PI / 2; scene.add(sky);
  box(0.06, 2.1, 9.1, MAT.black, 19.84, 1.7, 12);
  for (let i = 0; i < 5; i++) box(0.5, 0.02, 0.5, basic(0xffcf8a), 10 + i * 2, H - 0.02, 8 + (i % 2) * 6);
  // comptoir et machine à café
  solidBox(5.0, 0.95, 0.65, phong(0x1a1412), 14, 0.48, 5.55);
  box(5.0, 0.05, 0.7, MAT.black, 14, 0.97, 5.55);
  const cm = new THREE.Group(); cm.position.set(12.9, 1.0, 5.5); scene.add(cm);
  box(0.36, 0.5, 0.34, phong(0x20262a, { shininess: 70 }), 0, 0.25, 0, cm);
  box(0.2, 0.03, 0.04, MAT.neonA, 0, 0.36, 0.18, cm);
  mesh(new THREE.SphereGeometry(0.012, 6, 6), basic(0xff3b3b), 0.12, 0.45, 0.18, cm);
  cyl(0.04, 0.035, 0.08, phong(0xe8e8e8), -0.05, 0.08, 0.19, cm, 10);
  [[14.6, 5.5], [15.1, 5.5], [15.6, 5.55]].forEach(([x, z]) => cyl(0.04, 0.035, 0.09, phong(0xe8e8e8), x, 1.05, z, undefined, 10));
  solidBox(0.9, 1.9, 0.65, phong(0x2a3236, { shininess: 60 }), 17.6, 0.96, 5.6);
  // table ronde et tabourets
  cyl(0.7, 0.7, 0.05, MAT.black, 14, 0.9, 12);
  cyl(0.05, 0.05, 0.88, MAT.metal, 14, 0.45, 12, undefined, 8);
  cyl(0.38, 0.38, 0.04, MAT.metal, 14, 0.02, 12);
  addCollider(13.3, 11.3, 14.7, 12.7);
  [[12.7, 12], [15.3, 12.3]].forEach(([x, z]) => { cyl(0.2, 0.2, 0.05, phong(0x6b2a22), x, 0.55, z); cyl(0.03, 0.03, 0.54, MAT.metal, x, 0.27, z, undefined, 6); addCollider(x - .2, z - .2, x + .2, z + .2); });
  plant(19.0, 6.2); plant(19.0, 17.8);
  poster(11.0, 1.9, 5.3, 0, 1); poster(12.0, 1.9, 5.3, 0, 3);
  box(0.9, 0.5, 0.05, MAT.dark, 9.0, 1.9, 18.82);

  /* ===== PERSONNAGES ===== */
  addNPC({ id: 'manager', name: 'M. Diallo', role: 'Responsable réseau', x: 3.2, z: -0.6, yaw: Math.PI * 0.75, solid: true,
    skin: 0xc98f66, cloth: 0x0c0d0f, pants: 0x0c0d0f, tie: 0x1fbf6a, glasses: true, beard: true, hair: 0x0f0a07 });
  addNPC({ id: 'tech', name: 'Eren', role: 'Technicien de réparation', x: -7.2, z: 0.5, yaw: Math.PI / 2,
    skin: 0xd2a07a, cloth: 0x1e4f52, pants: 0x1c2326, cap: 0x113a3d, hair: null });
  const kaan = addNPC({ id: 'kaan', name: 'Kaan', role: 'Stagiaire', x: -3, z: 9, yaw: 0, solid: false,
    skin: 0xe0b48e, cloth: 0x2f9a4a, pants: 0x1a1f22, hood: true, pack: 0x1f6a34, hair: 0x2a1a10 });
  kaan.path = [[-3, 9], [4, 9], [4, 15], [-3, 15]]; kaan.speed = 0.9;
  addNPC({ id: 'lea', name: 'Léa', role: 'Analyste sécurité', x: 13.2, z: 10.9, yaw: -Math.PI * 0.25, solid: true,
    skin: 0xb9805a, cloth: 0x7a2840, pants: 0x14181b, hair: 0x120d0a });
  addNPC({ id: 'omar', name: 'Omar', role: 'Administrateur systèmes', x: 14.9, z: 11.0, yaw: Math.PI * 0.75, solid: true,
    skin: 0x8d5a3b, cloth: 0x1f3a5c, pants: 0x1c2024, beard: true, hair: 0x0a0807 });

  /* ===== MAINS (vue à la première personne) ===== */
  buildHands();
  camera.add(new THREE.PointLight(0x9fffe8, 0.22, 3.6, 1.8));
  scene.updateMatrixWorld(true);
  if (window.matchMedia && matchMedia('(pointer: coarse)').matches) renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
}

function buildHands() {
  handsRig = new THREE.Group(); camera.add(handsRig);
  const skin = phong(0xc99373, { shininess: 25, emissive: 0x4a2c1c, emissiveIntensity: 0.55 });
  const glove = phong(0x1b2022, { shininess: 40, emissive: 0x0b0e0f, emissiveIntensity: 1 });
  const sleeve = phong(0x1d302d, { emissive: 0x08110f, emissiveIntensity: 1 });
  const hand = new THREE.Group(); hand.position.set(0.24, -0.25, -0.5); hand.rotation.set(0.0, 0.3, 0.12); handsRig.add(hand);
  box(0.082, 0.03, 0.085, glove, 0, 0, 0.0, hand);                // paume gantée
  box(0.084, 0.012, 0.045, glove, 0, 0.018, 0.012, hand);         // dos de la main
  const lens = [0.05, 0.058, 0.054, 0.042];
  lens.forEach((len, i) => {                                      // quatre doigts à deux phalanges
    const f1 = new THREE.Group(); f1.position.set(-0.03 + i * 0.02, 0, -0.042); f1.rotation.x = -0.32 - i * 0.05; hand.add(f1);
    box(0.018, 0.02, len, glove, 0, 0, -len / 2, f1);
    const f2 = new THREE.Group(); f2.position.set(0, 0, -len); f2.rotation.x = -0.7; f1.add(f2);
    box(0.016, 0.017, len * 0.85, skin, 0, 0, -len * 0.42, f2);
  });
  const th = new THREE.Group(); th.position.set(-0.044, 0.004, -0.01); th.rotation.set(-0.2, 0.8, 0); hand.add(th);
  box(0.021, 0.021, 0.048, glove, 0, 0, -0.024, th);
  const th2 = new THREE.Group(); th2.position.set(0, 0, -0.048); th2.rotation.x = -0.4; th.add(th2);
  box(0.018, 0.018, 0.038, skin, 0, 0, -0.019, th2);
  const arm = cyl(0.028, 0.036, 0.5, skin, 0.05, -0.03, 0.3, hand, 10); arm.rotation.x = Math.PI / 2 - 0.2;
  const sl = cyl(0.044, 0.056, 0.5, sleeve, 0.058, -0.045, 0.62, hand, 10); sl.rotation.x = Math.PI / 2 - 0.2;
  handTip = new THREE.Object3D(); handTip.position.set(-0.02, 0.0, -0.1); hand.add(handTip);
  handsRig.userData.hand = hand;
}

/* Câble tenu sans extrémité branchée : pend de la main */
function setHandCable(type) {
  if (handCable) { handsRig.userData.hand.remove(handCable); handCable.traverse(o => { if (o.geometry) o.geometry.dispose(); }); handCable = null; }
  if (!type) return;
  const hex = CABLE_TYPES[type].color, g = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3([V(0, 0, -0.07), V(0.01, -0.05, -0.1), V(0.02, -0.18, -0.06), V(-0.02, -0.4, 0.1), V(-0.06, -0.7, 0.3)]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.007, 6, false), new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: 0.4, roughness: 0.5 })));
  const plug = box(0.014, 0.011, 0.03, new THREE.MeshPhongMaterial({ color: 0xd4dde0 }), 0, 0, -0.07, g);
  handsRig.userData.hand.add(g); handCable = g;
}

/* ---------- Câbles dans le monde ---------- */
const cableMeshes = new Map();
let heldMesh = null, heldMeshType = null;
function syncCableMeshes() {
  const ids = new Set(cables.map(c => c.id));
  for (const [id, cm] of cableMeshes) if (!ids.has(id)) { cm.dispose(); cableMeshes.delete(id); }
  cables.forEach(c => {
    if (cableMeshes.has(c.id)) return;
    const cm = new Cable3D(CABLE_TYPES[c.type].color, 0.0075);
    cm.update(pathBetween(anchorOf(c.ends[0]), anchorOf(c.ends[1]), c.id));
    cableMeshes.set(c.id, cm);
  });
  Object.keys(DEV3D).forEach(k => DEV3D[k].refresh());
}
const _hp = V(0, 0, 0);
function updateHeldCable() {
  const plugged = held && (held.ends[0] || held.ends[1]);
  if (!held) { setHandCable(null); if (heldMesh) { heldMesh.dispose(); heldMesh = null; } handCableType = null; return; }
  if (!plugged) {
    if (heldMesh) { heldMesh.dispose(); heldMesh = null; }
    if (handCableType !== held.type) { setHandCable(held.type); handCableType = held.type; }
    return;
  }
  if (handCableType) { setHandCable(null); handCableType = null; }
  if (!heldMesh || heldMeshType !== held.type) {
    if (heldMesh) heldMesh.dispose();
    heldMesh = new Cable3D(CABLE_TYPES[held.type].color, 0.0075); heldMeshType = held.type;
  }
  const e = held.ends[0] || held.ends[1];
  handTip.getWorldPosition(_hp);
  heldMesh.update(pathToHand(anchorOf(e), _hp));
}
let handCableType = null;
function resetHeldVisuals() { handCableType = null; }

/* ---------- Mise à jour par image ---------- */
function updateWorld(t, dt, player) {
  TICKERS.forEach(f => f(t, dt));
  DOORS.forEach(d => {
    const target = d.open ? 1 : 0;
    if (d.t !== target) { d.t += Math.sign(target - d.t) * Math.min(Math.abs(target - d.t), dt * 1.6); placeDoor(d); }
  });
  NPCS.forEach(n => {
    const p = n.p; let moving = false;
    if (n.path) {
      const wp = n.path[n.wp], dx = wp[0] - n.x, dz = wp[1] - n.z, d = Math.hypot(dx, dz);
      if (d < 0.15) n.wp = (n.wp + 1) % n.path.length;
      else {
        const sp = n.speed * dt; n.x += dx / d * sp; n.z += dz / d * sp; moving = true;
        const ty = Math.atan2(dx, dz); let dy = ty - n.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); n.yaw += dy * Math.min(1, dt * 5);
      }
      if (Math.hypot(player.x - n.x, player.z - n.z) < 1.4) moving = false; // s'arrête devant le joueur
    } else if (n.look) {
      const dx = player.x - n.x, dz = player.z - n.z, dist = Math.hypot(dx, dz);
      let ty = dist < 5 ? Math.atan2(dx, dz) : n.home;
      let dy = ty - n.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); n.yaw += dy * Math.min(1, dt * 3);
    }
    p.g.position.set(n.x, 0, n.z); p.g.rotation.y = n.yaw;
    const k = t * 2 + n.phase;
    if (moving) {
      const s = Math.sin(t * 6 + n.phase) * 0.6;
      p.legL.rotation.x = s; p.legR.rotation.x = -s; p.armL.rotation.x = -s * 0.8; p.armR.rotation.x = s * 0.8;
    } else {
      p.legL.rotation.x = p.legR.rotation.x = 0;
      p.armL.rotation.x = Math.sin(k) * 0.04; p.armR.rotation.x = -Math.sin(k) * 0.04;
      p.torso.scale.y = 1 + Math.sin(k * 0.9) * 0.01;
    }
    p.head.rotation.y = Math.sin(t * 0.7 + n.phase) * 0.12;
    if (n.col) { n.col.x0 = n.x - 0.28; n.col.x1 = n.x + 0.28; n.col.z0 = n.z - 0.28; n.col.z1 = n.z + 0.28; }
  });
  updateHeldCable();
}

function resizeWorld() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w / h < 0.8 ? 80 : 72;
  camera.updateProjectionMatrix();
}
