/* Défi Subnetting : l'interface. Les calculs sont dans subnet.js. */
(function () {
  "use strict";

  const S = window.Subnet;
  const $ = (id) => document.getElementById(id);

  // ---------- Petits outils d'affichage (tout passe par textContent, jamais par innerHTML) ----------

  function el(tag, className, ...children) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    for (const child of children.flat()) if (child != null) node.append(child);
    return node;
  }

  const nombre = (n) => n.toLocaleString("fr-FR");
  const unit = (n, one, many) => `${n} ${n <= 1 ? one : many}`;
  const ordinal = (n) => (n === 1 ? "1er" : n + "e");
  const KIND = {
    network: { word: "réseau", article: "une adresse de réseau" },
    broadcast: { word: "broadcast", article: "une adresse de broadcast" },
    host: { word: "hôte", article: "une adresse d'hôte" },
  };

  // ---------- Les blocs de la réponse ----------

  function verdictCard(a) {
    const d = S.toDotted;
    const net = `${d(a.network)}/${a.prefix}`;
    let sentence;
    if (a.special === "single") sentence = [" est une adresse unique (/32) : un hôte à elle seule."];
    else if (a.special === "point-to-point") sentence = [" est une adresse d'un lien point à point (/31) : ", el("span", "mono", net), "."];
    else if (a.kind === "network") sentence = [" est l'adresse du réseau ", el("span", "mono", net), " elle-même."];
    else if (a.kind === "broadcast") sentence = [" est l'adresse de broadcast du réseau ", el("span", "mono", net), "."];
    else sentence = [" est une adresse d'hôte du réseau ", el("span", "mono", net), "."];

    return el("div", `verdict verdict--${a.kind}`,
      el("span", "pill", KIND[a.kind].word),
      el("p", "verdict__text", el("strong", "mono", d(a.ip)), sentence));
  }

  function facts(a) {
    const d = S.toDotted;
    const rows = [
      ["Masque", d(a.mask)],
      ["Réseau", `${d(a.network)}/${a.prefix}`],
      ["Broadcast", d(a.broadcast)],
      ["Première IP utilisable", d(a.first)],
      ["Dernière IP utilisable", d(a.last)],
      ["Hôtes utilisables", nombre(a.usable)],
      ["Adresses au total", nombre(a.total)],
      ["Masque inverse", d(a.wildcard)],
    ];
    if (a.block !== null) rows.push(["Saut", `${a.block} (${ordinal(a.cut + 1)} octet)`]);

    return el("dl", "facts", rows.map(([label, value]) =>
      el("div", "fact", el("dt", "fact__k", label), el("dd", "fact__v mono", value))));
  }

  /** Le panneau de la vidéo : bits de réseau / d'hôte, octet par octet. */
  function bitsPanel(a) {
    const p = a.prefix;
    const octets = S.maskBits(p);

    const bar = el("div", "bits__bar");
    if (p > 0) {
      const net = el("span", "seg seg--net", `${unit(p, "bit", "bits")} de réseau (uns)`);
      net.style.flexGrow = p;
      bar.append(net);
    }
    if (p < 32) {
      const host = el("span", "seg seg--host", `${unit(32 - p, "bit", "bits")} d'hôte (zéros)`);
      host.style.flexGrow = 32 - p;
      bar.append(host);
    }

    const columns = el("div", "bits__octets", octets.map((o) => {
      const cells = el("div", "cells", o.bits.map((bit) => el("span", `cell cell--${bit ? "one" : "zero"}`, String(bit))));
      const sub = o.role === "network" ? "Tout réseau" : o.role === "host" ? "Tout hôte" : `${o.weights.join("+")} = ${o.value}`;
      return el("div", `octet octet--${o.role}`,
        cells,
        el("div", "tile", el("span", "tile__big mono", String(o.value)), el("span", "tile__sub", `Octet ${o.index + 1}`)),
        el("div", "tile", el("span", "tile__big", unit(o.ones, "un", "uns")), el("span", "tile__sub", sub)));
    }));

    const sum = el("div", "bits__sum",
      el("span", "bits__sumline mono", `${octets.map((o) => o.ones).join(" + ")} = ${p}`, el("span", "bits__sumword", " bits de réseau")),
      el("span", "tile__sub", `Donc /${p} = ${S.toDotted(a.mask)}`));

    return el("section", "block bits", el("h2", "block__title", "Le masque en bits"), bar, columns, sum);
  }

  /** La méthode, écrite comme sur le tableau blanc de la vidéo. */
  function board(a) {
    const steps = S.explain(a);
    const head = el("div", "board__head",
      el("p", "m m--title", `${S.toDotted(a.ip)}/${a.prefix}`),
      el("p", "m m--ask", "Réseau, hôte ou broadcast ?"));

    const list = el("ol", "board__steps", steps.map((step) =>
      el("li", "step",
        el("div", "step__words",
          el("h3", "step__title", step.title),
          el("p", "step__text", step.text)),
        el("div", "step__ink", step.board.map((line) => el("p", `m m--${line.tone}`, line.text))))));

    return el("section", "block", el("h2", "block__title", "La méthode, au tableau"), el("div", "board", head, list));
  }

  function renderAnalysis(container, a, withVerdict) {
    // replaceChildren(null) écrirait le texte « null » : on n'envoie que les blocs voulus.
    const blocks = [facts(a), bitsPanel(a), board(a)];
    if (withVerdict) blocks.unshift(verdictCard(a));
    container.replaceChildren(...blocks);
  }

  // ---------- Calculateur ----------

  const input = $("cidr");
  const errorBox = $("cidr-error");
  const calcResult = $("calc-result");

  function updateCalculator() {
    const r = S.parse(input.value);
    errorBox.textContent = r.ok || r.empty ? "" : r.error;
    input.setAttribute("aria-invalid", r.ok || r.empty ? "false" : "true");

    if (r.ok) renderAnalysis(calcResult, S.analyze(r.ip, r.prefix), true);
    else if (r.empty) calcResult.replaceChildren(el("p", "hint", "Saisissez une adresse IP et un préfixe pour voir le calcul."));
    else calcResult.replaceChildren();
  }

  input.addEventListener("input", updateCalculator);
  $("finder").addEventListener("submit", (event) => event.preventDefault());
  document.querySelectorAll("[data-example]").forEach((button) => {
    button.addEventListener("click", () => {
      input.value = button.dataset.example;
      updateCalculator();
    });
  });

  // ---------- Défi ----------

  const STORE_KEY = "defi-subnetting";
  const challengeIp = $("defi-ip");
  const choices = Array.from(document.querySelectorAll("[data-answer]"));
  const after = $("defi-after");
  const feedback = $("defi-feedback");
  const reveal = $("defi-reveal");
  const solution = $("defi-solution");
  const scoreLine = $("defi-score");
  const ask = $("defi-ask");

  let challenge = null; // { analysis, answered }
  let score = loadScore();

  function loadScore() {
    const fresh = { played: 0, won: 0, streak: 0, best: 0 };
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY));
      if (saved && [saved.played, saved.won, saved.streak, saved.best].every(Number.isFinite)) return saved;
    } catch (error) { /* stockage indisponible : on joue sans mémoire */ }
    return fresh;
  }

  function saveScore() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(score)); } catch (error) { /* idem */ }
  }

  function showScore() {
    scoreLine.textContent = score.played === 0
      ? "Premier défi : à vous de jouer."
      : `Série ${score.streak} · Record ${score.best} · ${score.won}/${score.played} réussis`;
  }

  function startChallenge(useVideoExample) {
    const c = useVideoExample ? { ip: S.parseDotted("172.20.95.191"), prefix: 19 } : S.randomChallenge();
    const analysis = S.analyze(c.ip, c.prefix);
    challenge = { analysis, answered: false };

    challengeIp.textContent = `${S.toDotted(analysis.ip)}/${analysis.prefix}`;
    choices.forEach((button) => { button.disabled = false; delete button.dataset.state; });
    ask.hidden = false;
    reveal.hidden = false;
    after.hidden = true;
    solution.replaceChildren();
    showScore();
  }

  function answer(given) {
    if (!challenge || challenge.answered) return;
    challenge.answered = true;
    const a = challenge.analysis;
    const correct = given === a.kind;

    // « Voir la solution » ne compte pas : seul un vrai choix fait avancer le score.
    if (given !== null) {
      score.played += 1;
      if (correct) {
        score.won += 1;
        score.streak += 1;
        score.best = Math.max(score.best, score.streak);
      } else {
        score.streak = 0;
      }
      saveScore();
      showScore();
    }

    choices.forEach((button) => {
      button.disabled = true;
      if (button.dataset.answer === a.kind) button.dataset.state = "correct";
      else if (button.dataset.answer === given) button.dataset.state = "wrong";
    });

    const ip = S.toDotted(a.ip);
    if (given === null) feedback.textContent = `Voici la solution : ${ip} est ${KIND[a.kind].article}.`;
    else if (correct) feedback.textContent = `Bravo ! ${ip} est bien ${KIND[a.kind].article}.`;
    else feedback.textContent = `Pas tout à fait : ${ip} est ${KIND[a.kind].article}, pas ${KIND[given].article}.`;
    feedback.dataset.state = given === null ? "reveal" : correct ? "correct" : "wrong";

    ask.hidden = true;
    reveal.hidden = true;
    after.hidden = false;
    renderAnalysis(solution, a, false);
  }

  choices.forEach((button) => button.addEventListener("click", () => answer(button.dataset.answer)));
  reveal.addEventListener("click", () => answer(null));
  $("defi-next").addEventListener("click", () => {
    startChallenge(false);
    challengeIp.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  });

  // ---------- Sections ----------

  const sections = { calculateur: $("calculateur"), defi: $("defi") };
  const tabs = { calculateur: $("tab-calculateur"), defi: $("tab-defi") };

  function showSection() {
    const name = location.hash === "#defi" ? "defi" : "calculateur";
    for (const key of Object.keys(sections)) {
      sections[key].hidden = key !== name;
      if (key === name) tabs[key].setAttribute("aria-current", "page");
      else tabs[key].removeAttribute("aria-current");
    }
  }

  window.addEventListener("hashchange", showSection);

  // ---------- Démarrage : l'exemple de la vidéo est déjà chargé, des deux côtés ----------

  updateCalculator();
  startChallenge(true);
  showSection();
})();
