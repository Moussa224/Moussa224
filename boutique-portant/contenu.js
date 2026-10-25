/* ==========================================================================
   CONTENU DU SITE  ·  C'est LE fichier à modifier.
   Changez uniquement ce qui est entre guillemets "...", puis enregistrez.
   Chaque pièce de la collection est un bloc { ... } dans la liste « pieces » :
   copiez-en un pour ajouter un vêtement, supprimez-en un pour l'enlever.
   ========================================================================== */

const BOUTIQUE = {

  /* ---------- La marque ---------- */
  marque: "TA MARQUE",
  slogan: "Collection en précommande",

  /* ---------- Réservation ----------
     Les clients écrivent à cette adresse (ou sur WhatsApp si un numéro est donné). */
  contact: {
    email: "contact@exemple.com",
    whatsapp: "",                  // facultatif, avec l'indicatif et sans « + » : "224600000000"
    texteBouton: "Voir la disponibilité"
  },

  /* ---------- Page « À propos » ---------- */
  apropos: {
    titre: "À propos",
    texte: [
      "Une petite marque, des pièces en série limitée, pensées et fabriquées avec soin.",
      "Chaque vêtement existe en quelques exemplaires seulement. Choisissez votre pièce sur le portant, vérifiez votre taille, puis écrivez-nous pour la réserver."
    ]
  },

  /* ---------- La collection ----------
     forme    : "tee" · "debardeur" · "veste" · "maillot"
     couleur  : couleur principale du vêtement (code #RRGGBB)
     accent   : deuxième couleur (manches, bandes, finitions)
     texte    : mot imprimé sur la poitrine (facultatif)
     use      : true pour un vêtement délavé, troué, « vintage »
     tailles  : les tailles proposées — mettre en `rupture` celles qui sont épuisées
     La pièce du milieu est affichée en grand à l'ouverture (ordre de la liste). */
  pieces: [
    { nom: "Tee Craie",       forme: "tee",       couleur: "#F3F1EC", accent: "#D9D5CC", prix: "45 €",  tailles: ["S", "M", "L", "XL"], rupture: ["S"] },
    { nom: "Tee Nuit",        forme: "tee",       couleur: "#2B2B2D", accent: "#4A4A4E", prix: "45 €",  tailles: ["S", "M", "L", "XL"], rupture: [] },
    { nom: "Débardeur Usé",   forme: "debardeur", couleur: "#6E6E70", accent: "#9A9A9C", prix: "60 €",  tailles: ["M", "L", "XL"],      rupture: [], texte: "TA MARQUE", use: true },
    { nom: "Varsity Crème",   forme: "veste",     couleur: "#161616", accent: "#EFE6D2", prix: "140 €", tailles: ["M", "L"],            rupture: ["M"] },
    { nom: "Tee Ciel",        forme: "tee",       couleur: "#8FB0DE", accent: "#6F93C6", prix: "45 €",  tailles: ["S", "M", "L", "XL"], rupture: [] },
    { nom: "Maillot Soleil",  forme: "maillot",   couleur: "#F4D21E", accent: "#2FA84F", prix: "75 €",  tailles: ["S", "M", "L"],       rupture: ["L"] },
    { nom: "Tee Blanc Neige", forme: "tee",       couleur: "#FBFBFA", accent: "#E3E3E0", prix: "45 €",  tailles: ["S", "M", "L", "XL"], rupture: [] }
  ]
};
