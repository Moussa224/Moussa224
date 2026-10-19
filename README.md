# Moussa224
Moussa kourouma

## Jarvis

Jarvis est un assistant personnel en ligne de commande, en français, propulsé par Claude (`claude-opus-5-5`). Il répond en direct (streaming) et dispose d'outils locaux :

| Outil | Ce qu'il fait |
|---|---|
| `get_datetime` | date et heure actuelles (fuseau au choix) |
| `calculate` | calculatrice sûre (`sqrt`, `sin`, `log`, `**`, `pi`…) |
| `add_note`, `list_notes`, `delete_note` | notes durables, stockées dans `~/.jarvis/notes.json` |

### Installation

```bash
pip install -r requirements.txt
export ANTHROPIC_API_KEY="sk-ant-..."
```

### Utilisation

```bash
python -m jarvis                      # conversation interactive
python -m jarvis "Quelle heure est-il à Tokyo ?"   # une seule question
```

Dans la conversation : `/reset` oublie l'échange en cours, `/aide` rappelle les commandes, `/quitter` (ou Ctrl-D) ferme Jarvis.

Exemples :

- « Combien font 18 % de 2 450 ? »
- « Note que je dois appeler Awa demain. » puis « Qu'est-ce que j'ai noté ? »

`JARVIS_HOME` change le dossier de données (par défaut `~/.jarvis`).

### Ajouter un outil

Dans `jarvis/tools.py` : écrire la fonction (elle renvoie du texte ou lève `ToolError`), la déclarer dans `TOOLS` avec son schéma, et l'ajouter à `_HANDLERS`.

### Tests

```bash
python -m pytest
```

Les tests n'appellent pas l'API : l'agent est testé avec un faux client.
