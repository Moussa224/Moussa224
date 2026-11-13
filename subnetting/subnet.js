/*
 * Logique du subnetting : fonctions pures, sans DOM.
 * Chargée par la page (window.Subnet) et par les tests (Node, require).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Subnet = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ---------- Outils de base : une adresse IPv4 est un entier de 32 bits non signé ----------

  const u32 = (n) => n >>> 0;

  function maskFromPrefix(prefix) {
    // En JavaScript, x << 32 vaut x << 0 : le préfixe 0 demande un cas à part.
    return prefix === 0 ? 0 : u32(0xffffffff << (32 - prefix));
  }

  /** Préfixe d'un masque (ex. 255.255.224.0 → 19), ou null si ses uns ne se suivent pas. */
  function prefixFromMask(mask) {
    mask = u32(mask);
    let prefix = 0;
    while (prefix < 32 && (mask & (0x80000000 >>> prefix)) !== 0) prefix++;
    return maskFromPrefix(prefix) === mask ? prefix : null;
  }

  function octets(n) {
    n = u32(n);
    return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  }

  function fromOctets(o) {
    return u32((o[0] << 24) | (o[1] << 16) | (o[2] << 8) | o[3]);
  }

  const toDotted = (n) => octets(n).join(".");

  /** "172.20.95.191" → entier, ou null si ce n'est pas une adresse valide. */
  function parseDotted(text) {
    const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(String(text).trim());
    if (!m) return null;
    const o = m.slice(1).map(Number);
    return o.some((x) => x > 255) ? null : fromOctets(o);
  }

  /**
   * Lit « 172.20.95.191/19 », « 172.20.95.191 /19 » ou « 172.20.95.191 255.255.224.0 ».
   * Rend { ok: true, ip, prefix } ou { ok: false, empty } ou { ok: false, error }.
   */
  function parse(text) {
    const raw = String(text == null ? "" : text).trim();
    if (raw === "") return { ok: false, empty: true };

    const m = /^([\d.]+)\s*(?:\/|\s)\s*([\d.]+)$/.exec(raw);
    if (!m) return { ok: false, error: "Écrivez l'adresse suivie du préfixe, par exemple 172.20.95.191/19." };

    const ip = parseDotted(m[1]);
    if (ip === null) {
      return { ok: false, error: "Adresse IP invalide : il faut quatre nombres de 0 à 255 séparés par des points." };
    }

    let prefix;
    if (m[2].includes(".")) {
      const mask = parseDotted(m[2]);
      if (mask === null) return { ok: false, error: "Masque invalide, par exemple 255.255.224.0." };
      prefix = prefixFromMask(mask);
      if (prefix === null) {
        return { ok: false, error: "Ce masque est impossible : ses bits à 1 doivent se suivre, comme dans 255.255.224.0." };
      }
    } else {
      prefix = Number(m[2]);
      if (!/^\d{1,2}$/.test(m[2]) || prefix > 32) {
        return { ok: false, error: "Le préfixe doit être un nombre de 0 à 32." };
      }
    }
    return { ok: true, ip, prefix };
  }

  // ---------- Calcul ----------

  /** Tout ce qu'il faut savoir sur une adresse et son préfixe. */
  function analyze(ip, prefix) {
    ip = u32(ip);
    const mask = maskFromPrefix(prefix);
    const wildcard = u32(~mask);
    const network = u32(ip & mask);
    const broadcast = u32(network | wildcard);
    const hostBits = 32 - prefix;
    const total = Math.pow(2, hostBits);

    let usable, first, last, kind, special = null;
    if (prefix === 32) {
      special = "single";
      usable = 1;
      first = last = ip;
      kind = "host";
    } else if (prefix === 31) {
      special = "point-to-point"; // RFC 3021 : les deux adresses servent
      usable = 2;
      first = network;
      last = broadcast;
      kind = "host";
    } else {
      usable = total - 2;
      first = network + 1;
      last = broadcast - 1;
      kind = ip === network ? "network" : ip === broadcast ? "broadcast" : "host";
    }

    const maskOctets = octets(mask);
    // Octet « coupé » par le masque (0 à 3), s'il y en a un : celui où le masque n'est ni 255 ni 0.
    const cut = prefix % 8 === 0 ? null : Math.floor(prefix / 8);
    const block = cut === null ? null : 256 - maskOctets[cut];

    return {
      ip, prefix, mask, wildcard, network, broadcast, first, last,
      total, usable, hostBits, kind, special, cut, block,
      ipOctets: octets(ip), maskOctets, networkOctets: octets(network), broadcastOctets: octets(broadcast),
    };
  }

  /** Le masque, octet par octet, en bits : de quoi dessiner le panneau « bits de réseau / bits d'hôte ». */
  function maskBits(prefix) {
    return octets(maskFromPrefix(prefix)).map((value, index) => {
      const bits = [];
      for (let b = 7; b >= 0; b--) bits.push((value >> b) & 1);
      const weights = bits.map((bit, j) => (bit ? 128 >> j : 0)).filter(Boolean);
      const ones = weights.length;
      return { index, value, bits, weights, ones, role: ones === 8 ? "network" : ones === 0 ? "host" : "mixed" };
    });
  }

  // ---------- La méthode du tableau, pas à pas ----------

  const ordinal = (n) => (n === 1 ? "1er" : n + "e");
  const nombre = (n) => n.toLocaleString("fr-FR");
  const ink = (text, tone) => ({ text, tone: tone || "ink" });

  /**
   * Les étapes que l'on écrirait au tableau. Chaque étape : { id, title, text, board: [{ text, tone }] }.
   * Les tons : ink (noir), red (rouge), green (vert), muted (gris).
   */
  function explain(a) {
    const d = toDotted;
    const ip = d(a.ip), mask = d(a.mask), net = d(a.network), bc = d(a.broadcast);
    const p = a.prefix;
    const kindWord = { network: "réseau", broadcast: "broadcast", host: "hôte" }[a.kind];
    const steps = [];

    const sum = maskBits(p).map((o) => o.ones).join(" + ");
    steps.push({
      id: "masque",
      title: "Le masque",
      text: `/${p} veut dire ${p} bits à 1 au début du masque : ${sum} = ${p}. En décimal, le masque est ${mask}.`,
      board: [ink(`/${p} → ${mask}`)],
    });

    // /32 : une seule adresse, rien d'autre à calculer.
    if (a.special === "single") {
      steps.push({
        id: "verdict",
        title: "Réseau, hôte ou broadcast ?",
        text: `Un /32 désigne une seule adresse : il n'y a ni réseau ni broadcast à part. ${ip} est un hôte unique.`,
        board: [ink(`${ip} → HÔTE`, "green")],
      });
      return steps;
    }

    if (a.cut === null) {
      // Le masque s'arrête pile à la fin d'un octet (/0, /8, /16, /24) : pas de saut à calculer.
      const n = p / 8;
      const kept = a.ipOctets.slice(0, n).join(".");
      steps.push({
        id: "reseau",
        title: "Le réseau",
        text: n === 0
          ? `Aucun bit n'est réservé au réseau : tous les octets sont à 0, soit ${net}.`
          : `Le masque s'arrête pile à la fin du ${ordinal(n)} octet. On garde les ${n} premiers octets de l'adresse (${kept}) et on met les autres à 0 : ${net}.`,
        board: [ink(`${net} (RÉSEAU)`, "red")],
      });
      steps.push({
        id: "broadcast",
        title: "Le broadcast",
        text: n === 0
          ? `Tous les octets passent à 255 : ${bc}.`
          : `On garde les mêmes ${n} octets et on met les autres à 255 : ${bc}.`,
        board: [ink(`${bc} (broadcast)`, "red")],
      });
    } else {
      // Cas général : un octet est coupé par le masque, on compte par sauts.
      const k = a.cut;
      const octet = ordinal(k + 1);
      const maskValue = a.maskOctets[k];
      const value = a.ipOctets[k];
      const block = a.block;
      const index = Math.floor(value / block);
      const low = index * block;
      const next = low + block;
      const head = a.ipOctets.slice(0, k);
      const line = (v) => head.concat([v], [0, 0, 0].slice(0, 3 - k)).join(".");

      steps.push({
        id: "saut",
        title: "Le saut",
        text: `Seul le ${octet} octet est « coupé » par le masque (${maskValue}). Le saut, c'est ce qu'il manque pour arriver à 256.`,
        board: [ink(`256 − ${maskValue} = ${block}`)],
      });

      // Les réseaux de saut en saut : les deux premiers, puis ceux autour de l'adresse.
      const count = 256 / block;
      const shown = [...new Set([0, 1, index - 1, index, index + 1])].filter((i) => i >= 0 && i < count).sort((x, y) => x - y);
      const board = [];
      shown.forEach((i, pos) => {
        if (pos > 0 && i > shown[pos - 1] + 1) board.push(ink("⋮", "muted"));
        board.push(i === index ? ink(`${line(i * block)} (RÉSEAU)`, "red") : ink(line(i * block)));
      });
      steps.push({
        id: "reseaux",
        title: `Les réseaux, de ${block} en ${block}`,
        text: `On avance de ${block} en ${block} sur le ${octet} octet. ${value} tombe entre ${low} et ${next - 1} : le réseau de l'adresse commence donc à ${net}.`,
        board,
      });

      const nextLabel = next < 256 ? `le réseau suivant (${line(next)})` : `la fin de l'octet (${low} + ${block} = 256)`;
      const trailing = k < 3 ? ` et les octets suivants passent à 255` : "";
      steps.push({
        id: "broadcast",
        title: a.special === "point-to-point" ? "La dernière adresse" : "Le broadcast",
        text: `C'est la dernière adresse du réseau, juste avant ${nextLabel}. On retire 1 : ${next} − 1 = ${next - 1}${trailing}, soit ${bc}.`,
        board: [ink(`${bc} (broadcast)`, "red")],
      });
    }

    // Verdict
    let verdict;
    if (a.special === "point-to-point") {
      verdict = `Un /31 (RFC 3021) relie deux équipements : ${net} et ${bc} sont toutes les deux utilisables, il n'y a pas de broadcast. ${ip} est donc une adresse d'hôte.`;
    } else if (a.kind === "network") {
      verdict = `${ip} est exactement l'adresse du réseau (${net}). Elle nomme le réseau, on ne l'attribue pas à un appareil.`;
    } else if (a.kind === "broadcast") {
      verdict = `${ip} est exactement le broadcast (${bc}). Elle s'adresse à tout le réseau, on ne l'attribue pas à un appareil.`;
    } else {
      verdict = `${ip} n'est ni ${net} (réseau) ni ${bc} (broadcast) : elle se situe entre les deux, c'est une adresse d'hôte.`;
    }
    steps.push({
      id: "verdict",
      title: "Réseau, hôte ou broadcast ?",
      text: verdict,
      board: [ink(`${ip} → ${kindWord.toUpperCase()}`, a.kind === "host" ? "green" : "red")],
    });

    // Adresses utilisables
    steps.push({
      id: "plage",
      title: "Les adresses utilisables",
      text: a.special === "point-to-point"
        ? "Les 2 adresses du bloc sont utilisables."
        : `On enlève le réseau et le broadcast : il reste ${nombre(a.usable)} adresses pour des appareils (2^${a.hostBits} − 2).`,
      board: [ink("IP utilisables :", "muted"), ink(d(a.first), "green"), ink(`à ${d(a.last)}`, "green")],
    });

    return steps;
  }

  // ---------- Défis ----------

  /**
   * Un défi au hasard : une adresse privée, un préfixe qui coupe un octet, et une réponse attendue
   * (réseau, hôte ou broadcast) tirée à parts égales. rng rend un nombre dans [0, 1[.
   */
  function randomChallenge(rng) {
    rng = rng || Math.random;
    const int = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
    const pick = (list) => list[int(0, list.length - 1)];

    const base = pick([
      { head: () => [10, int(0, 255)], min: 9 },
      { head: () => [172, int(16, 31)], min: 13 },
      { head: () => [192, 168], min: 17 },
    ]);
    // Les préfixes /16 et /24 tombent pile sur un octet : trop faciles pour un défi.
    let prefix;
    do prefix = int(base.min, 30); while (prefix % 8 === 0);

    const head = base.head();
    const seed = fromOctets(head.concat([int(0, 255), int(0, 255)]).slice(0, 4));
    const network = u32(seed & maskFromPrefix(prefix));
    const size = Math.pow(2, 32 - prefix);

    const kind = pick(["network", "host", "broadcast"]);
    let ip;
    if (kind === "network") ip = network;
    else if (kind === "broadcast") ip = network + size - 1;
    else ip = network + int(1, size - 2);

    return { ip, prefix, kind };
  }

  return { maskFromPrefix, prefixFromMask, octets, fromOctets, toDotted, parseDotted, parse, analyze, maskBits, explain, randomChallenge };
});
