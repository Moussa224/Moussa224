import { QUIZ, CATS } from '../content/quiz.js';
import { store } from '../core/store.js';
import { sfx } from '../core/audio.js';
import { esc, vibrate, toast } from '../core/dom.js';
import { icon } from '../core/icons.js';

const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export default {
  title: 'Quiz',
  mount(el) {
    el.innerHTML = `<div class="page-head"><div class="eyebrow">Testez vos connaissances</div><h1>Quiz islamique <span class="ar" lang="ar">اختبار</span></h1><p>Dix questions tirées au hasard, avec une explication après chaque réponse.</p></div><div id="box"></div>`;
    const box = el.querySelector('#box');
    let round = [], i = 0, score = 0, answered = false, cat = 'all';

    function home() {
      const s = store.get('quiz');
      box.innerHTML = `
        <div class="card tilt" style="text-align:center;padding:30px 18px">
          <div style="font-size:3rem">🏆</div>
          <div class="bignum" style="color:var(--gold)">${s.best}/10</div><div class="muted">meilleur score · ${s.played} partie${s.played > 1 ? 's' : ''} jouée${s.played > 1 ? 's' : ''}</div>
          <div class="chips" style="justify-content:center;margin:18px 0" id="cats"><button class="chip on" data-c="all">Tout</button>${Object.entries(CATS).map(([k, v]) => `<button class="chip" data-c="${k}">${v}</button>`).join('')}</div>
          <button class="btn gold" id="go" style="padding:14px 34px;font-size:1.1rem">${icon('play')} Commencer</button>
        </div>`;
      box.querySelector('#cats').onclick = (e) => { const b = e.target.closest('[data-c]'); if (!b) return; cat = b.dataset.c; box.querySelectorAll('#cats .chip').forEach((x) => x.classList.toggle('on', x === b)); };
      box.querySelector('#go').onclick = start;
    }
    function start() {
      const pool = QUIZ.filter((q) => cat === 'all' || q.c === cat);
      round = shuffle(pool).slice(0, 10); i = 0; score = 0; ask();
    }
    function ask() {
      answered = false; const q = round[i]; const opts = shuffle(q.o);
      box.innerHTML = `
        <div class="card" style="animation:pageIn .5s both">
          <div class="row spread"><span class="eyebrow">${CATS[q.c]}</span><span class="muted">Question ${i + 1}/${round.length} · ${score} pt${score > 1 ? 's' : ''}</span></div>
          <div class="progress" style="margin:10px 0 18px"><i style="width:${(i / round.length) * 100}%"></i></div>
          <h3 style="font-size:1.7rem;margin-bottom:12px">${esc(q.q)}</h3>
          <div id="opts">${opts.map((o) => `<button class="quiz-opt" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>
          <div id="fb"></div></div>`;
      box.querySelector('#opts').onclick = (e) => {
        const b = e.target.closest('.quiz-opt'); if (!b || answered) return; answered = true;
        const ok = b.dataset.o === q.a;
        box.querySelectorAll('.quiz-opt').forEach((x) => { x.disabled = true; if (x.dataset.o === q.a) x.classList.add('ok'); });
        if (ok) { score++; sfx.ok(); vibrate(15); } else { b.classList.add('ko'); sfx.ko(); vibrate([20, 40, 20]); }
        box.querySelector('#fb').innerHTML = `<p class="note" style="margin-top:16px"><b style="color:${ok ? 'var(--em)' : 'var(--rose)'}">${ok ? 'Bonne réponse !' : 'Pas tout à fait.'}</b> ${esc(q.e)}</p><div style="text-align:right"><button class="btn gold" id="nx">${i + 1 < round.length ? 'Suivant' : 'Voir mon score'} ${icon('next')}</button></div>`;
        box.querySelector('#nx').onclick = () => { i++; i < round.length ? ask() : end(); };
      };
    }
    function end() {
      const s = store.get('quiz'); const best = Math.max(s.best, score);
      store.set('quiz', { best, played: s.played + 1 });
      const msg = score >= 9 ? 'Mâ châ Allah, excellent !' : score >= 6 ? 'Très bien, continuez ainsi.' : 'Bon début : revoyez les récits et réessayez.';
      box.innerHTML = `<div class="card tilt" style="text-align:center;padding:30px 18px"><div style="font-size:3rem">${score >= 9 ? '🌟' : score >= 6 ? '👏' : '📚'}</div><div class="bignum" style="color:var(--gold)">${score}/${round.length}</div><p style="font-family:var(--serif);font-size:1.4rem">${msg}</p>${score > s.best ? '<p style="color:var(--em)">Nouveau meilleur score !</p>' : ''}<div class="row" style="justify-content:center;margin-top:12px"><button class="btn gold" id="again">${icon('refresh')} Rejouer</button><a class="btn" href="#/prophetes">Lire les récits</a></div></div>`;
      box.querySelector('#again').onclick = start; sfx.milestone();
    }
    home();
  },
};
