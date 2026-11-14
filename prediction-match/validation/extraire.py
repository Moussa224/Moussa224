"""Télécharge les événements de vrais matchs (données ouvertes StatsBomb) et les condense.

Sortie : donnees/matchs_condenses.json (buts, tirs, cartons rouges avec leur minute, fin des périodes).
Avec l'argument « recents » : donnees/recents_condenses.json (matchs de 2020 à 2024, pour le test hors période).
Les fichiers bruts ne sont pas conservés (3 à 4 Mo par match).

Données : StatsBomb Open Data, https://github.com/statsbomb/open-data (à citer en cas de publication).
"""
import json
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

DONNEES = Path(__file__).parent / 'donnees'
BASE = 'https://raw.githubusercontent.com/statsbomb/open-data/master/data'
# (id de la compétition, id de la saison, nom court) : saisons complètes de quatre grands championnats, 2015/16
SAISONS = [(2, 27, 'PL1516'), (11, 27, 'LL1516'), (12, 27, 'SA1516'), (7, 27, 'L11516')]
# Matchs récents (2020 à 2024), jamais utilisés pour régler le modèle : compétitions où seuls certains matchs sont publiés
RECENTS = [(55, 43, 'Euro2020'), (9, 281, 'BL2324'), (7, 108, 'L12122'), (7, 235, 'L12223'), (43, 106, 'CM2022'),
           (1267, 107, 'CAN2023'), (55, 282, 'Euro2024'), (223, 282, 'Copa2024'), (11, 90, 'LL2021'), (1238, 108, 'ISL2122'), (44, 107, 'MLS2023')]


def telecharger(url):
    for _ in range(3):
        r = subprocess.run(['curl', '-sS', '--compressed', '-m', '60', url], capture_output=True)
        if r.returncode == 0 and r.stdout[:1] in (b'[', b'{'):
            return json.loads(r.stdout)
    return None


def condenser(m, evts, nom):
    dom = m['home_team']['home_team_name']
    eq = lambda e: 'A' if e['team']['name'] == dom else 'B'
    buts, tirs, rouges, fins = [], [], [], {}
    for e in evts:
        p = e['period']
        if p > 2:  # prolongations et tirs au but exclus
            continue
        t = e['minute'] + e['second'] / 60
        genre = e['type']['name']
        if genre == 'Shot':
            s = e['shot']
            tirs.append({'p': p, 't': t, 'eq': eq(e), 'issue': s['outcome']['name'], 'xg': s.get('statsbomb_xg', 0) or 0})
            if s['outcome']['name'] == 'Goal':
                buts.append({'p': p, 't': t, 'eq': eq(e)})
        elif genre == 'Own Goal For':
            buts.append({'p': p, 't': t, 'eq': eq(e)})
        elif genre in ('Foul Committed', 'Bad Behaviour'):
            carte = (e.get('foul_committed') or e.get('bad_behaviour') or {}).get('card', {}).get('name')
            if carte in ('Red Card', 'Second Yellow'):
                rouges.append({'p': p, 't': t, 'eq': eq(e)})
        elif genre == 'Half End':
            fins[str(p)] = t
    # Score à la fin du temps réglementaire (les prolongations et tirs au but sont exclus plus haut)
    score = (sum(b['eq'] == 'A' for b in buts), sum(b['eq'] == 'B' for b in buts))
    return {'id': m['match_id'], 'saison': nom, 'A': dom, 'B': m['away_team']['away_team_name'],
            'score': score, 'score_officiel': (m['home_score'], m['away_score']), 'fins': fins, 'buts': buts, 'tirs': tirs, 'rouges': rouges}


def main():
    recents = len(sys.argv) > 1 and sys.argv[1] == 'recents'
    DONNEES.mkdir(exist_ok=True)
    sortie = []
    for cid, sid, nom in (RECENTS if recents else SAISONS):
        matchs = telecharger(f'{BASE}/matches/{cid}/{sid}.json')

        def tache(m):
            evts = telecharger(f"{BASE}/events/{m['match_id']}.json")
            return condenser(m, evts, nom) if evts else None

        with ThreadPoolExecutor(14) as pool:
            res = [r for r in pool.map(tache, matchs) if r]
        incoherents = sum(1 for r in res if tuple(r['score']) != tuple(r['score_officiel']))
        print(f'{nom}: {len(res)}/{len(matchs)} matchs, score réglementaire différent du score officiel (prolongations) : {incoherents}', file=sys.stderr)
        sortie += res
    (DONNEES / ('recents_condenses.json' if recents else 'matchs_condenses.json')).write_text(json.dumps(sortie))
    print(f'total : {len(sortie)} matchs', file=sys.stderr)


if __name__ == '__main__':
    main()
