// Chapelet (misbaha) 3D : 33 perles sur une boucle qui défile à chaque pression, avec marqueurs à 11 et 22,
// perle de tête (imam) et pompon. Rebond élastique, éclat doré à l'arrivée de chaque perle.
import { THREE, canvasTexture } from './engine.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { glowTexture } from './sky.js';
import { clamp } from '../core/dom.js';

export const BEAD_STYLES = {
  perle: { a: 0xf3ead2, b: 0xd9c9a0, rough: 0.22, metal: 0.05, clear: 0.9 },
  ambre: { a: 0xe39b2c, b: 0xb5651a, rough: 0.12, metal: 0.1, clear: 1 },
  emeraude: { a: 0x1fbf94, b: 0x0b7a63, rough: 0.14, metal: 0.15, clear: 1 },
  onyx: { a: 0x1c1c22, b: 0x32323c, rough: 0.12, metal: 0.4, clear: 1 },
};

export function beadsScene(ctx, init) {
  const { scene, camera, renderer, q, input } = ctx;
  const N = 33; // places sur la boucle : slot 0 = perle imam, 1…32 = perles
  renderer.toneMappingExposure = 1.1;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environment = env;
  scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x1a2230, 0.55));
  const key = new THREE.DirectionalLight(0xfff1d6, 2.6); key.position.set(-4, 6, 7); scene.add(key);
  const rim = new THREE.DirectionalLight(0x5fe0c4, 1.4); rim.position.set(6, 3, -4); scene.add(rim);

  // fond : médaillon lumineux
  const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(233,196,106,.9)', 'rgba(233,196,106,0)'), blending: THREE.AdditiveBlending, transparent: true, opacity: 0.35, depthWrite: false }));
  aura.scale.setScalar(16); aura.position.set(0, -0.2, -3); scene.add(aura);

  const group = new THREE.Group(); scene.add(group);
  const geo = new THREE.SphereGeometry(0.3, q.segments, q.segments * 0.7);
  const mkMat = (c, st) => new THREE.MeshPhysicalMaterial({ color: c, roughness: st.rough, metalness: st.metal, clearcoat: st.clear, clearcoatRoughness: 0.12, envMapIntensity: 1.2 });
  let style = BEAD_STYLES[init.style || 'ambre'];
  const matA = mkMat(style.a, style), matB = mkMat(style.b, style);
  const spacerMat = new THREE.MeshStandardMaterial({ color: 0xe6b84d, metalness: 1, roughness: 0.25 });
  const beads = [];
  for (let i = 0; i < N; i++) {
    if (i === 0) { beads.push(null); continue; }
    const m = new THREE.Mesh(geo, i % 2 ? matA : matB);
    group.add(m); beads.push(m);
  }
  // marqueurs (disques dorés) après la perle 11 et 22
  const spacers = [];
  for (const k of [11, 22]) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 24), spacerMat); group.add(s); spacers.push({ k, s }); }

  // thread
  const loopR = 3.6;
  const threadMat = new THREE.MeshStandardMaterial({ color: 0xcfa24a, metalness: 0.7, roughness: 0.4 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(loopR, 0.018, 8, 160), threadMat);
  group.add(ring);

  // pompon + perle imam (haut de la boucle)
  const imam = new THREE.Group(); group.add(imam);
  const imamBead = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.46, 8, 24), new THREE.MeshPhysicalMaterial({ color: 0xe6b84d, metalness: 1, roughness: 0.22, clearcoat: 1 }));
  imam.add(imamBead);
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.2, 4), threadMat);
    t.position.set(Math.cos(a) * 0.09, 1.2, Math.sin(a) * 0.09); t.rotation.z = -Math.cos(a) * 0.12; t.rotation.x = Math.sin(a) * 0.12; imam.add(t);
  }
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), spacerMat); knot.position.y = 0.55; imam.add(knot);
  const pop = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.5, 14), new THREE.MeshStandardMaterial({ color: 0x0f9d82, roughness: 0.6 })); pop.position.y = 0.4; imam.add(pop);

  // étincelle à l'arrivée
  const spark = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,235,170,1)', 'rgba(255,200,90,0)'), blending: THREE.AdditiveBlending, transparent: true, opacity: 0, depthWrite: false }));
  spark.scale.setScalar(2.6); scene.add(spark);

  // la boucle est inclinée vers la caméra : la perle « active » est au bas, proche et grande
  group.rotation.x = -0.72; group.position.y = 0.4;
  const tilt = group;
  const slotAngle = (i, offset) => -Math.PI / 2 - ((i - offset) / N) * Math.PI * 2;
  function layout(offset) {
    for (let i = 1; i < N; i++) { const a = slotAngle(i, offset); beads[i].position.set(Math.cos(a) * loopR, Math.sin(a) * loopR, 0); beads[i].rotation.z = a; }
    { const a = slotAngle(0, offset); imam.position.set(Math.cos(a) * loopR, Math.sin(a) * loopR, 0); imam.rotation.z = a - Math.PI / 2; imam.userData.a = a; }
    for (const { k, s } of spacers) {
      if (k >= N) { s.visible = false; continue; }
      const a = slotAngle(k + 0.5, offset); s.position.set(Math.cos(a) * loopR, Math.sin(a) * loopR, 0); s.rotation.set(0, 0, a + Math.PI / 2); s.rotation.x = 0; s.rotateX(Math.PI / 2);
    }
  }

  let pos = 0, vel = 0, target = 0, flash = 0, taps = 0;
  const api = {
    resize(w, h) { const a = w / h; camera.position.set(0, 2.2, a < 0.8 ? 16 : 11.5); camera.lookAt(0, -1.2, 0); camera.fov = a < 0.8 ? 50 : 40; camera.updateProjectionMatrix(); },
    tap() { target += 1; vel -= 0.9; flash = 1; taps++; },
    snap(n) { pos = target = n; vel = 0; layout(pos); },
    setStyle(name) {
      const st = BEAD_STYLES[name]; if (!st) return;
      matA.color.setHex(st.a); matB.color.setHex(st.b); [matA, matB].forEach((m) => { m.roughness = st.rough; m.metalness = st.metal; m.clearcoat = st.clear; });
    },
    update(dt, t) {
      // ressort amorti vers la prochaine perle
      const k = 90, d = 12;
      const acc = (target - pos) * k - vel * d; vel += acc * dt; pos += vel * dt;
      layout(pos);
      flash *= 0.93;
      // légère respiration + rotation au pointeur
      tilt.rotation.y = input.x * 0.25 + Math.sin(t * 0.4) * 0.05;
      tilt.rotation.x = -0.72 + input.y * 0.06;
      // la perle active (au bas) grossit et brille
      for (let i = 1; i < N; i++) {
        const b = beads[i];
        const dist = Math.abs((b.position.y + loopR) / loopR);
        b.scale.setScalar(1 + clamp(1 - dist * 3, 0, 1) * 0.22);
      }
      // étincelle sous la perle active
      tilt.localToWorld(spark.position.set(0, -loopR, 0.4));
      spark.material.opacity = flash * 0.9;
      aura.material.opacity = 0.28 + flash * 0.25;
      // clic dans la scène
      while (input.clicks.length) { input.clicks.pop(); api.onTap && api.onTap(); }
    },
    onTap: null,
    dispose() { pmrem.dispose(); env.dispose(); },
  };
  layout(init.offset || 0); pos = target = init.offset || 0;
  return api;
}
