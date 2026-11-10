# Affiche « La Guinée reçoit le monde » – Simandou Mining Summit

- `affiche-simandou.png` : l'affiche finale (2412 × 2652 px, format 1206 × 1326 ×2).
- `index.html` : la source (HTML + SVG). Ouvrez-la dans un navigateur pour la voir.
- `photo.webp` : la photo du haut (1206 px de large, fondue en bas dans le dégradé).
- `fonts/` : polices (Montserrat, Poppins, Great Vibes, Allura – licence OFL).
- `render.js` : exporte `index.html` en PNG → `node render.js 2` (le chiffre = échelle, 2 par défaut).

## Modifier l'affiche

- **Textes** : cherchez-les dans `index.html` (`le 11-11 à 11h11`, `ÎLE DE KASSA`, `GUINEA IS OPEN FOR BUSINESS`, `US`…).
- **Photo** : remplacez `photo.webp` (gardez 1206 px de large pour 716 px de haut ; le bas peut être
  rendu transparent pour se fondre dans le dégradé, ou laissez le voile `.tint` faire le travail).
- **Couleurs** : variables `--orange` et `--green` en haut de `index.html`.
