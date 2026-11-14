"""Mesure, sur de vrais matchs, les effets utilisés par modele.js.

1. Force de chaque équipe, estimée SANS le match prédit (10 plis) : sert d'avant-match.
2. Régression de Poisson sur toutes les minutes de tous les matchs : effet du moment, du score, des
   cartons rouges ; puis effet des tirs sur les buts à venir.
3. Réglages appris sur toutes les données, et sur chaque moitié (pour le test croisé de evaluer.js).

Sorties : donnees/priors_oof.json et donnees/params_glm.json. Lancer d'abord extraire.py.
"""
import bisect
import json
from pathlib import Path

import numpy as np

DONNEES = Path(__file__).parent / 'donnees'
D = json.loads((DONNEES / 'matchs_condenses.json').read_text())
SAISON = {m['id']: m['saison'] for m in D}
CADRE = ('Goal', 'Saved', 'Saved to Post')
POIDS_TIR, CONFIANCE = 0.105, 4.5  # les valeurs retenues dans modele.js (voir la comparaison plus bas)


# ------------------------------------------------------------------ 1. force des équipes hors échantillon
def ajuster_equipes(matchs, k):
    """Attaque / défense multiplicatives avec retour vers la moyenne (k buts d'avant-match)."""
    equipes = sorted({m['A'] for m in matchs} | {m['B'] for m in matchs})
    ix = {e: i for i, e in enumerate(equipes)}
    n = len(equipes)
    A = np.array([ix[m['A']] for m in matchs]); B = np.array([ix[m['B']] for m in matchs])
    gh = np.array([m['score'][0] for m in matchs], float); ga = np.array([m['score'][1] for m in matchs], float)
    att = np.ones(n); dfn = np.ones(n); yh, ya = gh.mean(), ga.mean()
    for _ in range(200):
        att = (np.bincount(A, gh, n) + np.bincount(B, ga, n) + k) / (np.bincount(A, yh * dfn[B], n) + np.bincount(B, ya * dfn[A], n) + k)
        dfn = (np.bincount(B, gh, n) + np.bincount(A, ga, n) + k) / (np.bincount(B, yh * att[A], n) + np.bincount(A, ya * att[B], n) + k)
        att /= att.mean()
        yh = gh.sum() / (att[A] * dfn[B]).sum(); ya = ga.sum() / (att[B] * dfn[A]).sum()
    return ix, att, dfn, yh, ya


def priors_hors_echantillon(k=15, plis=10, graine=1):
    rng = np.random.default_rng(graine)
    sortie = {}
    for lg in sorted(set(SAISON.values())):
        ms = [m for m in D if m['saison'] == lg]
        pli = rng.permutation(len(ms)) % plis
        for f in range(plis):
            ix, att, dfn, yh, ya = ajuster_equipes([m for m, p in zip(ms, pli) if p != f], k)
            for m, p in zip(ms, pli):
                if p == f:
                    i, j = ix[m['A']], ix[m['B']]
                    sortie[m['id']] = (yh * att[i] * dfn[j], ya * att[j] * dfn[i])
    return sortie


# ------------------------------------------------------------------ 2. une ligne par équipe et intervalle de jeu
def lignes(m, prior):
    f1, f2 = m['fins']['1'], m['fins']['2']
    bins = [(1, k, k + 1) for k in range(45)] + [(1, 45, f1)] + [(2, 45 + k, 46 + k) for k in range(45)] + [(2, 90, f2)]
    evts = sorted([(b['p'], b['t'], 'but', b['eq']) for b in m['buts']] + [(r['p'], r['t'], 'rouge', r['eq']) for r in m['rouges']])
    out = []
    for (p, t0, t1) in bins:
        if t1 <= t0:
            continue
        sc, rg, buts = {'A': 0, 'B': 0}, {'A': 0, 'B': 0}, {'A': 0, 'B': 0}
        for (pe, te, ty, eq) in evts:
            dans = pe == p and (t0 <= te < t1 or (t1 == f1 and p == 1 and t0 == 45 and te >= t0) or (p == 2 and t0 == 90 and te >= t0))
            if (pe, te) < (p, t0) and not dans:
                (sc if ty == 'but' else rg)[eq] += 1
            elif dans and ty == 'but':
                buts[eq] += 1
        for eq, lam in (('A', prior[0]), ('B', prior[1])):
            o = 'B' if eq == 'A' else 'A'
            out.append(dict(y=buts[eq], dur=t1 - t0, tm=(t0 + t1) / 2, diff=sc[eq] - sc[o], rd=rg[eq] - rg[o], lam=lam, eq=eq, mid=m['id'], t0=t0, p=p))
    return out


def poisson_glm(X, y, off, iters=60):
    b = np.zeros(X.shape[1])
    for _ in range(iters):
        eta = X @ b + off; mu = np.exp(eta)
        XtW = X.T * mu
        bn = np.linalg.solve(XtW @ X, XtW @ (eta - off + (y - mu) / mu))
        done = np.max(np.abs(bn - b)) < 1e-9
        b = bn
        if done:
            break
    mu = np.exp(X @ b + off)
    return b, np.sqrt(np.diag(np.linalg.inv((X.T * mu) @ X))), float(np.sum(y * (X @ b + off) - mu))


def main():
    priors = priors_hors_echantillon()
    (DONNEES / 'priors_oof.json').write_text(json.dumps({str(k): v for k, v in priors.items()}))
    rows = [r for m in D for r in lignes(m, priors[m['id']])]
    y = np.array([r['y'] for r in rows], float); dur = np.array([r['dur'] for r in rows]); lam = np.array([r['lam'] for r in rows])
    diff = np.array([r['diff'] for r in rows]); rd = np.array([r['rd'] for r in rows])
    z = np.array([min(r['tm'], 90) / 90 - 0.5 for r in rows])
    sais = np.array([SAISON[r['mid']] for r in rows])
    print(f'{len(D)} matchs, {len(rows)} lignes, {int(y.sum())} buts')

    def colonnes(extra=None):
        cols = [np.ones(len(rows)), (diff == 1) * 1.0, (diff >= 2) * 1.0, (diff == -1) * 1.0, (diff <= -2) * 1.0, (rd > 0) * 1.0, (rd < 0) * 1.0]
        noms = ['const', 'mène 1', 'mène 2+', 'mené 1', 'mené 2+', 'équipe à 10', 'adversaire à 10']
        if extra is not None:
            cols.append(extra); noms.append('tirs')
        return np.column_stack(cols), noms

    # cumuls de tirs et de buts avant chaque intervalle
    tirs = {}
    for m in D:
        for eq in 'AB':
            T = sorted((s['p'], s['t'], s['issue'] in CADRE) for s in m['tirs'] if s['eq'] == eq)
            tirs[(m['id'], eq)] = ([(p, t) for p, t, _ in T], np.cumsum([c for _, _, c in T]), np.cumsum([not c for _, _, c in T]),
                                   sorted((b['p'], b['t']) for b in m['buts'] if b['eq'] == eq))
    cad, oth, bts = (np.zeros(len(rows)) for _ in range(3))
    for i, r in enumerate(rows):
        cles, c_cad, c_oth, buts = tirs[(r['mid'], r['eq'])]
        j = bisect.bisect_left(cles, (r['p'], r['t0']))
        cad[i] = c_cad[j - 1] if j else 0; oth[i] = c_oth[j - 1] if j else 0
        bts[i] = bisect.bisect_left(buts, (r['p'], r['t0']))

    def ajuster(masque, imprimer=None):
        meilleur = None
        for c in np.arange(0.10, 0.62, 0.04):  # pente du temps : intensité 1 + c × (minute/90 − 0,5)
            X, _ = colonnes()
            off = np.log(dur) + np.log(lam / 94.0) + np.log(1 + c * z)
            b, se, ll = poisson_glm(X[masque], y[masque], off[masque])
            if meilleur is None or ll > meilleur[0]:
                meilleur = (ll, c, b, off)
        ll, c, b, off = meilleur
        X, _ = colonnes()
        mu = np.exp(X @ b + off)
        e = np.zeros(len(rows)); acc = {}
        for i, r in enumerate(rows):
            kk = (r['mid'], r['eq']); e[i] = acc.get(kk, 0.0); acc[kk] = e[i] + mu[i]
        resultats = {}
        for nom, x in (('retenu : 0,105 par tir, cadré ou non', POIDS_TIR * (np.maximum(cad, bts) + oth)),
                       ('ancien : 0,30 par tir cadré, 0,03 par autre tir', 0.30 * np.maximum(cad, bts) + 0.03 * oth),
                       ('buts seulement', bts.astype(float))):
            Xs, noms = colonnes(np.log((CONFIANCE + x) / (CONFIANCE + e)))
            bs, ses, lls = poisson_glm(Xs[masque], y[masque], off[masque])
            resultats[nom] = (lls - ll, bs[-1], ses[-1])
        Xs, noms = colonnes(np.log((CONFIANCE + POIDS_TIR * (np.maximum(cad, bts) + oth)) / (CONFIANCE + e)))
        bs, ses, lls = poisson_glm(Xs[masque], y[masque], off[masque])
        if imprimer:
            print(f'\n== {imprimer} : pente du temps c = {c:.2f} ==')
            for n, cf, s in zip(noms, bs, ses):
                print(f'  {n:16s} coef {cf:+.3f} ± {s:.3f}   multiplicateur {np.exp(cf):.3f}')
            print('  Poids des tirs (gain de log-vraisemblance, pente de contrôle ± erreur ; la pente doit valoir 1) :')
            for n, (g, s1, s2) in resultats.items():
                print(f'    {n:50s} {g:+6.1f}   pente {s1:.2f} ± {s2:.2f}')
        return dict(c=float(c), noms=noms, coef=[float(v) for v in bs], se=[float(v) for v in ses])

    res = {}
    res['toutes'] = ajuster(np.ones(len(rows), bool), 'Toutes les données')
    res['PLLL'] = ajuster(np.isin(sais, ['PL1516', 'LL1516']), 'Premier League + Liga')
    res['SAL1'] = ajuster(np.isin(sais, ['SA1516', 'L11516']), 'Serie A + Ligue 1')
    (DONNEES / 'params_glm.json').write_text(json.dumps(res, indent=1))


if __name__ == '__main__':
    main()
