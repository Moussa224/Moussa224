'use strict';
/* ============================================================
   NetCore Lab : simulateur de ligne de commande (style Cisco IOS)
   ============================================================ */

const IFNAMES = [];
for (let i = 1; i <= 24; i++) IFNAMES.push('fa0/' + i);
IFNAMES.push('gi0/1', 'gi0/2');

function ifKey(s) {
  s = String(s).toLowerCase().replace(/\s+/g, '');
  const m = s.match(/^(fastethernet|fa|f|gigabitethernet|gi|g)(\d+\/\d+)$/);
  if (!m) return null;
  const k = (m[1][0] === 'f' ? 'fa' : 'gi') + m[2];
  return IFNAMES.includes(k) ? k : null;
}
const ifLong = k => (k.startsWith('fa') ? 'FastEthernet' : 'GigabitEthernet') + k.slice(2);
const ifShort = k => (k.startsWith('fa') ? 'Fa' : 'Gi') + k.slice(2);
const padr = (s, n) => String(s).padEnd(n, ' ');

function newCfg(host) {
  const ifs = {};
  IFNAMES.forEach(k => {
    ifs[k] = { shutdown: false, mode: 'dynamic', vlan: 1, desc: '', ps: false, sticky: false, max: 1, viol: 'shutdown', macs: [] };
  });
  return { host, ifs, vlans: { 1: 'default' }, secret: null, saved: false };
}
const CFG = { sw1: newCfg('SW-KAT1'), sw2: newCfg('SW-KAT2') };

function ifStatus(dev, k) {
  if (CFG[dev].ifs[k].shutdown) return 'administratively down';
  return peer(dev, k) ? 'up' : 'down';
}

/* Apprentissage sticky : à appeler quand les câbles changent */
function stickyRefresh() {
  ['sw1', 'sw2'].forEach(dev => IFNAMES.forEach(k => {
    const c = CFG[dev].ifs[k];
    if (c.ps && c.sticky && !c.macs.length) {
      const p = peer(dev, k);
      if (p) c.macs.push(DEVICES[p.dev].mac);
    }
  }));
}

/* ---------- Table des commandes ---------- */
const CMDS = [];
function def(modes, pat, help, run) { CMDS.push({ modes, pat, toks: pat.split(' '), help, run }); }

function ifConfigLines(c) {
  const o = [];
  if (c.desc) o.push(' description ' + c.desc);
  if (c.mode === 'access') o.push(' switchport mode access');
  if (c.mode === 'trunk') o.push(' switchport mode trunk');
  if (c.vlan !== 1) o.push(' switchport access vlan ' + c.vlan);
  if (c.ps) {
    o.push(' switchport port-security');
    if (c.max !== 1) o.push(' switchport port-security maximum ' + c.max);
    if (c.viol !== 'shutdown') o.push(' switchport port-security violation ' + c.viol);
    if (c.sticky) {
      o.push(' switchport port-security mac-address sticky');
      c.macs.forEach(m => o.push(' switchport port-security mac-address sticky ' + m));
    }
  }
  if (c.shutdown) o.push(' shutdown');
  return o;
}

function showRun(cli) {
  const cfg = cli.cfg;
  const L = ['Building configuration...', '', 'Current configuration : 1187 bytes', '!', 'version 15.2',
    'service timestamps debug datetime msec', '!', 'hostname ' + cfg.host, '!'];
  if (cfg.secret) L.push('enable secret 5 $1$mERr$hx5rVt7rPNoS4wqbXKX7m0', '!');
  Object.keys(cfg.vlans).filter(v => +v !== 1).forEach(v => L.push('vlan ' + v, ' name ' + cfg.vlans[v], '!'));
  let hidden = 0;
  IFNAMES.forEach(k => {
    const lines = ifConfigLines(cfg.ifs[k]);
    if (!lines.length) { hidden++; return; }
    L.push('interface ' + ifLong(k), ...lines, '!');
  });
  if (hidden) L.push('! ' + hidden + ' interface(s) à la configuration par défaut non affichée(s)');
  L.push('!', 'end');
  return L.join('\n');
}

function showIpBrief(cli) {
  const L = [padr('Interface', 10) + padr('IP-Address', 11) + padr('OK?', 4) + padr('Method', 7) + padr('Status', 22) + 'Protocol'];
  const row = (n, st) => padr(n, 10) + padr('unassigned', 11) + padr('YES', 4) + padr('unset', 7) + padr(st, 22) + (st === 'up' ? 'up' : 'down');
  IFNAMES.forEach(k => L.push(row(ifShort(k), ifStatus(cli.dev, k))));
  L.push(row('Vlan1', 'administratively down'));
  return L.join('\n');
}

function showIfStatus(cli) {
  const L = [padr('Port', 8) + padr('Name', 9) + padr('Status', 11) + padr('Vlan', 6) + padr('Duplex', 7) + padr('Speed', 7) + 'Type'];
  IFNAMES.forEach(k => {
    const c = CFG[cli.dev].ifs[k], st = ifStatus(cli.dev, k);
    const s = st === 'up' ? 'connected' : st === 'down' ? 'notconnect' : 'disabled';
    const vl = c.mode === 'trunk' ? 'trunk' : String(c.vlan);
    const fast = k.startsWith('fa');
    L.push(padr(ifShort(k), 8) + padr(c.desc.slice(0, 8), 9) + padr(s, 11) + padr(vl, 6) +
      padr(st === 'up' ? 'a-full' : 'auto', 7) + padr(st === 'up' ? (fast ? 'a-100' : 'a-1000') : 'auto', 7) +
      (fast ? '10/100TX' : '1000SFP'));
  });
  return L.join('\n');
}

function showPortSec(cli) {
  const rows = IFNAMES.filter(k => CFG[cli.dev].ifs[k].ps);
  if (!rows.length) return 'Aucune interface n’a le port-security activé.';
  const L = [padr('Port', 8) + padr('MaxAddr', 9) + padr('Current', 9) + padr('Violations', 12) + 'Action',
    '-'.repeat(48)];
  rows.forEach(k => {
    const c = CFG[cli.dev].ifs[k];
    L.push(padr(ifShort(k), 8) + padr(c.max, 9) + padr(c.macs.length, 9) + padr(0, 12) + c.viol[0].toUpperCase() + c.viol.slice(1));
  });
  return L.join('\n');
}

function showPortSecIf(cli, k) {
  const c = CFG[cli.dev].ifs[k];
  const L = [
    padr('Port Security', 28) + ': ' + (c.ps ? 'Enabled' : 'Disabled'),
    padr('Port Status', 28) + ': ' + (c.ps ? (ifStatus(cli.dev, k) === 'up' ? 'Secure-up' : 'Secure-down') : 'Secure-down'),
    padr('Violation Mode', 28) + ': ' + c.viol[0].toUpperCase() + c.viol.slice(1),
    padr('Maximum MAC Addresses', 28) + ': ' + c.max,
    padr('Total MAC Addresses', 28) + ': ' + c.macs.length,
    padr('Sticky MAC Addresses', 28) + ': ' + (c.sticky ? c.macs.length : 0),
    padr('Last Source Address:Vlan', 28) + ': ' + (c.macs[0] ? c.macs[0] + ':' + c.vlan : '0000.0000.0000:0'),
    padr('Security Violation Count', 28) + ': 0'
  ];
  return L.join('\n');
}

function showVlanBrief(cli) {
  const cfg = CFG[cli.dev];
  const L = ['VLAN Name             Status   Ports', '---- ---------------- -------- ----------------------'];
  Object.keys(cfg.vlans).map(Number).sort((a, b) => a - b).forEach(v => {
    const ports = IFNAMES.filter(k => cfg.ifs[k].vlan === v && cfg.ifs[k].mode !== 'trunk').map(ifShort);
    const lines = []; let cur = '';
    ports.forEach(p => { if ((cur + p + ', ').length > 23) { lines.push(cur.trim()); cur = ''; } cur += p + ', '; });
    if (cur) lines.push(cur.trim().replace(/,$/, ''));
    L.push(padr(v, 5) + padr(cfg.vlans[v], 17) + padr('active', 9) + (lines[0] || ''));
    lines.slice(1).forEach(ln => L.push(' '.repeat(31) + ln));
  });
  return L.join('\n');
}

function showMacTable(cli) {
  const L = ['          Mac Address Table', '-------------------------------------------', '',
    'Vlan    Mac Address       Type        Ports', '----    -----------       --------    -----'];
  let n = 0;
  IFNAMES.forEach(k => {
    const p = peer(cli.dev, k);
    if (!p) return;
    const c = CFG[cli.dev].ifs[k];
    L.push(padr('   ' + c.vlan, 8) + padr(DEVICES[p.dev].mac, 18) + padr(c.sticky && c.ps ? 'STATIC' : 'DYNAMIC', 12) + ifShort(k));
    n++;
  });
  L.push('Total Mac Addresses for this criterion: ' + n);
  return L.join('\n');
}

const SHOW_VERSION = cli => 'NetCore Network Operating System Simulator v15.2 (NetCore Edition)\n' +
  'ROM: System Bootstrap, Version 12.2(25r)\n' + cli.cfg.host + ' uptime is 3 hours, 12 minutes\n' +
  '24 FastEthernet interfaces\n2 Gigabit Ethernet interfaces\n64K bytes of flash-simulated non-volatile configuration memory.';

const ALL = ['user', 'priv', 'config', 'if', 'vlan'];

def(['user'], 'enable', 'Turn on privileged commands', cli => { cli.mode = 'priv'; return ''; });
def(['priv'], 'disable', 'Turn off privileged commands', cli => { cli.mode = 'user'; return ''; });
def(['user', 'priv'], 'exit', 'Exit from the EXEC', cli => { cli.close = true; return 'Session console fermée.'; });
def(['priv'], 'configure terminal', 'Configure from the terminal', cli => {
  cli.mode = 'config'; return 'Enter configuration commands, one per line.  End with CNTL/Z.';
});

def(['user', 'priv'], 'show version', 'System hardware and software status', SHOW_VERSION);
def(['priv'], 'show running-config', 'Current operating configuration', showRun);
def(['priv'], 'show startup-config', 'Contents of startup configuration', cli => cli.cfg.saved ? showRun(cli) : 'startup-config is not present');
def(['priv'], 'show ip interface brief', 'Brief summary of IP status and configuration', showIpBrief);
def(['priv'], 'show interfaces status', 'Interface line status', showIfStatus);
def(['priv'], 'show port-security', 'Show secure port information', showPortSec);
def(['priv'], 'show port-security interface <*if>', 'Show secure port details of an interface', (cli, a) => {
  const k = ifKey(a[0]); if (!k) return '% Invalid interface';
  return showPortSecIf(cli, k);
});
def(['priv'], 'show vlan brief', 'VTP all VLAN status in brief', showVlanBrief);
def(['priv'], 'show mac address-table', 'MAC forwarding table', showMacTable);
def(['priv'], 'write memory', 'Write running configuration to memory', cli => { cli.cfg.saved = true; return 'Building configuration...\n[OK]'; });
def(['priv'], 'copy running-config startup-config', 'Copy configuration to NVRAM', cli => { cli.cfg.saved = true; return 'Destination filename [startup-config]? \nBuilding configuration...\n[OK]'; });

def(['config'], 'hostname <name>', 'Set system’s network name', (cli, a) => {
  if (!/^[A-Za-z][\w-]{0,30}$/.test(a[0])) return '% Invalid hostname';
  cli.cfg.host = a[0]; return '';
});
def(['config'], 'enable secret <password>', 'Assign the privileged level secret', (cli, a) => { cli.cfg.secret = a[0]; return ''; });
def(['config', 'if'], 'interface <*if>', 'Select an interface to configure', (cli, a) => {
  const k = ifKey(a[0]); if (!k) return '% Invalid interface type and number';
  cli.mode = 'if'; cli.cur = k; return '';
});
def(['config'], 'vlan <id>', 'VLAN commands', (cli, a) => {
  const v = +a[0];
  if (!/^\d+$/.test(a[0]) || v < 1 || v > 4094) return '% Invalid input detected: VLAN ID must be between 1 and 4094';
  if (!cli.cfg.vlans[v]) cli.cfg.vlans[v] = 'VLAN' + String(v).padStart(4, '0');
  cli.mode = 'vlan'; cli.curVlan = v; return '';
});
def(['vlan'], 'name <name>', 'Ascertain VLAN name', (cli, a) => { cli.cfg.vlans[cli.curVlan] = a[0]; return ''; });

def(['config', 'if', 'vlan'], 'exit', 'Exit from current mode', cli => {
  cli.mode = cli.mode === 'config' ? 'priv' : 'config'; return '';
});
def(['config', 'if', 'vlan'], 'end', 'Exit to privileged EXEC mode', cli => { cli.mode = 'priv'; return ''; });

const IFC = cli => cli.cfg.ifs[cli.cur];
def(['if'], 'switchport mode access', 'Set trunking mode to ACCESS unconditionally', cli => { IFC(cli).mode = 'access'; return ''; });
def(['if'], 'switchport mode trunk', 'Set trunking mode to TRUNK unconditionally', cli => { IFC(cli).mode = 'trunk'; return ''; });
def(['if'], 'switchport access vlan <id>', 'Set VLAN when interface is in access mode', (cli, a) => {
  const v = +a[0];
  if (!/^\d+$/.test(a[0]) || v < 1 || v > 4094) return '% Invalid input detected: VLAN ID must be between 1 and 4094';
  let out = '';
  if (!cli.cfg.vlans[v]) { cli.cfg.vlans[v] = 'VLAN' + String(v).padStart(4, '0'); out = '% Access VLAN does not exist. Creating vlan ' + v; }
  IFC(cli).vlan = v; return out;
});
def(['if'], 'switchport port-security', 'Enable port security on the interface', cli => {
  IFC(cli).ps = true; return 'Port security enabled on ' + ifLong(cli.cur);
});
def(['if'], 'switchport port-security maximum <n>', 'Max secure addresses', (cli, a) => {
  const n = +a[0]; if (!/^\d+$/.test(a[0]) || n < 1 || n > 132) return '% Invalid input detected: maximum must be between 1 and 132';
  IFC(cli).max = n; return '';
});
def(['if'], 'switchport port-security mac-address sticky', 'Configure dynamic secure address as sticky', cli => {
  const c = IFC(cli);
  c.ps = true; c.sticky = true;
  const p = peer(cli.dev, cli.cur);
  if (p) { if (!c.macs.length) c.macs.push(DEVICES[p.dev].mac); return 'Sticky MAC learning enabled on ' + ifLong(cli.cur) + '\nLearned sticky MAC address: ' + c.macs[0]; }
  return 'Sticky MAC learning enabled on ' + ifLong(cli.cur) + '\nNo device attached: the MAC address will be learned when a device connects.';
});
def(['if'], 'switchport port-security violation shutdown', 'Shutdown port on violation', cli => { IFC(cli).viol = 'shutdown'; return ''; });
def(['if'], 'switchport port-security violation restrict', 'Restrict traffic on violation', cli => { IFC(cli).viol = 'restrict'; return ''; });
def(['if'], 'switchport port-security violation protect', 'Drop violating traffic silently', cli => { IFC(cli).viol = 'protect'; return ''; });
def(['if'], 'no switchport port-security', 'Disable port security on the interface', cli => {
  const c = IFC(cli); c.ps = false; c.sticky = false; c.macs = []; c.max = 1; c.viol = 'shutdown'; return '';
});
def(['if'], 'shutdown', 'Shutdown the selected interface', cli => { IFC(cli).shutdown = true; return '%LINK-5-CHANGED: Interface ' + ifLong(cli.cur) + ', changed state to administratively down'; });
def(['if'], 'no shutdown', 'Enable the selected interface', cli => {
  IFC(cli).shutdown = false;
  return '%LINK-5-CHANGED: Interface ' + ifLong(cli.cur) + ', changed state to ' + (peer(cli.dev, cli.cur) ? 'up' : 'down');
});
def(['if'], 'description <*text>', 'Interface specific description', (cli, a) => { IFC(cli).desc = a[0].slice(0, 40); return ''; });
def(['if'], 'no description', 'Remove the description', cli => { IFC(cli).desc = ''; return ''; });

/* ---------- Analyse d'une ligne ---------- */
function tokenize(line) {
  const out = [], re = /\S+/g; let m;
  while ((m = re.exec(line))) out.push({ t: m[0], i: m.index });
  return out;
}

const tkAt = (a, i) => {
  const t = a.c.toks;
  if (i < t.length) return t[i];
  const l = t[t.length - 1];
  return l && l.startsWith('<*') ? l : undefined;
};

/* Avance dans l'arbre des commandes ; renvoie les candidates vivantes ou une erreur */
function walk(mode, toks) {
  let alive = CMDS.filter(c => c.modes.includes(mode)).map(c => ({ c, args: [] }));
  for (let i = 0; i < toks.length; i++) {
    const w = toks[i].t.toLowerCase();
    let nx = alive.filter(a => { const p = tkAt(a, i); return p && (p[0] === '<' || p.startsWith(w)); });
    if (!nx.length) return { err: 'invalid', i, alive };
    const ex = nx.filter(a => tkAt(a, i) === w);
    if (ex.length) nx = ex;
    else {
      const lits = new Set(nx.filter(a => tkAt(a, i)[0] !== '<').map(a => tkAt(a, i)));
      if (lits.size > 1) return { err: 'ambig', i, alive };
      if (lits.size === 1) nx = nx.filter(a => tkAt(a, i)[0] !== '<');
    }
    nx.forEach(a => {
      const p = tkAt(a, i);
      if (p[0] === '<') {
        if (i >= a.c.toks.length) a.args[a.args.length - 1] += ' ' + toks[i].t;
        else a.args.push(toks[i].t);
      }
    });
    alive = nx;
  }
  return { alive };
}

class CLI {
  constructor(dev) {
    this.dev = dev; this.cfg = CFG[dev]; this.mode = 'user'; this.cur = null; this.curVlan = null;
    this.close = false; this.clear = false; this.history = []; this.hi = 0;
  }
  prompt() {
    const h = this.cfg.host;
    return { user: h + '>', priv: h + '#', config: h + '(config)#', if: h + '(config-if)#', vlan: h + '(config-vlan)#' }[this.mode];
  }
  banner() {
    return '--- NetCore Network Operating System Simulator v15.2 (NetCore Edition) ---\nConsole session opened. Type "?" if you need assistance.';
  }

  /* Exécute une ligne ; renvoie le texte à afficher */
  exec(line) {
    const raw = line;
    line = line.trim();
    if (!line) return '';
    if (this.history[this.history.length - 1] !== line) this.history.push(line);
    this.hi = this.history.length;
    if (/^(cls|clear)$/i.test(line)) { this.clear = true; return ''; }

    let toks = tokenize(raw);
    let mode = this.mode, off = 0;
    const plen = this.prompt().length;

    // « do » : exécuter une commande privilégiée depuis un mode de configuration
    if (['config', 'if', 'vlan'].includes(this.mode) && toks[0] && toks[0].t.toLowerCase() === 'do') {
      if (toks.length === 1) return '% Incomplete command.';
      mode = 'priv'; off = 1; toks = toks.slice(1);
    }
    const r = walk(mode, toks);
    const caret = i => ' '.repeat(plen + toks[i].i) + '^';
    if (r.err === 'invalid') return caret(r.i) + "\n% Invalid input detected at '^' marker.";
    if (r.err === 'ambig') return '% Ambiguous command:  "' + toks[r.i].t + '"';

    const done = r.alive.filter(a => {
      const n = a.c.toks.length, last = a.c.toks[n - 1];
      return n === toks.length || (last.startsWith('<*') && toks.length >= n);
    });
    if (!done.length) return '% Incomplete command.';
    const a = done[0];
    const saved = this.mode;
    if (off) this.mode = 'priv';
    const out = a.c.run(this, a.args);
    if (off) this.mode = saved;
    stickyRefresh();
    return out;
  }

  /* Aide contextuelle « ? » */
  help(line) {
    const endsSpace = /\s$/.test(line) || line === '';
    let toks = tokenize(line);
    let mode = this.mode;
    if (['config', 'if', 'vlan'].includes(mode) && toks[0] && toks[0].t.toLowerCase() === 'do') { mode = 'priv'; toks = toks.slice(1); }
    const partial = endsSpace ? '' : (toks.pop() || { t: '' }).t.toLowerCase();
    const r = walk(mode, toks);
    if (r.err) return '% Unrecognized command';
    const n = toks.length, seen = new Map();
    let cr = false;
    r.alive.forEach(a => {
      const p = tkAt(a, n);
      if (p === undefined) { if (!partial) cr = true; return; }
      if (p[0] === '<') { if (!partial) seen.set(p.replace('*', ''), a.c.help); }
      else if (p.startsWith(partial) && !seen.has(p)) seen.set(p, a.c.help);
      if (a.c.toks.length === n && !partial) cr = true;
    });
    if (!seen.size && !cr) return '% Unrecognized command';
    const rows = [...seen.entries()].map(([k, h]) => '  ' + padr(k, 16) + (partial ? '' : h));
    if (partial) return rows.map(s => s.trim()).join('  ');
    if (cr) rows.push('  ' + padr('<cr>', 16));
    return rows.join('\n');
  }

  /* Complétion avec Tab : renvoie la ligne complétée (ou la même) */
  complete(line) {
    if (/\s$/.test(line) || !line.trim()) return line;
    const toks = tokenize(line), last = toks.pop();
    const w = last.t.toLowerCase();
    const r = walk(this.mode, toks);
    if (r.err) return line;
    const n = toks.length;
    const c = [...new Set(r.alive.map(a => tkAt(a, n)).filter(p => p && p[0] !== '<' && p.startsWith(w)))];
    if (c.length !== 1) return line;
    return line.slice(0, last.i) + c[0] + ' ';
  }
}
