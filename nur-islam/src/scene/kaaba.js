// Boussole Qibla : cadran qui tourne avec l'orientation, Kaaba posée sur le cadran dans la direction de la Mecque,
// pèlerins en tawaf (cercles de points blancs), halo quand on fait face à la Qibla.
import { THREE, canvasTexture } from './engine.js';
import { glowTexture } from './sky.js';
import { clamp } from '../core/dom.js';

const deg = Math.PI / 180;

function dialTexture() {
  return canvasTexture(1024, 1024, (g, w, h) => {
    const c = w / 2;
    const bg = g.createRadialGradient(c, c, 40, c, c, c);
    bg.addColorStop(0, '#0f4a43'); bg.addColorStop(0.7, '#0a2c3a'); bg.addColorStop(1, '#071526');
    g.fillStyle = bg; g.beginPath(); g.arc(c, c, c - 4, 0, 7); g.fill();
    // étoile à 8 pointes centrale
    g.strokeStyle = 'rgba(233,196,106,.22)'; g.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      const r = 150 + k * 80;
      g.beginPath(); for (let i = 0; i < 16; i++) { const a = (i / 16) * 6.283 - Math.PI / 2, rr = i % 2 ? r * 0.7 : r; g.lineTo(c + Math.cos(a) * rr, c + Math.sin(a) * rr); } g.closePath(); g.stroke();
    }
    g.lineWidth = 6; g.strokeStyle = '#e9c46a'; g.beginPath(); g.arc(c, c, c - 14, 0, 7); g.stroke();
    g.lineWidth = 2; g.beginPath(); g.arc(c, c, c - 120, 0, 7); g.stroke();
    // graduations
    for (let a = 0; a < 360; a += 5) {
      const big = a % 30 === 0, mid = a % 10 === 0;
      const r1 = c - 22, r2 = c - (big ? 74 : mid ? 54 : 40);
      const x = Math.sin(a * deg), y = -Math.cos(a * deg);
      g.strokeStyle = big ? '#f6e3a8' : 'rgba(233,196,106,.7)'; g.lineWidth = big ? 5 : 2.5;
      g.beginPath(); g.moveTo(c + x * r1, c + y * r1); g.lineTo(c + x * r2, c + y * r2); g.stroke();
    }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '600 34px Outfit, sans-serif'; g.fillStyle = '#d9cfae';
    for (let a = 30; a < 360; a += 30) { if (a % 90 === 0) continue; g.fillText(String(a), c + Math.sin(a * deg) * (c - 104), c - Math.cos(a * deg) * (c - 104)); }
    const cards = [['N', 0, '#ff7a6b'], ['E', 90, '#f6e3a8'], ['S', 180, '#f6e3a8'], ['O', 270, '#f6e3a8']];
    g.font = '700 70px Cormorant, serif';
    for (const [t, a, col] of cards) { g.fillStyle = col; g.fillText(t, c + Math.sin(a * deg) * (c - 128), c - Math.cos(a * deg) * (c - 128)); }
  });
}

function bandTexture() {
  return canvasTexture(1024, 128, (g, w, h) => {
    g.fillStyle = '#0a0a0c'; g.fillRect(0, 0, w, h);
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f3d27a'); gr.addColorStop(1, '#b8862b');
    g.fillStyle = gr; g.fillRect(0, 4, w, h - 8);
    g.fillStyle = '#17110a'; g.font = '84px "Amiri", serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl';
    g.fillText('لا إله إلا الله  ✦  محمد رسول الله', w / 2, h / 2 + 4);
  });
}

export function kaabaScene(ctx, init) {
  const { scene, camera, renderer, q, input } = ctx;
  renderer.toneMappingExposure = 1.05;

  scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x203040, 0.9));
  const key = new THREE.DirectionalLight(0xfff0d0, 2.4); key.position.set(-6, 12, 8); scene.add(key);
  const rim = new THREE.DirectionalLight(0x5fe0c4, 1.2); rim.position.set(8, 6, -8); scene.add(rim);

  // cadran
  const dial = new THREE.Group(); scene.add(dial);
  const R = 5.6;
  const disc = new THREE.Mesh(new THREE.CircleGeometry(R, 96), new THREE.MeshStandardMaterial({ map: dialTexture(), roughness: 0.55, metalness: 0.25 }));
  disc.rotation.x = -Math.PI / 2; dial.add(disc);
  const rim3d = new THREE.Mesh(new THREE.TorusGeometry(R + 0.06, 0.16, 16, 96), new THREE.MeshStandardMaterial({ color: 0xe6b84d, metalness: 1, roughness: 0.28 }));
  rim3d.rotation.x = Math.PI / 2; dial.add(rim3d);

  // marque fixe « devant » (indique là où pointe l'appareil)
  const front = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.7, 3), new THREE.MeshStandardMaterial({ color: 0xff7a6b, emissive: 0x551108, roughness: 0.4 }));
  front.rotation.x = -Math.PI / 2; front.position.set(0, 0.3, -R - 0.75); scene.add(front);

  // Kaaba
  const kaaba = new THREE.Group(); dial.add(kaaba);
  const black = new THREE.MeshStandardMaterial({ color: 0x0b0b0e, roughness: 0.55, metalness: 0.2 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.35, 1.1), black); body.position.y = 0.68; kaaba.add(body);
  const bandT = bandTexture();
  const band = new THREE.Mesh(new THREE.BoxGeometry(1.115, 0.2, 1.115), new THREE.MeshStandardMaterial({ map: bandT, roughness: 0.35, metalness: 0.7, emissive: 0x2a1c00, emissiveIntensity: 0.5 })); band.position.y = 1.0; kaaba.add(band);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.52), new THREE.MeshStandardMaterial({ color: 0xe6b84d, metalness: 1, roughness: 0.3, emissive: 0x3a2400, emissiveIntensity: 0.6 })); door.position.set(0.2, 0.55, 0.556); kaaba.add(door);
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 1.3), new THREE.MeshStandardMaterial({ color: 0xd9d4c4, roughness: 0.6 })); base.position.y = 0.05; kaaba.add(base);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,220,130,1)', 'rgba(255,200,90,0)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.35 }));
  halo.scale.setScalar(4.2); halo.position.y = 0.7; kaaba.add(halo);
  const mataf = new THREE.Mesh(new THREE.RingGeometry(0.95, 2.1, 64), new THREE.MeshBasicMaterial({ color: 0xf4efe0, transparent: true, opacity: 0.12, side: THREE.DoubleSide }));
  mataf.rotation.x = -Math.PI / 2; mataf.position.y = 0.02; kaaba.add(mataf);

  // pèlerins en tawaf
  const N = q.level === 'low' ? 60 : 130;
  const pil = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.03, 0.07, 3, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), N);
  kaaba.add(pil);
  const rings = Array.from({ length: N }, (_, i) => { const k = i % 4, r = 1.15 + k * 0.24; return { r, a: ((i / 4) / (N / 4)) * 6.283 + k * 0.4, s: 0.55 / r }; });
  const dummy = new THREE.Object3D();

  // flèche pointillée du centre vers la Kaaba
  const arrow = new THREE.Group(); dial.add(arrow);
  const dots = 18;
  for (let i = 0; i < dots; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xe9c46a, transparent: true, opacity: 0.9 }));
    m.position.set(0, 0.06, -(0.4 + (i / dots) * (R - 1.6))); arrow.add(m);
  }
  const pole = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), new THREE.MeshStandardMaterial({ color: 0xe6b84d, metalness: 1, roughness: 0.3 })); pole.position.y = 0.08; dial.add(pole);

  // halo de réussite (face à la Qibla)
  const okRing = new THREE.Mesh(new THREE.RingGeometry(R + 0.3, R + 0.75, 96), new THREE.MeshBasicMaterial({ color: 0x2dd4a7, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
  okRing.rotation.x = -Math.PI / 2; okRing.position.y = 0.05; scene.add(okRing);

  let bearing = init.bearing, heading = 0, shown = 0, aligned = false, lift = 0;
  function place() {
    const b = bearing * deg;
    kaaba.position.set(Math.sin(b) * (R - 1.1), 0, -Math.cos(b) * (R - 1.1));
    arrow.rotation.y = -b;
  }
  place();
  let az = 0;
  function resize(w, h) {
    const a = w / h; camera.position.set(0, a < 0.8 ? 22 : 13.6, a < 0.8 ? 16 : 10.4); camera.lookAt(0, 0, 0.2);
  }
  camera.fov = 40; camera.updateProjectionMatrix();

  const api = {
    resize,
    setBearing(b) { bearing = b; place(); },
    setHeading(h) { heading = h; },
    get heading() { return heading; },
    get aligned() { return aligned; },
    onAlign: null,
    update(dt, t) {
      // glisser = simuler la rotation de l'appareil (utile sur ordinateur)
      if (api.manual) { heading = ((-input.dragX * 0.35) % 360 + 360) % 360; if (api.onManual) api.onManual(heading); }
      // lissage sur l'angle le plus court
      let d = ((heading - shown + 540) % 360) - 180;
      shown += d * Math.min(1, dt * 8);
      dial.rotation.y = shown * deg;
      const diff = Math.abs(((bearing - shown + 540) % 360) - 180);
      const ok = diff < 4;
      if (ok !== aligned) { aligned = ok; api.onAlign && api.onAlign(ok); }
      okRing.material.opacity += ((ok ? 0.85 : 0) - okRing.material.opacity) * Math.min(1, dt * 6);
      halo.material.opacity = 0.3 + (ok ? 0.45 : 0) + Math.sin(t * 2) * 0.05;
      kaaba.rotation.y = -shown * deg + (bearing * deg) * 0; // la Kaaba garde la même face vers la caméra
      lift += ((ok ? 0.18 : 0) - lift) * Math.min(1, dt * 5); kaaba.children[0].position.y = 0.68 + lift;
      // tawaf (sens inverse des aiguilles d'une montre)
      for (let i = 0; i < N; i++) {
        const p = rings[i]; p.a += p.s * dt * 1.6;
        dummy.position.set(Math.cos(p.a) * p.r, 0.1, -Math.sin(p.a) * p.r); dummy.rotation.y = p.a; dummy.updateMatrix(); pil.setMatrixAt(i, dummy.matrix);
      }
      pil.instanceMatrix.needsUpdate = true;
      // léger balancement de caméra
      camera.position.x = Math.sin(t * 0.2) * 0.5 + input.x * 0.8;
      camera.lookAt(0, 0, 0.2);
    },
    manual: false, onManual: null,
  };
  return api;
}
