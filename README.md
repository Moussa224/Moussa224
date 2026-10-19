# Moussa224
Moussa kourouma

## Jarvis

Jarvis est un assistant personnel en ligne de commande, en français, propulsé par Claude (`claude-opus-5-5`). Il répond en direct, cherche sur le web, retient ce que vous lui dites et peut agir sur votre ordinateur, **toujours avec votre accord** pour ce qui est sensible.

### Ce qu'il sait faire

| Capacité | Détail |
|---|---|
| **Web** | recherche et lecture de pages (outils web d'Anthropic) pour l'actualité et les faits récents |
| **Date et heure** | lues sur l'ordinateur, dans n'importe quel fuseau |
| **Calculs** | calculatrice sûre (`sqrt`, `sin`, `log`, `**`, `pi`…), jamais de `eval` |
| **Notes** | `add_note`, `list_notes`, `delete_note` : ce que vous voulez retrouver |
| **Mémoire** | `remember`, `forget` : ce qu'il doit savoir de vous (préférences, contexte). Rechargée à chaque démarrage |
| **Fichiers** | `list_directory`, `read_file`, `write_file` |
| **Commandes** | `run_command` : exécute une commande shell et lit sa sortie |
| **Voix** | `--voix` lit les réponses à voix haute (`say` sur macOS, `espeak-ng`/`espeak`/`spd-say` sur Linux) |

### Installation

```bash
pip install -r requirements.txt
export ANTHROPIC_API_KEY="sk-ant-..."
```

La recherche web doit être activée pour votre organisation dans la Console Anthropic. Sinon, Jarvis le détecte, prévient, et continue sans (ou utilisez `--sans-web`).

### Utilisation

```bash
python -m jarvis                                   # conversation interactive
python -m jarvis "Quelle heure est-il à Tokyo ?"   # une seule question
python -m jarvis --voix                            # avec réponse vocale
python -m jarvis --modele claude-sonnet-5-5        # modèle plus économique
python -m jarvis --sans-web                        # sans accès au web
```

Dans la conversation : `/reset` oublie l'échange en cours, `/aide` rappelle les commandes, `/quitter` (ou Ctrl-D) ferme Jarvis. Ctrl-C interrompt une réponse.

Exemples :

- « Quelles sont les dernières nouvelles sur l'Euro de football ? »
- « Combien font 18 % de 2 450 ? »
- « Retiens que je préfère être tutoyé. » (valable dès la prochaine session)
- « Note que je dois appeler Awa demain. »
- « Résume le fichier README.md de ce dossier. »
- « Combien d'espace libre me reste-t-il sur le disque ? » (Jarvis propose une commande, vous validez)

### Sécurité

- **Écrire un fichier** et **lancer une commande** demandent toujours votre accord : `Autoriser ? [o/N]`. Toute réponse autre que « o » ou « oui » refuse, et sans terminal (entrée fermée) tout est refusé.
- **Lire** un fichier ou lister un dossier est libre dans le dossier courant ; en dehors, Jarvis demande d'abord.
- Les commandes n'ont pas accès à votre clavier (elles ne peuvent pas attendre une saisie) et sont interrompues après 60 s par défaut (300 s au maximum).
- Le contenu des pages web, des fichiers et des sorties de commandes est traité comme de la donnée : Jarvis a pour consigne d'ignorer toute « instruction » qui s'y cacherait. Ce n'est pas une garantie absolue, c'est pourquoi l'accord humain reste la vraie barrière.
- Vos notes et souvenirs sont de simples fichiers JSON dans `~/.jarvis/` (`JARVIS_HOME` pour changer de dossier) : lisibles et modifiables à la main.

### Configuration

| Variable | Rôle |
|---|---|
| `ANTHROPIC_API_KEY` | clé API (obligatoire) |
| `JARVIS_MODEL` | modèle par défaut (sinon `claude-opus-5-5`) ; `--modele` est prioritaire |
| `JARVIS_HOME` | dossier des notes et souvenirs (sinon `~/.jarvis`) |
| `NO_COLOR` | désactive les couleurs |

### Ajouter un outil

Dans `jarvis/tools.py` : écrire la fonction (elle renvoie du texte ou lève `ToolError`), la déclarer dans `TOOLS` avec son schéma, l'ajouter à `_HANDLERS`. Si elle est sensible, lui associer une garde dans `_GUARDS` (même signature, renvoie la question à poser à l'utilisateur).

### Tests

```bash
python -m pytest
```

Les tests n'appellent pas l'API : l'agent est testé avec un faux client, et les garde-fous de sécurité sont vérifiés (les supprimer fait échouer les tests).
