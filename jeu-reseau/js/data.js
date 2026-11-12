'use strict';
/* ============================================================
   NetCore Lab : données du jeu (appareils, câbles, missions)
   ============================================================ */

/* ---------- Types de câbles (contenu du sac d'équipement) ---------- */
const CABLE_TYPES = {
  console: {
    name: 'Câble console', color: 0x35e0ff, hex: '#35e0ff',
    desc: 'Relie le port console (con0) d’un équipement réseau au port COM de votre PC pour ouvrir la configuration.'
  },
  straight: {
    name: 'Câble CAT6 droit', color: 0x3d8bff, hex: '#3d8bff',
    desc: 'Câble RJ45 droit pour relier des appareils de nature différente : PC ↔ switch, serveur ↔ switch.'
  },
  cross: {
    name: 'Câble CAT6 croisé', color: 0xff4d5e, hex: '#ff4d5e',
    desc: 'Câble RJ45 croisé pour relier des appareils de même nature : switch ↔ switch, PC ↔ PC.'
  },
  fiber: {
    name: 'Fibre optique', color: 0xffc21a, hex: '#ffc21a',
    desc: 'Fibre pour les liaisons longues ou à haut débit entre deux ports SFP (gi0/1, sfp0).'
  }
};

/* ---------- Appareils et leurs ports ---------- */
function switchPorts() {
  const p = [];
  for (let i = 1; i <= 24; i++) p.push({ id: 'fa0/' + i, label: 'fa0/' + i, type: 'eth' });
  p.push({ id: 'gi0/1', label: 'gi0/1', type: 'sfp' }, { id: 'gi0/2', label: 'gi0/2', type: 'sfp' });
  p.push({ id: 'con0', label: 'con0', type: 'console' });
  return p;
}

const DEVICES = {
  sw1: { id: 'sw1', kind: 'switch', name: 'SW-KAT1', label: 'Switch1', model: 'Switch NetCore 24 ports', mac: '00e0.f7a2.0a01', ip: '192.168.1.2', ports: switchPorts() },
  sw2: { id: 'sw2', kind: 'switch', name: 'SW-KAT2', label: 'Switch2', model: 'Switch NetCore 24 ports', mac: '00e0.f7a2.0b02', ip: '192.168.1.3', ports: switchPorts() },
  pc1: { id: 'pc1', kind: 'pc', name: 'PC1', label: 'PC1', model: 'Poste de travail', mac: '0010.5a3f.1111', ip: '192.168.1.11',
    ports: [{ id: 'eth0', label: 'Ethernet0', type: 'eth' }, { id: 'com1', label: 'COM1', type: 'console' }] },
  pc2: { id: 'pc2', kind: 'pc', name: 'PC2', label: 'PC2', model: 'Poste de travail', mac: '0010.5a3f.2222', ip: '192.168.1.12',
    ports: [{ id: 'eth0', label: 'Ethernet0', type: 'eth' }] },
  srv: { id: 'srv', kind: 'server', name: 'SRV-APP', label: 'Serveur', model: 'Serveur d’applications', mac: '0050.56a1.4c10', ip: '192.168.1.100',
    ports: [{ id: 'eth0', label: 'eth0', type: 'eth' }, { id: 'sfp0', label: 'sfp0', type: 'sfp' }] }
};

function portOf(e) { return DEVICES[e.dev].ports.find(p => p.id === e.port); }
function devClass(d) { return d.kind === 'switch' ? 'net' : 'host'; }

/* ---------- État des câbles ---------- */
let cableSeq = 1;
const cables = [];   // câbles dont les deux extrémités sont branchées
let held = null;     // câble en main : { id, type, ends:[e|null, e|null], hand:0|1 }

function newCable(type) { return { id: cableSeq++, type, ends: [null, null], hand: 0 }; }

function sameEnd(a, b) { return a && b && a.dev === b.dev && a.port === b.port; }

function cableAt(e) {
  for (const c of cables) for (let k = 0; k < 2; k++) if (sameEnd(c.ends[k], e)) return { cable: c, k, held: false };
  if (held) for (let k = 0; k < 2; k++) if (sameEnd(held.ends[k], e)) return { cable: held, k, held: true };
  return null;
}

/* Extrémité opposée d'un câble complet branché sur ce port */
function peer(dev, port) {
  const e = { dev, port };
  for (const c of cables) for (let k = 0; k < 2; k++) if (sameEnd(c.ends[k], e)) return c.ends[1 - k];
  return null;
}
function peerCable(dev, port) {
  const e = { dev, port };
  for (const c of cables) for (let k = 0; k < 2; k++) if (sameEnd(c.ends[k], e)) return c;
  return null;
}

/* Y a-t-il un câble de ce type entre deux appareils ? */
function hasCable(type, devA, devB, filter) {
  return cables.some(c => c.type === type &&
    ((c.ends[0].dev === devA && c.ends[1].dev === devB) || (c.ends[0].dev === devB && c.ends[1].dev === devA)) &&
    (!filter || filter(c)));
}

/* ---------- Règles de compatibilité des câbles ---------- */
const OK = { ok: true };
const fail = msg => ({ ok: false, msg });

function firstEndOk(type, e) {
  const p = portOf(e);
  if (cableAt(e)) return fail('Ce port est déjà occupé par un câble.');
  if (type === 'console' && p.type !== 'console')
    return fail('Le câble console se branche uniquement sur un port console (con0 ou COM1), pas sur « ' + p.label + ' ».');
  if ((type === 'straight' || type === 'cross') && p.type !== 'eth')
    return fail(p.type === 'sfp' ? 'Ce port SFP attend de la fibre optique, pas un câble cuivre.'
                                 : 'Ce port console exige le câble console.');
  if (type === 'fiber' && p.type !== 'sfp')
    return fail('La fibre se branche uniquement sur un port SFP (gi0/1, gi0/2, sfp0).');
  return OK;
}

function pairOk(type, a, b) {
  if (a.dev === b.dev) return fail('Les deux extrémités ne peuvent pas être sur le même appareil.');
  const da = DEVICES[a.dev], db = DEVICES[b.dev];
  if (type === 'console') {
    const kinds = [da.kind, db.kind].sort().join('/');
    return kinds === 'pc/switch' ? OK : fail('Un câble console relie le port COM d’un PC au port con0 d’un équipement réseau.');
  }
  if (type === 'straight')
    return devClass(da) !== devClass(db) ? OK
      : fail('Un câble droit relie des appareils de nature différente (PC ↔ switch). Pour ' + da.name + ' ↔ ' + db.name + ', il faut un câble croisé.');
  if (type === 'cross')
    return devClass(da) === devClass(db) ? OK
      : fail('Un câble croisé relie des appareils de même nature (switch ↔ switch). Pour ' + da.name + ' ↔ ' + db.name + ', il faut un câble droit.');
  return OK; // fibre : SFP ↔ SFP
}

/* ---------- Missions ---------- */
const MISSIONS = [
  { id: 'm1', level: 1, xp: 30, title: 'Brancher le câble console',
    text: 'Reliez le port con0 de SW-KAT1 au port COM1 de PC1 avec un câble console.',
    done: () => hasCable('console', 'sw1', 'pc1') },
  { id: 'm2', level: 1, xp: 50, title: 'Activer le port-security',
    text: 'Depuis la console de PC1 (touche C), activez le port-security avec apprentissage sticky sur FastEthernet0/3 de SW-KAT1.',
    done: () => { const i = CFG.sw1.ifs['fa0/3']; return i.ps && i.sticky; },
    hints: [
      'Passez en mode configuration globale sur SW-KAT1 : tapez « enable » puis « configure terminal » (ou « conf t »).',
      'Sélectionnez l’interface FastEthernet0/3 : tapez « interface fastethernet0/3 » (ou « int fa0/3 »).',
      'Exécutez ces commandes pour activer la sécurité de port avec apprentissage sticky :\nswitchport port-security\nswitchport port-security mac-address sticky'
    ] },
  { id: 'm3', level: 2, xp: 30, title: 'Brancher PC2',
    text: 'Branchez PC2 sur le port fa0/5 de SW-KAT1 avec le bon câble.',
    done: () => hasCable('straight', 'pc2', 'sw1', c => c.ends.some(e => e.dev === 'sw1' && e.port === 'fa0/5')) },
  { id: 'm4', level: 2, xp: 30, title: 'Lien entre switchs',
    text: 'Reliez SW-KAT1 et SW-KAT2 avec un câble croisé (deux switchs = même nature).',
    done: () => hasCable('cross', 'sw1', 'sw2') },
  { id: 'm5', level: 2, xp: 40, title: 'Lien fibre vers le serveur',
    text: 'Reliez un port SFP de SW-KAT1 (gi0/1) au port sfp0 du serveur SRV-APP par fibre optique.',
    done: () => hasCable('fiber', 'sw1', 'srv') },
  { id: 'm6', level: 2, xp: 50, title: 'VLAN COMPTA',
    text: 'Sur SW-KAT1 : créez le VLAN 10 nommé COMPTA, puis placez fa0/5 en mode access dans ce VLAN.',
    done: () => { const c = CFG.sw1; const i = c.ifs['fa0/5']; return c.vlans[10] === 'COMPTA' && i.vlan === 10 && i.mode === 'access'; },
    hints: [
      'Entrez en mode configuration (enable puis conf t), puis créez le VLAN avec la commande « vlan 10 ».',
      'Nommez-le avec « name COMPTA », quittez avec « exit », puis sélectionnez « interface fa0/5 ».',
      'Dans l’interface, exécutez :\nswitchport mode access\nswitchport access vlan 10'
    ] }
];

/* ---------- Rangs ---------- */
function rankFor(xp) {
  if (xp >= 230) return 'Ingénieur réseau';
  if (xp >= 160) return 'Technicien confirmé';
  if (xp >= 90) return 'Technicien';
  return 'Stagiaire';
}

/* ---------- État général ---------- */
const S = {
  phase: 'title', xp: 20, hintsUsed: 0, level: 1,
  done: {}, levelDone: {}, talked: { 1: false, 2: false }, final: false, coffee: false,
  hintShown: {}, t0: 0
};
