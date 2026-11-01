import { createStage } from '../scene/engine.js';
import { kaabaScene } from '../scene/kaaba.js';
import { currentPlace, qiblaBearing, distanceKm, KAABA } from '../core/prayer.js';
import { icon } from '../core/icons.js';
import { esc, toast, vibrate } from '../core/dom.js';
import { sfx } from '../core/audio.js';

const POINTS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];

export default {
  title: 'Qibla',
  mount(el) {
    const place = currentPlace();
    const bearing = qiblaBearing(place);
    const km = Math.round(distanceKm(place, KAABA));
    el.innerHTML = `
      <div class="page-head"><div class="eyebrow">${esc(place.name)}</div><h1>Qibla <span class="ar" lang="ar">القبلة</span></h1>
        <p>La direction de la Kaaba à La Mecque, calculée par le grand cercle depuis votre position.</p></div>
      <section class="stage qibla-stage" id="stage">
        <div class="overlay">
          <div class="row spread" style="align-items:flex-start">
            <div><div class="eyebrow" style="color:#f1d98c">Direction de la Qibla</div><div class="bignum" id="qb" style="color:#fff">${Math.round(bearing)}°</div><div class="muted" style="color:rgba(255,255,255,.75)">${POINTS[Math.round(bearing / 22.5) % 16]} · ${km.toLocaleString('fr-FR')} km de la Kaaba</div></div>
            <div style="text-align:right"><div class="eyebrow" style="color:#f1d98c">Votre cap</div><div class="bignum" id="hd" style="color:#fff">0°</div></div>
          </div>
          <div><div id="okMsg" class="chip" style="background:rgba(45,212,167,.25);border-color:#2dd4a7;color:#b6ffe9;margin-bottom:10px;display:none">✓ Vous faites face à la Qibla</div>
            <div class="row" style="gap:10px"><button class="btn gold" id="sensor">${icon('compass')} Activer la boussole</button><span class="hint" id="hint">Sur ordinateur : faites glisser le cadran pour tourner.</span></div></div>
        </div>
      </section>

      <div class="grid g2" style="margin-top:16px">
        <div class="card"><h3>Simuler un cap</h3><p class="muted" style="font-size:.9rem">Sans capteur, réglez le cap vers lequel vous faites face : la Kaaba s'aligne avec la flèche rouge du haut quand vous êtes dans la bonne direction.</p><input type="range" id="sim" min="0" max="359" value="0" aria-label="Cap simulé"></div>
        <div class="card"><h3>Pour une boussole précise</h3><ul class="lessons" style="margin:6px 0 0 18px;padding:0"><li>Posez le téléphone à plat, à l'écart des objets métalliques ou aimants.</li><li>Faites un « 8 » dans l'air pour calibrer le capteur.</li><li>Le cap magnétique peut s'écarter de quelques degrés du nord géographique.</li></ul></div>
      </div>
      <p class="note">Au-delà de l'outil, rappelez-vous que l'orientation « approximative » suffit en cas d'impossibilité de la déterminer précisément. Pour votre mosquée, suivez sa propre indication.</p>`;

    const stage = createStage(el.querySelector('#stage'), (ctx) => kaabaScene(ctx, { bearing }), { fov: 40 });
    const $ = (s) => el.querySelector(s);
    const hd = $('#hd'), ok = $('#okMsg'), sim = $('#sim');
    let sensorOn = false, filt = null;
    if (stage) {
      stage.mod.manual = true;
      stage.mod.onManual = (h) => { hd.textContent = Math.round(h) + '°'; sim.value = Math.round(h) % 360; };
      stage.mod.onAlign = (a) => { ok.style.display = a ? 'inline-flex' : 'none'; if (a) { vibrate(40); sfx.ok(); } };
    }
    sim.oninput = () => { if (!stage) return; stage.mod.manual = false; sensorOn = false; stage.mod.setHeading(+sim.value); hd.textContent = sim.value + '°'; };

    function onOri(e) {
      let h = null;
      if (typeof e.webkitCompassHeading === 'number') h = e.webkitCompassHeading;
      else if (e.absolute && typeof e.alpha === 'number') h = (360 - e.alpha) % 360;
      else if (e.type === 'deviceorientationabsolute' && typeof e.alpha === 'number') h = (360 - e.alpha) % 360;
      if (h == null || !stage) return;
      filt = filt == null ? h : filt + ((((h - filt + 540) % 360) - 180) * 0.25);
      stage.mod.manual = false; stage.mod.setHeading((filt + 360) % 360); hd.textContent = Math.round((filt + 360) % 360) + '°';
    }
    $('#sensor').onclick = async () => {
      try {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
          const r = await DeviceOrientationEvent.requestPermission(); if (r !== 'granted') return toast('Accès à la boussole refusé');
        }
        if (!('DeviceOrientationEvent' in window)) return toast('Aucun capteur d\'orientation sur cet appareil');
        window.addEventListener('deviceorientationabsolute', onOri, true);
        window.addEventListener('deviceorientation', onOri, true);
        sensorOn = true; $('#hint').textContent = 'Boussole active — tournez-vous lentement.'; toast('Boussole activée');
      } catch { toast('Impossible d\'activer la boussole'); }
    };
    return () => { window.removeEventListener('deviceorientationabsolute', onOri, true); window.removeEventListener('deviceorientation', onOri, true); stage && stage.dispose(); };
  },
};
