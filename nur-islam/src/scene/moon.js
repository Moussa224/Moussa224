// Lune 3D : sphère ombrée par un vrai éclairage de phase (croissant, quartier, gibbeuse, pleine).
import { THREE, canvasTexture } from './engine.js';

function moonTexture() {
  return canvasTexture(512, 256, (g, w, h) => {
    g.fillStyle = '#cfcab9'; g.fillRect(0, 0, w, h);
    // mers lunaires : grandes taches sombres douces
    const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
    for (let i = 0; i < 16; i++) {
      const x = rnd() * w, y = h * (0.2 + rnd() * 0.6), r = 24 + rnd() * 60;
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(90,92,100,.55)'); gr.addColorStop(1, 'rgba(90,92,100,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
    // cratères
    for (let i = 0; i < 260; i++) {
      const x = rnd() * w, y = rnd() * h, r = 1.5 + rnd() * rnd() * 14;
      g.strokeStyle = `rgba(60,60,66,${0.1 + rnd() * 0.18})`; g.lineWidth = 1; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke();
      g.fillStyle = `rgba(255,255,255,${0.04 + rnd() * 0.07})`; g.beginPath(); g.arc(x - r * 0.25, y - r * 0.25, r * 0.7, 0, 7); g.fill();
    }
  });
}

/** Retourne { group, setPhase(frac 0…1), setGlow(a), face(camera) } — billboard avec rendu sphérique. */
export function makeMoon({ radius = 3, glow = 3.2 } = {}) {
  const tex = moonTexture();
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: { uTex: { value: tex }, uL: { value: new THREE.Vector3(1, 0, 0) }, uAmb: { value: 0.045 }, uGain: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `varying vec2 vUv; uniform sampler2D uTex; uniform vec3 uL; uniform float uAmb; uniform float uGain;
      void main(){ vec2 p=vUv*2.0-1.0; float r2=dot(p,p); if(r2>1.0) discard;
        vec3 n=vec3(p.x,p.y,sqrt(1.0-r2));
        float lit=smoothstep(-0.03,0.07,dot(n,normalize(uL)));
        // coordonnées sphériques pour la texture
        float lon=atan(n.x,n.z)/6.2831853+0.5; float lat=asin(n.y)/3.1415927+0.5;
        vec3 tex=texture2D(uTex,vec2(lon*0.5+0.25,lat)).rgb;
        float limb=pow(n.z,0.35);
        vec3 col=tex*(uAmb+lit*(1.0-uAmb))*limb*uGain*1.35;
        col+=vec3(.05,.06,.09)*(1.0-lit)*uAmb*8.0*limb; // lumière cendrée
        gl_FragColor=vec4(col,smoothstep(1.0,0.97,r2));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const disc = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), mat);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 8, 64, 64, 64); gr.addColorStop(0, 'rgba(190,205,255,.55)'); gr.addColorStop(0.3, 'rgba(170,190,255,.18)'); gr.addColorStop(1, 'rgba(170,190,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })(),
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false, opacity: 0.8,
  }));
  halo.scale.setScalar(radius * 2 * glow);
  const group = new THREE.Group();
  group.add(halo, disc);
  const L = new THREE.Vector3();
  return {
    group, disc, halo,
    setPhase(frac) {
      const phi = frac * Math.PI * 2;
      L.set(Math.sin(phi), 0.0, -Math.cos(phi));
      mat.uniforms.uL.value.copy(L);
      halo.material.opacity = 0.18 + 0.7 * ((1 - Math.cos(phi)) / 2);
    },
    setGain(g) { mat.uniforms.uGain.value = g; },
    face(camera) { disc.quaternion.copy(camera.quaternion); },
  };
}
