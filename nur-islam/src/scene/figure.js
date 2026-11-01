// Mannequin abstrait (sans visage) qui exécute les postures de la prière.
// Chaque posture est définie par quelques points clés ; les genoux et les coudes sont calculés par cinématique inverse
// à deux segments, donc les membres gardent toujours des proportions justes, même en pleine transition.
import { THREE, canvasTexture } from './engine.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { glowTexture } from './sky.js';
import { clamp } from '../core/dom.js';

const D = { thigh: 0.44, shin: 0.44, torso: 0.5, neck: 0.2, upper: 0.3, fore: 0.26, hipW: 0.09, shW: 0.19 };

// z : vers la Qibla, y : haut, x : côté (la droite du priant est −x).
// Les clés : hip[y,z] torso(°) head(°) hands{R,L}[x,y,z] elbow[x,y,z] ankle{R,L}[x,y,z] toe{R,L}[y,z] knee[y,z] yaw finger
const mir = (a) => [-a[0], a[1], a[2]];
const stance = { R: [-0.12, 0.08, 0], L: [0.12, 0.08, 0] };
const toesStand = { R: [0.03, 0.17], L: [0.03, 0.17] };

export const POSES = {
  stand: { hip: [0.955, 0], torso: 0, head: 8, hR: [-0.2, 0.9, 0.04], hL: [0.2, 0.9, 0.04], elbow: [0.4, -0.2, -0.5], aR: stance.R, aL: stance.L, tR: toesStand.R, tL: toesStand.L, knee: [0, 0, 1], yaw: 0, finger: 0 },
  takbir: { hip: [0.955, 0], torso: 0, head: 6, hR: [-0.2, 1.5, 0.17], hL: [0.2, 1.5, 0.17], elbow: [1, -0.6, -0.5], aR: stance.R, aL: stance.L, tR: toesStand.R, tL: toesStand.L, knee: [0, 0, 1], yaw: 0, finger: 0 },
  qiyam: { hip: [0.955, 0], torso: 0, head: 14, hR: [-0.02, 1.27, 0.2], hL: [0.12, 1.25, 0.18], elbow: [0.9, -0.5, -0.5], aR: stance.R, aL: stance.L, tR: toesStand.R, tL: toesStand.L, knee: [0, 0, 1], yaw: 0, finger: 0 },
  ruku: { hip: [0.945, -0.12], torso: 90, head: 80, hR: [-0.15, 0.56, 0.04], hL: [0.15, 0.56, 0.04], elbow: [0.5, 0.1, -0.1], aR: stance.R, aL: stance.L, tR: toesStand.R, tL: toesStand.L, knee: [0, 0, 1], yaw: 0, finger: 0 },
  itidal: { hip: [0.955, 0], torso: 0, head: 8, hR: [-0.22, 0.92, 0.03], hL: [0.22, 0.92, 0.03], elbow: [0.4, -0.2, -0.5], aR: stance.R, aL: stance.L, tR: toesStand.R, tL: toesStand.L, knee: [0, 0, 1], yaw: 0, finger: 0 },
  sujud: { hip: [0.45, -0.22], torso: 110, head: 135, hR: [-0.17, 0.04, 0.4], hL: [0.17, 0.04, 0.4], elbow: [1, 0.5, -0.2], aR: [-0.12, 0.2, -0.42], aL: [0.12, 0.2, -0.42], tR: [0.02, -0.36], tL: [0.02, -0.36], knee: [0.1, -0.6, 0.8], yaw: 0, finger: 0 },
  jalsa: { hip: [0.22, -0.34], torso: 4, head: 14, hR: [-0.12, 0.3, 0.02], hL: [0.12, 0.3, 0.02], elbow: [0.6, 0.2, -0.5], aR: [-0.2, 0.2, -0.36], aL: [0.1, 0.06, -0.39], tR: [0.02, -0.3], tL: [0.03, -0.62], knee: [0.1, -0.3, 0.9], yaw: 0, finger: 0 },
  tashahhud: { hip: [0.22, -0.34], torso: 4, head: 14, hR: [-0.12, 0.32, 0.1], hL: [0.12, 0.3, 0.02], elbow: [0.6, 0.2, -0.5], aR: [-0.2, 0.2, -0.36], aL: [0.1, 0.06, -0.39], tR: [0.02, -0.3], tL: [0.03, -0.62], knee: [0.1, -0.3, 0.9], yaw: 0, finger: 1 },
  taslimR: { hip: [0.22, -0.34], torso: 4, head: 8, hR: [-0.12, 0.3, 0.02], hL: [0.12, 0.3, 0.02], elbow: [0.6, 0.2, -0.5], aR: [-0.2, 0.2, -0.36], aL: [0.1, 0.06, -0.39], tR: [0.02, -0.3], tL: [0.03, -0.62], knee: [0.1, -0.3, 0.9], yaw: -80, finger: 0 },
  taslimL: { hip: [0.22, -0.34], torso: 4, head: 8, hR: [-0.12, 0.3, 0.02], hL: [0.12, 0.3, 0.02], elbow: [0.6, 0.2, -0.5], aR: [-0.2, 0.2, -0.36], aL: [0.1, 0.06, -0.39], tR: [0.02, -0.3], tL: [0.03, -0.62], knee: [0.1, -0.3, 0.9], yaw: 80, finger: 0 },
};

const KEYS = ['hip', 'torso', 'head', 'hR', 'hL', 'elbow', 'aR', 'aL', 'tR', 'tL', 'knee', 'yaw', 'finger'];
const flat = (p) => KEYS.flatMap((k) => (Array.isArray(p[k]) ? p[k] : [p[k]]));
const lens = KEYS.map((k) => (Array.isArray(POSES.stand[k]) ? POSES.stand[k].length : 1));
const unflat = (a) => { const o = {}; let i = 0; KEYS.forEach((k, j) => { o[k] = lens[j] === 1 ? a[i] : a.slice(i, i + lens[j]); i += lens[j]; }); return o; };

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const Y = V(0, 1, 0);

function ik(root, target, l1, l2, polePoint) {
  const d = target.clone().sub(root);
  let dist = d.length();
  const maxd = l1 + l2 - 0.002;
  if (dist > maxd) { d.multiplyScalar(maxd / dist); dist = maxd; }
  dist = Math.max(dist, 0.06);
  const dir = d.clone().normalize();
  const end = root.clone().addScaledVector(dir, dist);
  const a = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(l1 * l1 - a * a, 0));
  const p = polePoint.clone().sub(root); p.addScaledVector(dir, -p.dot(dir));
  if (p.lengthSq() < 1e-6) p.set(0, 0, 1);
  p.normalize();
  return { mid: root.clone().addScaledVector(dir, a).addScaledVector(p, h), end };
}

function matMat() {
  return canvasTexture(512, 1024, (g, w, h) => {
    g.fillStyle = '#0c4a3f'; g.fillRect(0, 0, w, h);
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(0,0,0,.35)'); gr.addColorStop(0.5, 'rgba(255,255,255,.05)'); gr.addColorStop(1, 'rgba(0,0,0,.35)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#e9c46a'; g.lineWidth = 8; g.strokeRect(22, 22, w - 44, h - 44);
    g.lineWidth = 2; g.strokeRect(44, 44, w - 88, h - 88);
    // mihrab (en haut de la texture = côté qibla)
    g.strokeStyle = 'rgba(233,196,106,.9)'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(130, 330); g.lineTo(130, 190); g.quadraticCurveTo(130, 90, 256, 70); g.quadraticCurveTo(382, 90, 382, 190); g.lineTo(382, 330); g.stroke();
    g.lineWidth = 2.5; g.beginPath(); g.moveTo(160, 330); g.lineTo(160, 200); g.quadraticCurveTo(160, 120, 256, 104); g.quadraticCurveTo(352, 120, 352, 200); g.lineTo(352, 330); g.stroke();
    g.fillStyle = 'rgba(233,196,106,.85)'; g.beginPath(); g.arc(256, 215, 18, 0, 7); g.fill();
    // étoile centrale
    g.strokeStyle = 'rgba(233,196,106,.35)'; g.lineWidth = 2;
    for (let k = 0; k < 2; k++) { const r = 120 - k * 38; g.beginPath(); for (let i = 0; i < 16; i++) { const a = (i / 16) * 6.283, rr = i % 2 ? r * 0.7 : r; g.lineTo(256 + Math.cos(a) * rr, 690 + Math.sin(a) * rr); } g.closePath(); g.stroke(); }
  });
}

export function figureScene(ctx, init = {}) {
  const { scene, camera, renderer, q, input } = ctx;
  renderer.toneMappingExposure = 1.05;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environment = env; scene.environmentIntensity = 0.55;
  scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x1a2a35, 0.7));
  const key = new THREE.DirectionalLight(0xfff0d6, 2.4); key.position.set(-3, 5, 2); key.castShadow = q.level === 'high'; scene.add(key);
  if (key.castShadow) { renderer.shadowMap.enabled = true; key.shadow.mapSize.set(1024, 1024); const c = key.shadow.camera; c.left = -2; c.right = 2; c.top = 2; c.bottom = -2; key.shadow.bias = -0.001; }
  const rim = new THREE.DirectionalLight(0x5fe0c4, 1.1); rim.position.set(3, 3, -3); scene.add(rim);

  // sol + tapis
  const poolTex = canvasTexture(256, 256, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(22,60,70,.95)'); gr.addColorStop(0.55, 'rgba(12,30,48,.8)'); gr.addColorStop(1, 'rgba(6,12,26,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(6, 64), new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.002; scene.add(floor);
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.8), new THREE.MeshStandardMaterial({ map: matMat(), roughness: 0.95 }));
  // l'extrémité « haut de texture » (mihrab) doit pointer vers +z (la qibla)
  mat.rotation.order = 'YXZ'; mat.rotation.set(-Math.PI / 2, Math.PI, 0); mat.position.set(0, 0.002, 0.05); mat.receiveShadow = true; scene.add(mat);
  const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(233,196,106,.7)', 'rgba(233,196,106,0)'), blending: THREE.AdditiveBlending, transparent: true, opacity: 0.28, depthWrite: false }));
  aura.scale.setScalar(5); aura.position.set(0, 1.0, -0.5); scene.add(aura);

  // petite Kaaba au loin, devant le priant (direction de la qibla)
  const kaaba = new THREE.Group(); kaaba.position.set(0, 0, 4.2); scene.add(kaaba);
  const kb = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.95, 0.8), new THREE.MeshStandardMaterial({ color: 0x0b0b0e, roughness: 0.5, metalness: 0.2 })); kb.position.y = 0.475; kaaba.add(kb);
  const kband = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.12, 0.82), new THREE.MeshStandardMaterial({ color: 0xe6b84d, metalness: 1, roughness: 0.3 })); kband.position.y = 0.72; kaaba.add(kband);

  // ── mannequin ──
  const body = new THREE.MeshStandardMaterial({ color: 0xf3ecda, roughness: 0.55, metalness: 0.02, emissive: 0x2a2316, emissiveIntensity: 0.35 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xe0b98a, roughness: 0.6, emissive: 0x2a1a0a, emissiveIntensity: 0.25 });
  const cap = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, emissive: 0x444444, emissiveIntensity: 0.3 });
  const fig = new THREE.Group(); scene.add(fig);
  const cyl = (r1, r2, m) => { const g = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, 1, 16), m); g.castShadow = true; fig.add(g); return g; };
  const ball = (r, m) => { const g = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), m); g.castShadow = true; fig.add(g); return g; };
  const L = {
    torso: cyl(0.13, 0.17, body), chest: ball(0.17, body), pelvis: ball(0.14, body), shoulders: cyl(0.065, 0.065, body), neck: cyl(0.05, 0.045, skin),
    thighR: cyl(0.085, 0.065, body), thighL: cyl(0.085, 0.065, body), shinR: cyl(0.065, 0.05, body), shinL: cyl(0.065, 0.05, body),
    footR: cyl(0.045, 0.032, skin), footL: cyl(0.045, 0.032, skin),
    upR: cyl(0.06, 0.05, body), upL: cyl(0.06, 0.05, body), foreR: cyl(0.05, 0.04, body), foreL: cyl(0.05, 0.04, body),
    handR: ball(0.05, skin), handL: ball(0.05, skin), finger: cyl(0.014, 0.012, skin),
    kneeR: ball(0.07, body), kneeL: ball(0.07, body), elbR: ball(0.052, body), elbL: ball(0.052, body), shR: ball(0.07, body), shL: ball(0.07, body), ankR: ball(0.045, skin), ankL: ball(0.045, skin), toeR: ball(0.034, skin), toeL: ball(0.034, skin),
  };
  const head = new THREE.Group(); fig.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.112, 28, 20), skin); skull.castShadow = true; head.add(skull);
  const taqiyah = new THREE.Mesh(new THREE.SphereGeometry(0.119, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.48), cap); taqiyah.position.y = 0.005; head.add(taqiyah);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), skin); nose.position.set(0, -0.01, 0.112); head.add(nose);

  function place(m, a, b) { const d = b.clone().sub(a); const len = Math.max(d.length(), 1e-4); m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(Y, d.divideScalar(len)); m.scale.set(1, len, 1); }

  let cur = flat(POSES[init.pose || 'stand']), from = cur.slice(), to = cur.slice(), t0 = 0, dur = 1, tNow = 0, moving = false;
  const showPose = (p) => {
    const hip = V(0, p.hip[0], p.hip[1]);
    const th = (p.torso * Math.PI) / 180, ph = (p.head * Math.PI) / 180;
    const sh = hip.clone().add(V(0, Math.cos(th), Math.sin(th)).multiplyScalar(D.torso));
    const hd = sh.clone().add(V(0, Math.cos(ph), Math.sin(ph)).multiplyScalar(D.neck));
    const shR = sh.clone().add(V(-D.shW, 0, 0)), shL = sh.clone().add(V(D.shW, 0, 0));
    const hipR = hip.clone().add(V(-D.hipW, 0, 0)), hipL = hip.clone().add(V(D.hipW, 0, 0));
    const torsoDir = V(0, Math.cos(th), Math.sin(th));

    // tronc
    place(L.torso, hip.clone().addScaledVector(torsoDir, 0.05), sh.clone().addScaledVector(torsoDir, -0.1));
    L.chest.position.copy(sh).addScaledVector(torsoDir, -0.12); L.chest.scale.set(1.12, 1.15, 0.8);
    L.pelvis.position.copy(hip); L.pelvis.scale.set(1.2, 0.9, 0.95);
    place(L.shoulders, shR, shL); L.shR.position.copy(shR); L.shL.position.copy(shL);
    place(L.neck, sh.clone().addScaledVector(torsoDir, -0.02), hd);
    head.position.copy(hd); head.rotation.order = 'YXZ'; head.rotation.set(Math.min(ph, (95 * Math.PI) / 180), (p.yaw * Math.PI) / 180, 0);

    // bras
    const e = p.elbow;
    for (const [side, sx, S, hands, up, fore, hand, elb] of [['R', -1, shR, p.hR, L.upR, L.foreR, L.handR, L.elbR], ['L', 1, shL, p.hL, L.upL, L.foreL, L.handL, L.elbL]]) {
      const pole = S.clone().add(V(sx * Math.abs(e[0]), e[1], e[2]));
      const r = ik(S, V(...hands), D.upper, D.fore, pole);
      place(up, S, r.mid); place(fore, r.mid, r.end); elb.position.copy(r.mid);
      hand.position.copy(r.end).addScaledVector(r.end.clone().sub(r.mid).normalize(), 0.04);
      if (side === 'R') { L.finger.visible = p.finger > 0.5; if (L.finger.visible) place(L.finger, r.end.clone().addScaledVector(r.end.clone().sub(r.mid).normalize(), 0.03), r.end.clone().add(V(0, 0.11, 0.07))); }
    }
    // jambes
    for (const [sx, H, a, toe, thigh, shin, foot, knee, ank, toeB] of [[-1, hipR, p.aR, p.tR, L.thighR, L.shinR, L.footR, L.kneeR, L.ankR, L.toeR], [1, hipL, p.aL, p.tL, L.thighL, L.shinL, L.footL, L.kneeL, L.ankL, L.toeL]]) {
      const A = V(a[0], a[1], a[2]);
      const pole = H.clone().add(V(sx * Math.abs(p.knee[0]), p.knee[1], p.knee[2]));
      const r = ik(H, A, D.thigh, D.shin, pole);
      place(thigh, H, r.mid); place(shin, r.mid, r.end); knee.position.copy(r.mid); ank.position.copy(r.end);
      const T = V(a[0], toe[0], toe[1]);
      place(foot, r.end, T); toeB.position.copy(T);
    }
  };
  showPose(unflat(cur));

  const camState = { az: -1.45, el: 0.12, r: 4.1 };
  function resize(w, h) { const a = w / h; camState.r = a < 0.9 ? 5.6 : a < 1.3 ? 4.4 : 3.5; }
  camera.fov = 38; camera.updateProjectionMatrix();

  return {
    resize,
    poses: POSES,
    setPose(name, seconds = 1.15) {
      if (!POSES[name]) return;
      from = cur.slice(); to = flat(POSES[name]); t0 = tNow; dur = Math.max(0.01, seconds); moving = true;
    },
    snap(name) { cur = flat(POSES[name]); from = cur.slice(); to = cur.slice(); moving = false; showPose(unflat(cur)); },
    update(dt, t) {
      tNow += dt;
      if (moving) {
        const k = clamp((tNow - t0) / dur, 0, 1), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        cur = from.map((v, i) => v + (to[i] - v) * e);
        if (k >= 1) moving = false;
        showPose(unflat(cur));
      }
      // caméra en orbite (glisser pour tourner)
      const az = camState.az + input.dragX * 0.006 + Math.sin(t * 0.15) * 0.04;
      const el = clamp(camState.el + input.dragY * 0.003 + input.y * 0.05, -0.05, 0.9);
      const tz = 0.05;
      camera.position.set(Math.sin(az) * camState.r, 0.8 + Math.sin(el) * camState.r * 0.7, tz + Math.cos(az) * camState.r);
      camera.lookAt(0, 0.78, tz);
    },
    dispose() { pmrem.dispose(); env.dispose(); },
  };
}
