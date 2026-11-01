// Ciel : palette pilotée par les VRAIS horaires de prière (fajr, lever, midi, asr, coucher, isha),
// position du soleil et de la lune (lune : phase réelle + heure de passage approchée).
import { THREE } from './engine.js';
import { clamp, smooth } from '../core/dom.js';

const C = (h) => new THREE.Color(h);

export function buildKeys(T) {
  const night = { top: C('#04081c'), hor: C('#0a1638') };
  const dawnMid = (T.fajr + T.sunrise) / 2;
  const k = [
    { t: T.fajr - 50, ...night },
    { t: T.fajr, top: C('#0d1840'), hor: C('#3a3874') },
    { t: dawnMid, top: C('#1c3777'), hor: C('#a2668a') },
    { t: T.sunrise - 6, top: C('#34609f'), hor: C('#ff9d62') },
    { t: T.sunrise + 70, top: C('#3d86dc'), hor: C('#bfe2ff') },
    { t: T.dhuhr, top: C('#2a7de0'), hor: C('#c8ecff') },
    { t: T.asr, top: C('#3a80cf'), hor: C('#f1e1b5') },
    { t: T.sunset - 55, top: C('#4a72b8'), hor: C('#ffc680') },
    { t: T.sunset + 2, top: C('#39408a'), hor: C('#ff7a4a') },
    { t: (T.sunset + T.isha) / 2, top: C('#1b2558'), hor: C('#7b4a7e') },
    { t: T.isha, top: C('#0e1946'), hor: C('#2c2a5e') },
    { t: T.isha + 55, ...night },
  ].sort((a, b) => a.t - b.t);
  return k;
}

const _a = new THREE.Color(), _b = new THREE.Color();
export function skyAt(keys, t, out = { top: new THREE.Color(), hor: new THREE.Color() }) {
  if (t <= keys[0].t) { out.top.copy(keys[0].top); out.hor.copy(keys[0].hor); return out; }
  const last = keys[keys.length - 1];
  if (t >= last.t) { out.top.copy(last.top); out.hor.copy(last.hor); return out; }
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t >= a.t && t <= b.t) {
      const f = smooth(0, 1, (t - a.t) / Math.max(1, b.t - a.t));
      out.top.copy(a.top).lerp(b.top, f); out.hor.copy(a.hor).lerp(b.hor, f);
      return out;
    }
  }
  return out;
}

// altitude normalisée du soleil (−1…1) : sinus entre lever et coucher
export function sunAlt(T, t) {
  const L = Math.max(300, T.sunset - T.sunrise);
  return Math.sin(Math.PI * ((t - T.sunrise) / L));
}

// Position du soleil sur l'arc (rayon R) : gauche → haut → droite
export function sunPos(T, t, R, out = new THREE.Vector3()) {
  const L = Math.max(300, T.sunset - T.sunrise);
  const th = Math.PI * ((t - T.sunrise) / L);
  return out.set(-Math.cos(th) * R, Math.sin(th) * R * 0.78, -R * 0.55);
}

const wrap = (m) => ((m + 720) % 1440 + 1440) % 1440 - 720;
// Lune : passage au méridien ≈ midi solaire + fraction de lunaison × 24 h
export function moonPos(T, frac, t, R, out = new THREE.Vector3()) {
  const noon = (T.sunrise + T.sunset) / 2;
  const transit = noon + frac * 1440;
  const d = wrap(t - transit);
  const th = Math.PI * ((d + 360) / 720);
  return out.set(-Math.cos(th) * R, Math.sin(th) * R * 0.72, -R * 0.5);
}

// Fond de ciel : dégradé vertical + halo autour du soleil
export function makeSkyDome() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTop: { value: C('#2a7de0') }, uHor: { value: C('#c8ecff') }, uSun: { value: new THREE.Vector3(0, 1, 0) }, uSunI: { value: 0 }, uSunC: { value: C('#fff1c9') } },
    vertexShader: `varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `varying vec3 vP; uniform vec3 uTop,uHor,uSun,uSunC; uniform float uSunI;
      void main(){ float h=clamp(vP.y,-0.2,1.0); float k=pow(smoothstep(-0.05,0.85,h),0.7);
        vec3 c=mix(uHor,uTop,k);
        float s=max(dot(vP,normalize(uSun)),0.0);
        c+=uSunC*(pow(s,18.0)*0.55+pow(s,200.0)*1.2)*uSunI;
        c=mix(c,uHor*0.55,smoothstep(0.0,-0.18,vP.y));
        gl_FragColor=vec4(c,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(170, 32, 24), mat);
  mesh.renderOrder = -10;
  return mesh;
}

export function makeStars(n = 900) {
  const pos = new Float32Array(n * 3), s = new Float32Array(n), ph = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const u = Math.random(), v = Math.random() * 0.92 + 0.05;
    const a = u * Math.PI * 2, y = v, r = Math.sqrt(1 - y * y);
    pos[i * 3] = Math.cos(a) * r * 160; pos[i * 3 + 1] = y * 160; pos[i * 3 + 2] = Math.sin(a) * r * 160;
    s[i] = 0.6 + Math.random() * 1.8; ph[i] = Math.random() * 6.28;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('s', new THREE.BufferAttribute(s, 1));
  g.setAttribute('ph', new THREE.BufferAttribute(ph, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
    uniforms: { uA: { value: 1 }, uT: { value: 0 }, uPx: { value: 1 } },
    vertexShader: `attribute float s; attribute float ph; varying float vT; uniform float uT; uniform float uPx;
      void main(){ vT=.6+.4*sin(uT*1.7+ph*5.0); gl_PointSize=s*uPx*2.2; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `varying float vT; uniform float uA; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,.05,d); gl_FragColor=vec4(vec3(.92,.94,1.0),a*vT*uA); }`,
  });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = -9;
  return p;
}

export function glowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, inner); gr.addColorStop(0.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export const dayFactor = (T, t) => clamp((sunAlt(T, t) + 0.12) / 0.32, 0, 1); // 0 nuit … 1 plein jour
