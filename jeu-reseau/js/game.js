'use strict';
/* ============================================================
   NetCore Lab : boucle de jeu, interactions, interface
   ============================================================ */

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const isTouch = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
if (isTouch) document.body.classList.add('touch');

const P = { x: 2.2, z: 3.4, yaw: Math.PI / 2, pitch: 0, bob: 0, moving: false };
const keys = {};
const joy = { x: 0, y: 0 };
let ui = 'title';       // fenêtre ouverte : title | bag | cab | con | info | help | dialog | end | null
let target = null;

/* ---------- Son ---------- */
let AC = null, soundOn = true;
function actx() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* pas de son */ } }
  if (AC && AC.state === 'suspended') AC.resume();
  return AC;
}
function tone(f, d, type, vol, delay, f2) {
  if (!soundOn) return; const a = actx(); if (!a) return;
  const t0 = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + d);
  g.gain.setValueAtTime(vol || 0.06, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + d + 0.02);
}
function noise(d, vol, hp) {
  if (!soundOn) return; const a = actx(); if (!a) return;
  const n = Math.floor(a.sampleRate * d), buf = a.createBuffer(1, n, a.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  s.buffer = buf; f.type = 'highpass'; f.frequency.value = hp || 800; g.gain.value = vol || 0.1;
  s.connect(f); f.connect(g); g.connect(a.destination); s.start();
}
const sfx = {
  plug() { noise(0.06, 0.3, 1800); tone(150, 0.09, 'square', 0.05, 0.02, 80); },
  ok() { tone(660, 0.14, 'triangle', 0.07); tone(990, 0.22, 'triangle', 0.07, 0.11); },
  err() { tone(170, 0.28, 'sawtooth', 0.05, 0, 90); },
  click() { tone(1100, 0.03, 'square', 0.02); },
  key() { tone(1500 + Math.random() * 400, 0.015, 'square', 0.012); },
  door() { noise(0.55, 0.07, 300); },
  pick() { tone(520, 0.07, 'triangle', 0.05); tone(780, 0.08, 'triangle', 0.05, 0.05); }
};

/* ---------- Toasts ---------- */
function toast(msg, kind, ms) {
  const box = $('toasts');
  const el = document.createElement('div'); el.className = 'toast ' + (kind || ''); el.textContent = msg;
  box.appendChild(el);
  while (box.children.length > 4) box.removeChild(box.firstChild);
  setTimeout(() => el.classList.add('out'), ms || 4500);
  setTimeout(() => el.remove(), (ms || 4500) + 450);
}
const tipped = {};
function tipOnce(k, msg) { if (tipped[k]) return; tipped[k] = true; toast(msg, 'info', 7000); }

/* ---------- Fenêtres ---------- */
function lockPointer() {
  if (isTouch) return;
  const cv = $('c');
  try { if (!document.pointerLockElement && cv.requestPointerLock) { const r = cv.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } } catch (e) { /* ignoré */ }
}
function show(name) {
  ui = name; $(name).hidden = false;
  try { document.exitPointerLock && document.exitPointerLock(); } catch (e) { /* ignoré */ }
  joy.x = joy.y = 0; $('stick').classList.remove('on');
}
function closeModal() {
  if (!ui || ui === 'title') return;
  const n = ui; ui = null;
  if (n === 'dialog') { $('dialog').hidden = true; } else $(n).hidden = true;
  if (n === 'con') $('cmd').blur();
  if (n === 'cab') endDragVisual();
  if (S.phase === 'play') lockPointer();
}

/* ---------- Missions et objectifs ---------- */
function renderObjectives() {
  $('xp').textContent = S.xp;
  $('lvl').textContent = S.final ? 'FINAL' : 'NIVEAU ' + S.level;
  const items = [];
  if (S.final) {
    items.push({ t: 'Pause bien méritée', d: 'Rejoignez la cafétéria (porte à l’est du hall d’accueil) et prenez un café.', done: S.coffee });
  } else {
    MISSIONS.filter(m => m.level === S.level).forEach(m => items.push({ t: m.title, d: m.text, done: !!S.done[m.id] }));
    items.push({ t: 'Parler à M. Diallo', d: 'Le responsable valide votre niveau.', done: S.talked[S.level], locked: !S.levelDone[S.level] });
  }
  const firstOpen = items.findIndex(i => !i.done);
  $('tasks').innerHTML = items.map((i, n) =>
    '<li class="task' + (i.done ? ' done' : '') + (i.locked ? ' locked' : '') + '"' + (n === firstOpen ? ' data-first' : '') + '><i></i><div><b>' + esc(i.t) + '</b><span>' + esc(i.d) + '</span></div></li>').join('');
}
function checkMissions() {
  MISSIONS.forEach(m => {
    if (m.level === S.level && !S.done[m.id] && m.done()) {
      S.done[m.id] = true; S.xp += m.xp;
      toast('Mission accomplie : ' + m.title + '  +' + m.xp + ' XP', 'good', 5500); sfx.ok();
    }
  });
  const lv = S.level;
  if (!S.final && !S.levelDone[lv] && MISSIONS.filter(m => m.level === lv).every(m => S.done[m.id])) {
    S.levelDone[lv] = true;
    setTimeout(() => { toast('Tâches terminées ! Parlez à M. Diallo, le responsable.', 'good', 7000); }, 900);
  }
  renderObjectives();
}

/* ---------- Câbles : changements ---------- */
function afterCableChange() {
  stickyRefresh(); syncCableMeshes(); updateHeldBadge(); checkMissions();
}
function updateHeldBadge() {
  const b = $('heldBadge');
  if (!held) { b.hidden = true; $('tbStow').hidden = true; return; }
  const ct = CABLE_TYPES[held.type], plugged = held.ends.find(e => e);
  b.hidden = false; b.style.setProperty('--cc', ct.hex);
  b.innerHTML = '<i></i>' + esc(ct.name) + '<small>' + (plugged ? 'Une extrémité branchée sur ' + esc(DEVICES[plugged.dev].name) : 'En main') + (isTouch ? '' : ' · G pour ranger') + '</small>';
  $('tbStow').hidden = !isTouch;
}
function equip(type) {
  if (held && (held.ends[0] || held.ends[1])) { toast('Terminez d’abord ce câble, ou rangez-le (G).', 'bad'); sfx.err(); return; }
  held = newCable(type); resetHeldVisuals(); sfx.pick();
  closeModal(); toast(CABLE_TYPES[type].name + ' en main. Visez un appareil et appuyez sur E.', 'info', 5500);
  updateHeldBadge();
}
function stow() {
  if (!held) { toast('Vous ne tenez aucun câble.'); return; }
  held = null; resetHeldVisuals(); sfx.pick(); toast('Câble rangé dans le sac.'); afterCableChange();
}

/* ---------- Sac d'équipement ---------- */
function openBag() {
  const keysList = Object.keys(CABLE_TYPES);
  $('bagCount').textContent = '(' + keysList.length + ')';
  $('bagList').innerHTML = keysList.map((k, i) =>
    '<li><button data-k="' + k + '" style="--cc:' + CABLE_TYPES[k].hex + '"><span class="ic"></span><span><b>' + esc(CABLE_TYPES[k].name) + '<kbd>' + (i + 1) + '</kbd></b><span>' + esc(CABLE_TYPES[k].desc) + '</span></span></button></li>').join('');
  show('bag');
}
$('bagList').addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (b) equip(b.dataset.k); });

/* ---------- Panneau de câblage ---------- */
const Cab = { dev: null, drag: false, x: 0, y: 0, swallow: false };

function openCab(devId) {
  Cab.dev = devId; Cab.drag = false;
  const d = DEVICES[devId];
  $('cabTitle').textContent = (held ? 'Brancher un câble' : 'Connexions physiques') + ' · ' + d.name;
  renderFace(); updateCabHint(); show('cab');
  const pl = $('plug');
  pl.hidden = !held; pl.classList.remove('drag'); pl.style.left = pl.style.top = '';
  if (held) { pl.style.setProperty('--cc', CABLE_TYPES[held.type].hex); $('plugLabel').textContent = 'Saisir · ' + CABLE_TYPES[held.type].name; }
  $('cabPath').setAttribute('d', '');
}
function peerLabel(devId, portId) {
  const hit = cableAt({ dev: devId, port: portId });
  if (!hit) return '';
  const o = hit.cable.ends[1 - hit.k];
  return o ? '→ ' + DEVICES[o.dev].name : '(en main)';
}
function renderFace() {
  const d = DEVICES[Cab.dev], f = $('face');
  f.className = 'face ' + d.kind; f.setAttribute('data-name', d.name + ' · ' + d.model);
  const mk = p => {
    const el = document.createElement('div'); el.className = 'port ' + p.type; el.dataset.port = p.id;
    const hit = cableAt({ dev: d.id, port: p.id });
    if (hit) { el.classList.add('plugged'); el.style.setProperty('--cc', CABLE_TYPES[hit.cable.type].hex); }
    const m = p.label.match(/^(fa0\/)(\d+)$/);
    el.innerHTML = '<span class="sock"></span><b>' + (m ? '<span class="pre">' + m[1] + '</span>' + m[2] : esc(p.label)) + '</b><em>' + esc(peerLabel(d.id, p.id)) + '</em>';
    return el;
  };
  f.innerHTML = '';
  if (d.kind === 'switch') {
    const grid = document.createElement('div'); grid.className = 'sw-grid';
    const eth = d.ports.filter(p => p.type === 'eth');
    eth.filter((p, i) => i % 2 === 0).forEach(p => grid.appendChild(mk(p)));
    eth.filter((p, i) => i % 2 === 1).forEach(p => grid.appendChild(mk(p)));
    const side = document.createElement('div'); side.className = 'sw-side';
    d.ports.filter(p => p.type !== 'eth').forEach(p => side.appendChild(mk(p)));
    f.appendChild(grid); f.appendChild(side);
  } else d.ports.forEach(p => f.appendChild(mk(p)));
  const links = d.ports.map(p => {
    const hit = cableAt({ dev: d.id, port: p.id }); if (!hit) return '';
    const o = hit.cable.ends[1 - hit.k];
    return '<b>' + esc(p.label) + '</b> ' + (o ? '→ ' + esc(DEVICES[o.dev].name) + ' ' + esc(portOf(o).label) : '(extrémité en main)') + ' <span style="color:' + CABLE_TYPES[hit.cable.type].hex + '">· ' + esc(CABLE_TYPES[hit.cable.type].name) + '</span>';
  }).filter(Boolean);
  $('cabLinks').innerHTML = links.length ? links.join('&nbsp;&nbsp; ') : 'Aucun câble branché sur cet appareil.';
}
function updateCabHint() {
  $('cabHint').textContent = held
    ? (isTouch ? 'Glissez l’extrémité du câble sur un port, relâchez pour insérer (ou touchez un port).' : 'Saisissez l’extrémité du câble, glissez-la sur un port, relâchez pour insérer  |  Échap : annuler')
    : 'Aucun câble en main. Ouvrez le sac (I) pour en équiper un. Glissez un câble déjà branché pour le débrancher.';
}
function portAt(x, y) {
  const els = document.elementsFromPoint(x, y);
  for (const el of els) { const p = el.closest && el.closest('#face .port'); if (p) return p; }
  return null;
}
function checkPlug(h, end) {
  const r = firstEndOk(h.type, end); if (!r.ok) return r;
  const other = h.ends[1 - h.hand];
  return other ? pairOk(h.type, other, end) : OK;
}
function attemptPlug(pid) {
  if (!held) return;
  const end = { dev: Cab.dev, port: pid };
  const r = checkPlug(held, end);
  if (!r.ok) {
    toast(r.msg, 'bad', 6500); sfx.err();
    const el = document.querySelector('#face .port[data-port="' + pid + '"]');
    if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
    return;
  }
  held.ends[held.hand] = end;
  const other = held.ends[1 - held.hand];
  sfx.plug();
  if (other) {
    const c = held; cables.push(c); held = null;
    toast(CABLE_TYPES[c.type].name + ' branché : ' + DEVICES[other.dev].name + ' (' + portOf(other).label + ') ↔ ' + DEVICES[end.dev].name + ' (' + portOf(end).label + ')', 'good', 6000);
  } else {
    held.hand = 1 - held.hand;
    toast('Première extrémité branchée sur ' + DEVICES[end.dev].name + ' (' + portOf(end).label + '). Portez l’autre extrémité vers l’autre appareil.', 'good', 7000);
  }
  afterCableChange(); closeModal();
}
function pullOut(pid) {
  const hit = cableAt({ dev: Cab.dev, port: pid });
  if (!hit) return false;
  if (hit.held) { held.ends[hit.k] = null; held.hand = 0; }
  else {
    if (held) { toast('Vous tenez déjà un câble. Rangez-le avec G (ou le bouton Ranger).', 'bad'); sfx.err(); return false; }
    cables.splice(cables.indexOf(hit.cable), 1);
    hit.cable.ends[hit.k] = null; hit.cable.hand = hit.k; held = hit.cable; resetHeldVisuals();
  }
  sfx.pick(); afterCableChange(); renderFace(); updateCabHint();
  const pl = $('plug'); pl.hidden = false; pl.style.setProperty('--cc', CABLE_TYPES[held.type].hex);
  $('plugLabel').textContent = 'Saisir · ' + CABLE_TYPES[held.type].name;
  return true;
}
function startDrag(x, y) {
  Cab.drag = true; $('plug').classList.add('drag'); moveDrag(x, y);
}
function moveDrag(x, y) {
  Cab.x = x; Cab.y = y;
  const tipY = y - (isTouch ? 52 : 4), pl = $('plug');
  pl.style.left = x + 'px'; pl.style.top = tipY + 'px';
  const W = window.innerWidth, Hh = window.innerHeight, sy = Hh + 10, ey = tipY + 56;
  $('cabPath').setAttribute('d', 'M ' + (W / 2) + ' ' + sy + ' C ' + (W / 2) + ' ' + (sy - Hh * 0.35) + ', ' + x + ' ' + (ey + Hh * 0.35) + ', ' + x + ' ' + ey);
  $('cabPath').setAttribute('stroke', CABLE_TYPES[held.type].hex);
  document.querySelectorAll('#face .port.hot, #face .port.bad').forEach(p => p.classList.remove('hot', 'bad'));
  const el = portAt(x, tipY + 6), tip = $('dragTip');
  if (el) {
    const r = checkPlug(held, { dev: Cab.dev, port: el.dataset.port });
    el.classList.add(r.ok ? 'hot' : 'bad');
    tip.hidden = false; tip.className = r.ok ? '' : 'bad';
    tip.textContent = r.ok ? portOf({ dev: Cab.dev, port: el.dataset.port }).label + ' · Relâchez pour insérer' : 'Câble incompatible';
    tip.style.left = Math.max(110, Math.min(W - 110, x)) + 'px'; tip.style.top = (tipY + 70) + 'px';
  } else tip.hidden = true;
}
function endDragVisual() {
  Cab.drag = false;
  const pl = $('plug'); pl.classList.remove('drag'); pl.style.left = pl.style.top = '';
  $('cabPath').setAttribute('d', ''); $('dragTip').hidden = true;
  document.querySelectorAll('#face .port.hot, #face .port.bad').forEach(p => p.classList.remove('hot', 'bad'));
}
$('plug').addEventListener('pointerdown', e => { if (ui !== 'cab' || !held) return; e.preventDefault(); startDrag(e.clientX, e.clientY); });
$('face').addEventListener('pointerdown', e => {
  if (ui !== 'cab') return;
  const el = e.target.closest('.port'); if (!el) return;
  if (cableAt({ dev: Cab.dev, port: el.dataset.port })) { e.preventDefault(); if (pullOut(el.dataset.port)) startDrag(e.clientX, e.clientY); }
});
window.addEventListener('pointermove', e => { if (ui === 'cab' && Cab.drag) { e.preventDefault(); moveDrag(e.clientX, e.clientY); } });
window.addEventListener('pointerup', e => {
  if (ui !== 'cab' || !Cab.drag) return;
  const tipY = e.clientY - (isTouch ? 52 : 4), el = portAt(e.clientX, tipY + 6);
  endDragVisual(); Cab.swallow = true; setTimeout(() => { Cab.swallow = false; }, 80);
  if (el) attemptPlug(el.dataset.port);
});
window.addEventListener('pointercancel', () => { if (ui === 'cab' && Cab.drag) endDragVisual(); });
$('face').addEventListener('click', e => {
  if (ui !== 'cab' || Cab.swallow || Cab.drag) return;
  const el = e.target.closest('.port'); if (el && held) attemptPlug(el.dataset.port);
});
$('cabClose').addEventListener('click', closeModal);

/* ---------- Console CLI ---------- */
const Con = { sessions: {}, logs: {}, cli: null, dev: null };

function openConsole(pcId) {
  const c = cables.find(x => x.type === 'console' && x.ends.some(e => e.dev === pcId));
  if (!c) {
    toast('Aucune connexion console. Reliez le port COM1 de ' + DEVICES[pcId].name + ' au port con0 d’un switch avec le câble console.', 'bad', 7000);
    sfx.err(); return;
  }
  const sw = c.ends.find(e => e.dev !== pcId).dev;
  if (!Con.sessions[sw]) { const cli = new CLI(sw); Con.sessions[sw] = cli; Con.logs[sw] = [{ t: cli.banner(), c: '' }]; }
  Con.cli = Con.sessions[sw]; Con.dev = sw;
  $('conTitle').textContent = 'PuTTY console connection (' + Con.cli.cfg.host + ')';
  renderTerm(); renderHints(); show('con');
  $('hintPane').hidden = window.innerWidth <= 640 && !S.hintOpenMobile;
  setTimeout(() => $('cmd').focus({ preventScroll: true }), 40);
}
function appendLine(t, c) {
  const d = document.createElement('div'); d.className = 'ln ' + (c || ''); d.textContent = t; $('out').appendChild(d);
}
function scrollOut() { const o = $('out'); o.scrollTop = o.scrollHeight; }
function renderTerm() {
  $('out').innerHTML = ''; Con.logs[Con.dev].forEach(l => appendLine(l.t, l.c));
  $('ps1').textContent = Con.cli.prompt(); scrollOut();
}
function printLine(t, c) {
  const log = Con.logs[Con.dev]; log.push({ t, c }); if (log.length > 400) log.shift();
  appendLine(t, c); scrollOut();
}
function submitCmd() {
  const inp = $('cmd'), cli = Con.cli, v = inp.value;
  printLine(cli.prompt() + v, 'echo');
  cli.clear = false;
  const out = cli.exec(v);
  if (cli.clear) { Con.logs[Con.dev] = []; $('out').innerHTML = ''; }
  else if (out) printLine(out, /^%|\n%/.test(out) ? 'err' : '');
  inp.value = ''; $('ps1').textContent = cli.prompt();
  if (cli.close) { cli.close = false; cli.mode = 'user'; closeModal(); toast('Session console fermée.'); }
  checkMissions(); renderHints();
}
$('cmd').addEventListener('keydown', e => {
  const cli = Con.cli; if (!cli) return;
  if (e.key === 'Enter') { e.preventDefault(); submitCmd(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); if (cli.hi > 0) { cli.hi--; e.target.value = cli.history[cli.hi] || ''; } }
  else if (e.key === 'ArrowDown') { e.preventDefault(); if (cli.hi < cli.history.length) { cli.hi++; e.target.value = cli.history[cli.hi] || ''; } }
  else if (e.key === 'Tab') { e.preventDefault(); e.target.value = cli.complete(e.target.value); }
  else if (e.key.length === 1) sfx.key();
});
$('cmd').addEventListener('input', e => {
  const cli = Con.cli, inp = e.target;
  if (cli && inp.value.includes('?')) {
    const base = inp.value.replace(/\?/g, '');
    printLine(cli.prompt() + base + '?', 'echo');
    printLine(cli.help(base), '');
    inp.value = base;
  }
});
$('term').addEventListener('click', () => { if (!window.getSelection().toString()) $('cmd').focus({ preventScroll: true }); });
$('conClose').addEventListener('click', closeModal);
$('hintToggle').addEventListener('click', () => {
  const p = $('hintPane'); p.hidden = !p.hidden; S.hintOpenMobile = !p.hidden; $('cmd').focus({ preventScroll: true });
});

function currentCliMission() { return MISSIONS.find(m => m.level === S.level && m.hints && !S.done[m.id]) || null; }
function hintHtml(txt) {
  const lines = txt.split('\n');
  const first = esc(lines[0]).replace(/«\s*([^»]+?)\s*»/g, '<button class="cmdline inline" data-cmd="$1">$1</button>');
  return '<div>' + first + '</div>' + lines.slice(1).map(l => '<button class="cmdline" data-cmd="' + esc(l) + '">' + esc(l) + '</button>').join('');
}
function renderHints() {
  const m = currentCliMission(), box = $('hintList');
  if (!m) { box.innerHTML = '<p class="mut">Aucune tâche en console pour le moment : pas d’indice nécessaire.</p>'; return; }
  box.innerHTML = '<p class="mut" style="margin:0 0 4px">' + esc(m.title) + '</p>' + m.hints.map((h, i) => {
    const shown = S.hintShown[m.id + ':' + i];
    return '<div class="hint"><h5>Indice niveau ' + (i + 1) + ' <small>(10 XP)</small></h5>' +
      (shown ? '<div class="txt">' + hintHtml(h) + '</div>' : '<button class="reveal" data-k="' + m.id + ':' + i + '">Révéler l’indice</button>') + '</div>';
  }).join('');
}
$('hintList').addEventListener('click', e => {
  const r = e.target.closest('.reveal');
  if (r) {
    S.hintShown[r.dataset.k] = true; S.hintsUsed++; S.xp = Math.max(0, S.xp - 10);
    toast('Indice révélé : −10 XP', ''); renderHints(); renderObjectives(); return;
  }
  const c = e.target.closest('.cmdline');
  if (c) { const inp = $('cmd'); inp.value = c.dataset.cmd.trim(); inp.focus({ preventScroll: true }); }
});

/* ---------- Infos appareil ---------- */
function openInfo(id) {
  const d = DEVICES[id];
  $('infoTitle').textContent = d.name + ' · ' + d.model;
  const links = d.ports.map(p => { const o = peer(id, p.id), c = peerCable(id, p.id); return o ? { p, o, c } : null; }).filter(Boolean);
  let h = '<div class="kv"><span>Adresse MAC</span><span>' + d.mac + '</span></div><div class="kv"><span>Adresse IP</span><span>' + d.ip + '</span></div>';
  h += '<h3>Liaisons physiques (' + links.length + ')</h3>';
  h += links.length ? links.map(l => '<div class="link">' + esc(l.p.label) + ' ↔ ' + esc(DEVICES[l.o.dev].name) + ' ' + esc(portOf(l.o).label) + ' <span style="color:' + CABLE_TYPES[l.c.type].hex + '">· ' + esc(CABLE_TYPES[l.c.type].name) + '</span></div>').join('')
    : '<div class="link" style="color:var(--mut)">Aucun câble branché.</div>';
  if (d.kind === 'switch') {
    const cfg = CFG[id], ps = IFNAMES.filter(k => cfg.ifs[k].ps);
    h += '<h3>Configuration</h3><div class="kv"><span>Nom d’hôte</span><span>' + esc(cfg.host) + '</span></div>' +
      '<div class="kv"><span>Ports sécurisés</span><span>' + (ps.length ? ps.map(ifShort).join(', ') : 'aucun') + '</span></div>' +
      '<div class="kv"><span>VLANs</span><span>' + Object.keys(cfg.vlans).map(v => v + ':' + cfg.vlans[v]).join(' · ') + '</span></div>';
  }
  if (d.kind === 'pc') {
    const con = cables.find(c => c.type === 'console' && c.ends.some(e => e.dev === id));
    h += '<h3>Console</h3><div class="link">' + (con ? 'Connecté à ' + esc(DEVICES[con.ends.find(e => e.dev !== id).dev].name) + ' (touche C pour ouvrir)' : 'COM1 non connecté.') + '</div>';
  }
  $('infoBody').innerHTML = h; show('info');
}
$('infoClose').addEventListener('click', closeModal);

/* ---------- Dialogues ---------- */
const Dlg = { lines: [], i: 0, end: null };
function say(npc, lines, end) {
  Dlg.lines = lines; Dlg.i = 0; Dlg.end = end || null;
  $('dlgName').textContent = npc.name; $('dlgRole').textContent = npc.role;
  $('dialog').hidden = false; ui = 'dialog'; joy.x = joy.y = 0; showDialogLine(); sfx.click();
}
function showDialogLine() {
  $('dlgText').textContent = Dlg.lines[Dlg.i];
  $('dlgNext').firstChild.textContent = Dlg.i >= Dlg.lines.length - 1 ? 'Fermer ' : 'Continuer ';
}
function advanceDialog() {
  sfx.click();
  if (Dlg.i < Dlg.lines.length - 1) { Dlg.i++; showDialogLine(); return; }
  $('dialog').hidden = true; ui = null;
  const f = Dlg.end; Dlg.end = null; if (f) f();
}
$('dialog').addEventListener('click', advanceDialog);

const tips = { tech: 0, kaan: 0, lea: 0, omar: 0 };
function talk(id) {
  const n = NPCS.find(x => x.id === id);
  if (id === 'manager') return talkManager(n);
  const pools = {
    tech: ['Câble droit pour relier deux appareils différents, comme un PC et un switch. Câble croisé pour deux appareils identiques, comme deux switchs.',
      'Le câble console ne transporte pas de données : il sert uniquement à configurer un équipement depuis le port COM de votre PC.',
      'La fibre optique, c’est pour les ports SFP. Si le port est jaune sur le panneau, pensez fibre.',
      'Si vous vous trompez de câble, pas de panique : le jeu vous dit pourquoi ça ne passe pas. Lisez le message.'],
    kaan: ['Moi, je ne touche jamais au port-security sans « switchport mode access » avant. Mais ici le simulateur est tolérant.',
      'Dans la console, tapez « ? » à n’importe quel moment : elle liste les commandes possibles. Et Tab complète les mots.',
      'Les commandes « show » se lancent depuis le mode privilégié. En configuration, préfixez-les par « do ».'],
    lea: ['Un port sécurisé en mode sticky retient l’adresse MAC du premier appareil branché. Si quelqu’un d’autre se branche, le port peut se couper.',
      'Regardez le panneau « Live Attack Map » dans la salle technique : on bloque beaucoup de choses chaque minute.'],
    omar: ['Le serveur d’applications est relié en fibre pour le débit. Le câble cuivre servirait pour un petit réseau de bureau.',
      'Un VLAN, c’est un réseau virtuel dans le switch. La compta ne doit pas voir le trafic des autres services.']
  };
  const pool = pools[id]; if (!pool) return;
  say(n, [pool[tips[id] % pool.length]]); tips[id]++;
}
function talkManager(n) {
  if (S.final) {
    return say(n, [S.coffee ? 'Bravo pour votre journée. Vous pouvez continuer à explorer le site.' : 'Alors, ce café ? La cafétéria est à l’est du hall d’accueil.']);
  }
  const lv = S.level;
  if (!S.levelDone[lv]) {
    if (lv === 1) {
      const lines = ['Bonjour, je suis M. Diallo, responsable du réseau de Network Company.',
        'Mission du jour : reliez SW-KAT1 (port con0) au PC1 (port COM1) avec le câble console. Puis, depuis la console du PC1, sécurisez le port fa0/3.'];
      if (S.done.m1) lines.splice(0, 2, 'La liaison console est active. Appuyez sur C devant PC1 pour ouvrir la console, puis sécurisez fa0/3 avec le port-security sticky.');
      return say(n, lines);
    }
    return say(n, ['Il vous reste des tâches au niveau 2. Consultez la liste en haut à gauche. Le câble droit relie un PC à un switch, le croisé relie deux switchs.']);
  }
  if (lv === 1) {
    return say(n, ['Excellent ! Le port fa0/3 est désormais verrouillé sur l’adresse MAC de PC1.',
      'Niveau 2 : branchez PC2 sur fa0/5, reliez les deux switchs, installez le lien fibre vers le serveur, puis créez le VLAN 10 COMPTA.'],
      () => { S.talked[1] = true; S.level = 2; S.xp += 10; toast('Niveau 2 débloqué  +10 XP', 'good', 6000); sfx.ok(); checkMissions(); });
  }
  say(n, ['Parfait. Le réseau est propre, câblé et sécurisé.',
    'Vous avez mérité une pause : la cafétéria est à l’est du hall d’accueil. Prenez un café, vous l’avez gagné.'],
    () => { S.talked[2] = true; S.final = true; S.xp += 10; toast('Bonus +10 XP. Direction la cafétéria.', 'good', 6000); sfx.ok(); renderObjectives(); });
}
function takeCoffee() {
  if (!S.final) { toast('Un café ? Terminez d’abord vos missions et parlez à M. Diallo.', ''); return; }
  if (S.coffee) { toast('Vous avez déjà votre café.'); return; }
  S.coffee = true; S.xp += 10; sfx.ok(); toast('Vous avez pris un café. Il est excellent.', 'good', 5000); renderObjectives();
  setTimeout(finish, 1600);
}
function toggleDoor(d) { d.open = !d.open; sfx.door(); }

/* ---------- Fin de partie ---------- */
function finish() {
  const sec = Math.round((performance.now() - S.t0) / 1000), mm = Math.floor(sec / 60), ss = String(sec % 60).padStart(2, '0');
  $('endRank').textContent = rankFor(S.xp);
  $('endStats').innerHTML = [['XP total', S.xp], ['Missions', Object.keys(S.done).length + ' / ' + MISSIONS.length], ['Temps', mm + ':' + ss], ['Indices utilisés', S.hintsUsed]]
    .map(([k, v]) => '<div><b>' + v + '</b><span>' + k + '</span></div>').join('');
  show('end');
}
$('btnContinue').addEventListener('click', () => { closeModal(); });
$('btnReplay').addEventListener('click', () => location.reload());

/* ---------- Interactions ---------- */
const INTER = [];
function buildInteractables() {
  ['sw1', 'sw2', 'pc1', 'pc2', 'srv'].forEach(id => {
    const d = DEVICES[id];
    const acts = [{ key: 'E', label: () => held ? 'Brancher un câble (' + d.name + ')' : 'Connexions physiques (' + d.name + ')', fn: () => openCab(id) }];
    if (d.kind === 'pc') acts.push({ key: 'C', label: () => 'Console CLI (' + d.name + ')', fn: () => openConsole(id) });
    acts.push({ key: 'B', label: () => 'Infos appareil', fn: () => openInfo(id) });
    INTER.push({ id, pos: () => DEV3D[id].center, range: id === 'srv' ? 3.3 : 2.9, acts });
  });
  DOORS.forEach(d => INTER.push({
    id: d.id, range: 3.4,
    pos: () => V(d.axis === 'x' ? d.center : d.fixed, 1.3, d.axis === 'x' ? d.fixed : d.center),
    acts: [{ key: 'E', label: () => (d.open ? 'Fermer' : 'Ouvrir') + ' la porte (' + d.label + ')', fn: () => toggleDoor(d) }]
  }));
  NPCS.forEach(n => INTER.push({ id: n.id, range: 3.4, pos: () => V(n.x, 1.45, n.z), acts: [{ key: 'E', label: () => 'Parler à ' + n.name, fn: () => talk(n.id) }] }));
  INTER.push({ id: 'coffee', range: 3.3, pos: () => V(12.9, 1.3, 5.5), acts: [{ key: 'E', label: () => 'Prendre un café', fn: takeCoffee }] });
}
const _f = new THREE.Vector3();
function findTarget() {
  camera.getWorldDirection(_f);
  const c = camera.position; let best = null, bs = 9e9;
  for (const it of INTER) {
    const p = it.pos(), dx = p.x - c.x, dy = p.y - c.y, dz = p.z - c.z, d = Math.hypot(dx, dy, dz);
    if (d > it.range) continue;
    const dot = (dx * _f.x + dy * _f.y + dz * _f.z) / d;
    if (dot < 0.86) continue;
    const sc = (1 - dot) * 10 + d * 0.2;
    if (sc < bs) { bs = sc; best = it; }
  }
  return best;
}
let lastPrompt = '';
function updatePrompt() {
  let html = '', has = {};
  if (!ui && S.phase === 'play') {
    target = findTarget();
    if (target) {
      const acts = target.acts.filter(a => !a.when || a.when());
      acts.forEach(a => { has[a.key] = true; });
      html = acts.filter(a => !isTouch || a.key === 'E').map(a => '<span><kbd>' + a.key + '</kbd>' + esc(a.label()) + '</span>').join('<i>|</i>');
    }
  } else target = null;
  if (html !== lastPrompt) { lastPrompt = html; $('prompt').hidden = !html; $('prompt').innerHTML = html; }
  $('tbC').hidden = !has.C; $('tbB').hidden = !has.B;
  $('tbE').style.opacity = has.E ? 1 : 0.45;
}
function doAct(key) {
  if (!target) {
    if (key === 'E') tipOnce('noTarget', 'Rapprochez-vous d’un appareil, d’une personne ou d’une porte, et visez-le avec le point vert.');
    return;
  }
  const a = target.acts.find(x => x.key === key && (!x.when || x.when()));
  if (a) a.fn();
}

/* ---------- Entrées clavier ---------- */
window.addEventListener('keydown', e => {
  if (S.phase === 'title') { if (e.key === 'Enter') startGame(); return; }
  if (e.key === 'Escape') { if (ui === 'dialog') { advanceDialog(); } else closeModal(); return; }
  if (ui === 'con') return;
  const k = e.key.toLowerCase();
  if (ui === 'dialog') { if (k === 'e' || k === 'enter' || k === ' ') { e.preventDefault(); advanceDialog(); } return; }
  if (ui === 'bag') {
    if (k === 'i' || k === 'tab') { e.preventDefault(); closeModal(); }
    else if (/^[1-4]$/.test(k)) equip(Object.keys(CABLE_TYPES)[+k - 1]);
    return;
  }
  if (ui === 'info') { if (k === 'b') closeModal(); return; }
  if (ui === 'help') { if (k === 'h' || k === '?') closeModal(); return; }
  if (ui) return;
  if (e.code && /^(KeyW|KeyA|KeyS|KeyD|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|ShiftLeft|ShiftRight)$/.test(e.code)) { keys[e.code] = true; if (e.code.startsWith('Arrow')) e.preventDefault(); return; }
  if (k === 'e') doAct('E');
  else if (k === 'c') doAct('C');
  else if (k === 'b') doAct('B');
  else if (k === 'i' || k === 'tab') { e.preventDefault(); openBag(); }
  else if (k === 'g') stow();
  else if (k === 'h' || k === '?') show('help');
  else if (k === 'm') toggleSound();
});
window.addEventListener('keyup', e => { if (e.code) keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

function look(dx, dy, k) {
  P.yaw -= dx * k; P.pitch = Math.max(-1.35, Math.min(1.35, P.pitch - dy * k));
}
document.addEventListener('mousemove', e => {
  if (S.phase !== 'play' || ui) return;
  if (document.pointerLockElement === $('c')) look(e.movementX, e.movementY, 0.0024);
  else if (e.buttons & 1 && e.target === $('c')) look(e.movementX, e.movementY, 0.0034);
});
$('c').addEventListener('click', () => { if (S.phase === 'play' && !ui && !isTouch) lockPointer(); });

/* ---------- Tactile ---------- */
const T = { stick: null, look: null, sx: 0, sy: 0, lx: 0, ly: 0 };
(function initTouch() {
  const cv = $('c');
  cv.addEventListener('touchstart', e => {
    if (S.phase !== 'play' || ui) return;
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.clientX < window.innerWidth * 0.45 && T.stick === null) {
        T.stick = t.identifier; T.sx = t.clientX; T.sy = t.clientY;
        const s = $('stick'); s.style.left = T.sx + 'px'; s.style.top = T.sy + 'px'; s.classList.add('on'); $('knob').style.transform = '';
      } else if (T.look === null) { T.look = t.identifier; T.lx = t.clientX; T.ly = t.clientY; }
    }
  }, { passive: false });
  cv.addEventListener('touchmove', e => {
    if (S.phase !== 'play' || ui) return;
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === T.stick) {
        let dx = (t.clientX - T.sx) / 50, dy = (t.clientY - T.sy) / 50; const l = Math.hypot(dx, dy);
        if (l > 1) { dx /= l; dy /= l; }
        joy.x = dx; joy.y = -dy; $('knob').style.transform = 'translate(' + dx * 40 + 'px,' + dy * 40 + 'px)';
      } else if (t.identifier === T.look) {
        look(t.clientX - T.lx, t.clientY - T.ly, 0.0048); T.lx = t.clientX; T.ly = t.clientY;
      }
    }
  }, { passive: false });
  const end = e => {
    for (const t of e.changedTouches) {
      if (t.identifier === T.stick) { T.stick = null; joy.x = joy.y = 0; $('stick').classList.remove('on'); }
      if (t.identifier === T.look) T.look = null;
    }
  };
  cv.addEventListener('touchend', end); cv.addEventListener('touchcancel', end);
  const btn = (id, fn) => $(id).addEventListener('pointerdown', e => { e.preventDefault(); if (S.phase === 'play' && !ui) fn(); });
  btn('tbE', () => doAct('E')); btn('tbC', () => doAct('C')); btn('tbB', () => doAct('B')); btn('tbStow', stow);
})();

/* ---------- Boutons HUD ---------- */
function toggleSound() { soundOn = !soundOn; $('btnSound').classList.toggle('off', !soundOn); }
$('btnBag').addEventListener('click', () => { if (!ui) openBag(); });
$('btnHelp').addEventListener('click', () => { if (!ui) show('help'); });
$('btnSound').addEventListener('click', toggleSound);
$('bagClose').addEventListener('click', closeModal);
$('helpClose').addEventListener('click', closeModal);
$('objToggle').addEventListener('click', () => {
  const o = $('obj'); o.classList.toggle('min'); $('objToggle').textContent = o.classList.contains('min') ? '+' : '–';
});
$('dlgNext').addEventListener('click', e => { e.stopPropagation(); advanceDialog(); });
if (isTouch) $('cabClose').textContent = 'Fermer ×';
if (isTouch) $('titleKeys').textContent = 'Joystick à gauche pour marcher · glissez à droite pour regarder · boutons E, C, B pour agir';

/* ---------- Joueur ---------- */
const R = 0.3;
function blocked(x, z) {
  for (const c of COLLIDERS) {
    if (!c.on) continue;
    const nx = Math.max(c.x0, Math.min(x, c.x1)), nz = Math.max(c.z0, Math.min(z, c.z1));
    const dx = x - nx, dz = z - nz;
    if (dx * dx + dz * dz < R * R) return true;
  }
  return false;
}
function updatePlayer(dt) {
  P.moving = false;
  let fx = 0, sx = 0;
  if (S.phase === 'play' && !ui) {
    fx = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) + joy.y;
    sx = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0) + joy.x;
    if (keys.ArrowLeft) P.yaw += 1.9 * dt; if (keys.ArrowRight) P.yaw -= 1.9 * dt;
  }
  const l = Math.hypot(fx, sx); if (l > 1) { fx /= l; sx /= l; }
  if (l > 0.05) {
    const sp = (keys.ShiftLeft || keys.ShiftRight ? 4.8 : 2.9) * dt, sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
    const dx = (-sy * fx + cy * sx) * sp, dz = (-cy * fx - sy * sx) * sp;
    if (!blocked(P.x + dx, P.z)) P.x += dx;
    if (!blocked(P.x, P.z + dz)) P.z += dz;
    P.moving = true; P.bob += dt * (keys.ShiftLeft || keys.ShiftRight ? 9 : 6.5);
  }
  camera.position.set(P.x, 1.65 + (P.moving ? Math.sin(P.bob) * 0.03 : 0), P.z);
  camera.rotation.set(P.pitch, P.yaw, 0, 'YXZ');
  handsRig.position.set(Math.cos(P.bob * 0.5) * (P.moving ? 0.012 : 0), Math.sin(P.bob) * (P.moving ? 0.01 : 0), 0);
}

/* ---------- Démarrage et boucle ---------- */
function startGame() {
  if (S.phase !== 'title') return;
  actx(); S.phase = 'play'; S.t0 = performance.now(); ui = null;
  $('title').hidden = true; $('hud').hidden = false;
  if (isTouch || window.innerWidth <= 640) { $('obj').classList.add('min'); $('objToggle').textContent = '+'; }
  renderObjectives(); updateHeldBadge();
  toast('Bienvenue dans la salle technique. Première mission : ouvrez le sac (' + (isTouch ? 'bouton Sac' : 'touche I') + ') et prenez le câble console.', 'info', 8000);
  lockPointer();
}
$('btnStart').addEventListener('click', startGame);

let last = performance.now(), clock = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now; clock += dt;
  updatePlayer(dt);
  updateWorld(clock, dt, P);
  if (S.phase === 'play') updatePrompt();
  renderer.render(scene, camera);
}

function onResize() {
  resizeWorld();
  const vv = window.visualViewport; document.documentElement.style.setProperty('--vvh', (vv ? vv.height : window.innerHeight) + 'px');
}
window.addEventListener('resize', onResize);
if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);

async function boot() {
  try { if (document.fonts && document.fonts.load) await Promise.race([document.fonts.load('700 48px "Chakra Petch"'), new Promise(r => setTimeout(r, 1200))]); } catch (e) { /* police par défaut */ }
  buildWorld($('c'));
  // Câblage déjà en place : PC1 (Ethernet0) relié à SW-KAT1 (fa0/3) en câble droit
  const pre = newCable('straight'); pre.ends = [{ dev: 'pc1', port: 'eth0' }, { dev: 'sw1', port: 'fa0/3' }];
  cables.push(pre);
  buildInteractables();
  syncCableMeshes(); stickyRefresh();
  onResize(); renderObjectives();
  window.__game = { S, P, cables, DEVICES, CFG, DEV3D, NPCS, DOORS, INTER, Con, Cab, MISSIONS,
    get held() { return held; }, get ui() { return ui; }, get target() { return target; },
    equip, openCab, attemptPlug, openConsole, openInfo, openBag, startGame, checkMissions, talk, takeCoffee, stow, show, closeModal, submitCmd, renderHints };
  requestAnimationFrame(frame);
  document.body.classList.add('ready');
}
boot();
