# Moussa224
Moussa kourouma

## Jarvis

Jarvis est un assistant personnel en français, propulsé par Claude (`claude-opus-5-5`), dans votre terminal **ou dans une interface web locale**. Il répond en direct, cherche sur le web, retient ce que vous lui dites et peut agir sur votre ordinateur, **toujours avec votre accord** pour ce qui est sensible.

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
| **Voix** | terminal : `--voix` lit les réponses (`say` sur macOS, `espeak-ng`/`espeak`/`spd-say` sur Linux). Web : micro et lecture vocale intégrés (voir plus bas) |
| **Reprise** | `--continuer` reprend la dernière conversation, même après avoir fermé Jarvis |

### Installation

```bash
pip install -e .                       # Python 3.10+ ; installe la commande `jarvis`
export ANTHROPIC_API_KEY="sk-ant-..."
jarvis --diagnostic                    # vérifie que tout fonctionne vraiment
```

**Obtenir une clé API** : connectez-vous (ou créez un compte) sur [platform.claude.com](https://platform.claude.com), ouvrez [Paramètres > API keys](https://platform.claude.com/settings/keys) et cliquez sur **Create key**. Donnez-lui un nom, choisissez une expiration, laissez **Linked account** sur vous-même et **choisissez un workspace** : une clé non liée à un workspace est refusée par l'API (erreur 400). La console n'affiche la clé complète (elle commence par `sk-ant-`) qu'une seule fois : copiez-la tout de suite, ne la mettez jamais dans git ni dans un message. L'abonnement Claude.ai ne fournit pas de clé ; l'API est facturée à part.

`jarvis --diagnostic` envoie, avec votre clé, les mêmes requêtes que Jarvis (même modèle, même prompt, mêmes outils) limitées à 16 jetons de sortie, donc pour un coût négligeable. Il vérifie la clé, le modèle, la définition des outils, la recherche web et la voix, et dit clairement ce qui ne va pas. Lancez-le en premier.

La recherche web doit être activée pour votre organisation dans la Console Anthropic. Sinon, Jarvis le détecte, prévient, et continue sans (ou utilisez `--sans-web`).

**Lancez `jarvis` depuis le dossier de votre projet** : c'est son « dossier courant », où il peut lire sans demander (voir Sécurité).

### Utilisation

```bash
jarvis                                   # conversation interactive
jarvis "Quelle heure est-il à Tokyo ?"   # une seule question
jarvis --voix                            # avec réponse vocale
jarvis --continuer                       # reprend la dernière conversation
jarvis --web                             # interface web (s'ouvre dans le navigateur)
jarvis --modele claude-sonnet-5-5        # modèle plus économique
jarvis --sans-web                        # sans accès au web
```

Dans la conversation : `/reset` oublie l'échange en cours, `/aide` rappelle les commandes, `/quitter` (ou Ctrl-D) ferme Jarvis. Ctrl-C interrompt une réponse.

Exemples :

- « Quelles sont les dernières nouvelles sur l'Euro de football ? »
- « Combien font 18 % de 2 450 ? »
- « Retiens que je préfère être tutoyé. » (valable dès la prochaine session)
- « Note que je dois appeler Awa demain. »
- « Résume le fichier README.md de ce dossier. »
- « Combien d'espace libre me reste-t-il sur le disque ? » (Jarvis propose une commande, vous validez)

### Interface web

```bash
jarvis --web                       # affiche un lien privé et ouvre le navigateur
jarvis --web --port 9000           # autre port (8765 par défaut)
jarvis --web --sans-navigateur     # n'ouvre rien, copiez le lien vous-même
jarvis --web --continuer           # reprend la dernière conversation
```

La page affiche la réponse au fil de l'eau, montre les outils utilisés, et ouvre une fenêtre **Autorisation requise** (« Refuser » est le choix par défaut, Échap refuse) quand Jarvis veut écrire un fichier ou lancer une commande. Sans réponse au bout de 2 minutes, l'action est refusée. La page s'adapte aux petits écrans, mais le serveur n'est volontairement pas accessible depuis le réseau (donc pas depuis un téléphone).

**Voix dans le navigateur** : le bouton haut-parleur lit les réponses à voix haute ; le bouton micro permet de dicter un message, envoyé dès que vous vous taisez. La reconnaissance vocale dépend du navigateur (Chrome, Edge, Safari) et le bouton n'apparaît que s'il la propose. Avec Chrome, l'audio est traité par les serveurs de Google : n'utilisez pas le micro si cela ne vous convient pas, le reste fonctionne sans.

### Sécurité

- **Écrire un fichier** et **lancer une commande** demandent toujours votre accord : `Autoriser ? [o/N]`. Toute réponse autre que « o » ou « oui » refuse, et sans terminal (entrée fermée) tout est refusé.
- **Lire** un fichier ou lister un dossier est libre dans le dossier courant ; en dehors, Jarvis demande d'abord. Les fichiers sensibles (`.env*`, `.ssh`, `.aws`, `.gnupg`, `.kube`, `.docker`, `.netrc`, clés `.pem`/`.key`, et les données de Jarvis lui-même) demandent toujours l'accord, même dans le dossier courant : lancé depuis votre dossier personnel, Jarvis ne lit donc pas vos secrets sans vous le demander.
- **Ce que vous approuvez est ce qui sera fait** : l'écriture d'un fichier affiche le début de son contenu (300 caractères), et les caractères de contrôle d'un chemin ou d'une commande (`\r`, séquences ANSI, inversion du sens d'écriture, caractères invisibles) sont rendus visibles, pour qu'un texte piégé ne puisse pas se déguiser à l'écran. La réponse du modèle est aussi nettoyée de ces caractères avant d'être affichée dans le terminal.
- Les commandes n'ont pas accès à votre clavier (elles ne peuvent pas attendre une saisie) et sont interrompues après 60 s par défaut (300 s au maximum).
- Le contenu des pages web, des fichiers et des sorties de commandes est traité comme de la donnée : Jarvis a pour consigne d'ignorer toute « instruction » qui s'y cacherait. Ce n'est pas une garantie absolue, c'est pourquoi l'accord humain reste la vraie barrière.
- Vos notes et souvenirs sont de simples fichiers JSON dans `~/.jarvis/` (`JARVIS_HOME` pour changer de dossier) : lisibles et modifiables à la main. La conversation sauvegardée (`session.json`) n'est lisible que par vous, car elle peut contenir des fichiers que Jarvis a lus. `/reset` l'efface.
- **Serveur web** : il n'écoute que sur `127.0.0.1`. Comme il peut déclencher des actions, chaque requête exige un jeton secret aléatoire (dans le fragment du lien, donc ni envoyé au serveur ni journalisé, et retiré de la barre d'adresse), un en-tête `Host` attendu (contre le *DNS rebinding*) et une origine identique au serveur (un autre site ouvert dans votre navigateur ne peut pas lui parler). Le navigateur est ouvert sur un petit fichier de redirection lisible par vous seul (`~/.jarvis/jarvis-open.html`, supprimé à l'arrêt), jamais directement sur l'URL : une URL passée au navigateur est visible de tous les utilisateurs de la machine (`ps`) et le jeton donne la main sur Jarvis, approbations comprises. La page applique une politique CSP stricte et n'insère jamais de texte comme HTML. Ne partagez pas le lien.

### Configuration

| Variable | Rôle |
|---|---|
| `ANTHROPIC_API_KEY` | clé API (obligatoire) |
| `JARVIS_MODEL` | modèle par défaut (sinon `claude-opus-5-5`) ; `--modele` est prioritaire |
| `JARVIS_HOME` | dossier des notes et souvenirs (sinon `~/.jarvis`) |
| `NO_COLOR` | désactive les couleurs dans le terminal |

### Ajouter un outil

Dans `jarvis/tools.py` : écrire la fonction (elle renvoie du texte ou lève `ToolError`), la déclarer dans `TOOLS` avec son schéma, l'ajouter à `_HANDLERS`. Si elle est sensible, lui associer une garde dans `_GUARDS` (même signature, renvoie la question à poser à l'utilisateur).

### Tests

```bash
pip install -e ".[dev]"
python -m pytest
ruff check .
```

Les tests n'appellent pas l'API : l'agent est testé avec un faux client, le serveur web avec de vraies requêtes HTTP, et les garde-fous de sécurité sont vérifiés (les supprimer fait échouer les tests).
