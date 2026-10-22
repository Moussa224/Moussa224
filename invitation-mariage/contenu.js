/* ==========================================================================
   CONTENU DU SITE  ·  C'est LE fichier à modifier.
   Changez uniquement ce qui est entre guillemets "...", puis enregistrez.
   Les photos se remplacent dans le dossier « photos » (même nom de fichier).
   ========================================================================== */

const SITE = {

  /* ---------- Les mariés ---------- */
  prenom1: "Prénom 1",
  prenom2: "Prénom 2",
  // Les initiales du cachet de cire sont prises automatiquement
  // (première lettre de chaque prénom). Pour les forcer : initiales: "A & B"
  initiales: "",
  hashtag: "#PrénomEtPrénom",

  /* ---------- Le jour J ---------- */
  date: "2027-06-12",        // année-mois-jour  (la date s'écrit toute seule en français)
  heure: "16:00",            // heure de la cérémonie, sert au compte à rebours
  fuseau: "+00:00",          // Conakry = "+00:00"  ·  Paris été = "+02:00"  ·  Paris hiver = "+01:00"

  /* ---------- Le lieu ---------- */
  lieu: {
    salle: "Nom de la salle",
    adresse: "Adresse de la salle",
    ville: "Conakry",
    // Facultatif : collez ici un lien Google Maps précis pour le bouton « itinéraire ».
    // Laissé vide, le site le fabrique à partir de l'adresse ci-dessus.
    lienItineraire: ""
  },

  /* ---------- Textes d'ouverture ---------- */
  enveloppe: {
    texteBouton: "Ouvrir notre invitation",
    indice: "Une invitation vous attend"
  },
  carte: {
    surtitre: "Vous êtes invités"
  },

  /* ---------- 1. Accueil ---------- */
  accueil: {
    surtitre: "Nous nous marions",
    phrase: "Il y a des jours qui changent une vie. Nous serions infiniment heureux de partager celui-ci avec vous.",
    compteReboursTitre: "Plus que",
    jourJ: "C'est le grand jour !"      // affiché quand le compte à rebours est terminé
  },

  /* ---------- 2. Notre histoire ---------- */
  histoire: {
    surtitre: "Depuis le début",
    titre: "Notre histoire",
    etapes: [
      {
        date: "Été 2019",
        titre: "Notre rencontre",
        texte: "Un regard, un sourire, et la sensation étrange que l'on se connaissait déjà. Tout a commencé comme ça, simplement."
      },
      {
        date: "Automne 2019",
        titre: "Le premier rendez-vous",
        texte: "Une conversation sans fin, un dîner qui a duré jusqu'à la fermeture. Nous savions déjà que ce n'était que le début."
      },
      {
        date: "Hiver 2026",
        titre: "La demande en mariage",
        texte: "Une question, un « oui » sans hésitation, et le début d'une nouvelle page que nous écrivons à deux."
      }
    ]
  },

  /* ---------- 3. Galerie (4 à 6 photos) ---------- */
  galerie: {
    surtitre: "Quelques souvenirs",
    titre: "Notre galerie",
    // Pour remplacer une photo : gardez le nom ou changez-le ici.
    photos: [
      { src: "photos/galerie-1.jpg", alt: "Les mariés ensemble, photo 1", format: "4 / 5" },
      { src: "photos/galerie-2.jpg", alt: "Les mariés ensemble, photo 2", format: "1 / 1" },
      { src: "photos/galerie-3.jpg", alt: "Les mariés ensemble, photo 3", format: "3 / 4" },
      { src: "photos/galerie-4.jpg", alt: "Les mariés ensemble, photo 4", format: "4 / 5" },
      { src: "photos/galerie-5.jpg", alt: "Les mariés ensemble, photo 5", format: "1 / 1" },
      { src: "photos/galerie-6.jpg", alt: "Les mariés ensemble, photo 6", format: "3 / 4" }
    ]
  },

  /* ---------- 4. Le programme ---------- */
  programme: {
    surtitre: "Le déroulé",
    titre: "Le programme",
    moments: [
      { heure: "15h00", titre: "Accueil des invités",  texte: "Installez-vous, un rafraîchissement vous attend." },
      { heure: "16h00", titre: "La cérémonie",         texte: "Le moment des engagements, entourés de ceux qui comptent." },
      { heure: "17h30", titre: "Séance photos",        texte: "Photos de famille et d'amis, dans la bonne humeur." },
      { heure: "19h30", titre: "Le repas",             texte: "Un dîner festif, suivi de la soirée dansante." },
      { heure: "23h00", titre: "Remerciements",        texte: "Quelques mots pour vous dire merci avant de clore la soirée." }
    ]
  },

  /* ---------- 5. Le lieu ---------- */
  lieuSection: {
    surtitre: "Où nous retrouver",
    titre: "Le lieu",
    texteBouton: "Ouvrir l'itinéraire"
  },

  /* ---------- 6. Tenue ---------- */
  tenue: {
    surtitre: "Dress code",
    titre: "La tenue",
    texte: "Élégance chaleureuse et tons naturels. Nous vous invitons à porter des nuances de terre, de sable et de cuivre. Merci de laisser le blanc aux mariés.",
    couleurs: [
      { nom: "Terracotta", hex: "#B5573A" },
      { nom: "Sable",      hex: "#E3CDB0" },
      { nom: "Brun",       hex: "#4A2C1E" }
    ]
  },

  /* ---------- 7. Confirmer ma présence ---------- */
  rsvp: {
    surtitre: "Votre réponse",
    titre: "Confirmer ma présence",
    texte: "Votre présence sera notre plus beau cadeau. Merci de nous indiquer si vous serez des nôtres.",
    texteBouton: "Répondre à l'invitation",
    // Collez ici le lien de votre formulaire (Google Forms, Typeform, WhatsApp...).
    // WhatsApp : "https://wa.me/224XXXXXXXXX?text=Bonjour%2C%20je%20confirme%20ma%20pr%C3%A9sence"
    lienFormulaire: "https://forms.gle/VOTRE-LIEN",
    dateLimite: "2027-05-01",   // année-mois-jour
    prefixeDateLimite: "Réponse souhaitée avant le"
  },

  /* ---------- 8. Pied de page ---------- */
  pied: {
    message: "Merci de faire partie de notre histoire"
  }
};
