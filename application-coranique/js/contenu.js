/* ==========================================================================
   Coran Facile · contenu pédagogique
   Les textes des leçons, le parcours, les versets du jour et les récitants se changent ici.
   Les exemples de tajwid ne recopient pas l'arabe : ils indiquent un verset (s = sourate, v = verset)
   et les mots à montrer (mots = [premier, dernier], en comptant à partir de 0), l'application les lit
   directement dans le texte du Coran.
   ========================================================================== */
const CONTENU = {

  /* ---------- Récitants (audio verset par verset) ---------- */
  // dossier = nom du dossier sur everyayah.com · islamic = édition sur cdn.islamic.network (secours, facultatif)
  recitants: [
    { id: 'alafasy', nom: 'Mishary Al-Afasy', style: 'Clair et régulier', dossier: 'Alafasy_128kbps', islamic: 'ar.alafasy', debit: 128 },
    { id: 'husary', nom: 'Mahmoud Khalil Al-Husary', style: 'Posé, très net : idéal pour apprendre', dossier: 'Husary_128kbps', islamic: 'ar.husary', debit: 128 },
    { id: 'minshawi', nom: 'Mohamed Al-Minshawi', style: 'Posé et émouvant', dossier: 'Minshawy_Murattal_128kbps' },
    { id: 'abdelbasit', nom: 'Abdul Basit Abdus-Samad', style: 'Récitation posée', dossier: 'Abdul_Basit_Murattal_192kbps' },
    { id: 'sudais', nom: 'Abdurrahman As-Sudais', style: 'Imam de la Mecque', dossier: 'Abdurrahmaan_As-Sudais_192kbps' },
    { id: 'shuraym', nom: 'Saud Ash-Shuraym', style: 'Imam de la Mecque', dossier: 'Saood_ash-Shuraym_128kbps' }
  ],

  /* ---------- Alphabet ---------- */
  // lat = écriture française de la lettre · lie = false si la lettre ne se lie pas à la suivante
  alphabet: [
    { l: 'ا', nom: 'Alif', lat: '', lie: false, son: "Voyelle longue « â » (comme dans « pâte »). Sert aussi de support à la hamza.", astuce: 'Un simple trait vertical.' },
    { l: 'ب', nom: 'Bâ', lat: 'b', lie: true, son: "Comme le « b » de « bateau ».", astuce: 'Un point en dessous.' },
    { l: 'ت', nom: 'Tâ', lat: 't', lie: true, son: "Comme le « t » de « table ».", astuce: 'Deux points au-dessus.' },
    { l: 'ث', nom: 'Thâ', lat: 'th', lie: true, son: "Comme le « th » anglais de « think » : la langue touche le bout des dents.", astuce: 'Trois points au-dessus.' },
    { l: 'ج', nom: 'Jîm', lat: 'dj', lie: true, son: "Comme le « dj » de « djinn ».", astuce: 'Un point dans le creux.' },
    { l: 'ح', nom: 'Hâ fort', lat: 'h', lie: true, son: "Un « h » appuyé, soufflé du fond de la gorge, comme pour réchauffer ses mains.", astuce: 'Comme le jîm, mais sans point.' },
    { l: 'خ', nom: 'Khâ', lat: 'kh', lie: true, son: "Comme le « j » espagnol de « jamón » ou le « ch » allemand de « Bach ».", astuce: 'Comme le jîm, avec un point au-dessus.' },
    { l: 'د', nom: 'Dâl', lat: 'd', lie: false, son: "Comme le « d » de « dormir ».", astuce: 'Ne se lie pas à la lettre suivante.' },
    { l: 'ذ', nom: 'Dhâl', lat: 'dh', lie: false, son: "Comme le « th » anglais de « this » : la langue touche les dents, la voix vibre.", astuce: 'Comme le dâl, avec un point au-dessus.' },
    { l: 'ر', nom: 'Râ', lat: 'r', lie: false, son: "Un « r » roulé avec le bout de la langue, comme en espagnol.", astuce: 'Ne se lie pas à la lettre suivante.' },
    { l: 'ز', nom: 'Zây', lat: 'z', lie: false, son: "Comme le « z » de « zèbre ».", astuce: 'Comme le râ, avec un point au-dessus.' },
    { l: 'س', nom: 'Sîn', lat: 's', lie: true, son: "Comme le « s » de « soleil ».", astuce: 'Trois dents.' },
    { l: 'ش', nom: 'Chîn', lat: 'ch', lie: true, son: "Comme le « ch » de « chat ».", astuce: 'Comme le sîn, avec trois points au-dessus.' },
    { l: 'ص', nom: 'Sâd', lat: 's', lie: true, son: "Un « s » grave, prononcé la bouche arrondie et la langue plaquée en arrière.", astuce: 'Une boucle fermée, la lettre « lourde ».' },
    { l: 'ض', nom: 'Dâd', lat: 'd', lie: true, son: "Un « d » grave, la langue large contre le palais.", astuce: 'Comme le sâd, avec un point au-dessus.' },
    { l: 'ط', nom: 'Tâ grave', lat: 't', lie: true, son: "Un « t » grave, la langue large contre le palais.", astuce: 'Une boucle avec un trait vertical.' },
    { l: 'ظ', nom: 'Zâ grave', lat: 'z', lie: true, son: "Un « dh » grave, comme le dhâl mais avec la bouche arrondie.", astuce: 'Comme le tâ grave, avec un point au-dessus.' },
    { l: 'ع', nom: 'Aïn', lat: '‘', lie: true, son: "Un son de gorge propre à l'arabe : on resserre la gorge en laissant passer la voix. Il n'existe pas en français : écoute bien le récitant.", astuce: 'Comme une petite tête avec un creux.' },
    { l: 'غ', nom: 'Ghaïn', lat: 'gh', lie: true, son: "Comme un « r » français très doux, roulé au fond de la gorge (le « r » de « rue » gargarisé).", astuce: "Comme l'aïn, avec un point au-dessus." },
    { l: 'ف', nom: 'Fâ', lat: 'f', lie: true, son: "Comme le « f » de « fleur ».", astuce: 'Un point au-dessus.' },
    { l: 'ق', nom: 'Qâf', lat: 'q', lie: true, son: "Un « k » prononcé tout au fond de la gorge.", astuce: 'Comme le fâ, avec deux points au-dessus.' },
    { l: 'ك', nom: 'Kâf', lat: 'k', lie: true, son: "Comme le « k » de « kilo ».", astuce: 'Une petite marque en forme de « hamza » à l’intérieur.' },
    { l: 'ل', nom: 'Lâm', lat: 'l', lie: true, son: "Comme le « l » de « lune ».", astuce: 'Un grand trait vertical avec un crochet en bas.' },
    { l: 'م', nom: 'Mîm', lat: 'm', lie: true, son: "Comme le « m » de « mer ».", astuce: 'Un petit rond.' },
    { l: 'ن', nom: 'Nûn', lat: 'n', lie: true, son: "Comme le « n » de « nuit ».", astuce: 'Un point au-dessus.' },
    { l: 'ه', nom: 'Hâ léger', lat: 'h', lie: true, son: "Un « h » léger, aspiré, comme dans l'anglais « hello ».", astuce: 'Sa forme change beaucoup selon sa place.' },
    { l: 'و', nom: 'Wâw', lat: 'w', lie: false, son: "Un « w » (comme dans « oui »), ou un « oû » long.", astuce: 'Ne se lie pas à la lettre suivante.' },
    { l: 'ي', nom: 'Yâ', lat: 'y', lie: true, son: "Un « y » (comme dans « yaourt »), ou un « î » long.", astuce: 'Deux points en dessous.' },
    { l: 'ء', nom: 'Hamza', lat: '', lie: false, son: "Un petit arrêt dans la gorge, un coup de glotte net, comme au début d'un « Eh ! » sec.", astuce: 'Se pose seule ou sur un alif, un waw ou un yâ.' }
  ],

  // Lettres qui se ressemblent (on les apprend ensemble)
  familles: ['بتثني', 'جحخ', 'دذ', 'رز', 'سش', 'صض', 'طظ', 'عغ', 'فق'],

  /* ---------- Voyelles et signes ---------- */
  voyelles: [
    { id: 'fatha', signe: 'َ', nom: 'Fatha', son: 'a', exemple: 'بَ', lecture: 'ba', texte: "Un petit trait au-dessus de la lettre. On prononce « a »." },
    { id: 'damma', signe: 'ُ', nom: 'Damma', son: 'ou', exemple: 'بُ', lecture: 'bou', texte: "Un petit « و » au-dessus de la lettre. On prononce « ou »." },
    { id: 'kasra', signe: 'ِ', nom: 'Kasra', son: 'i', exemple: 'بِ', lecture: 'bi', texte: "Un petit trait sous la lettre. On prononce « i »." },
    { id: 'soukoun', signe: 'ْ', nom: 'Soukoun', son: '', exemple: 'بْ', lecture: 'b', texte: "Un petit rond au-dessus de la lettre. Pas de voyelle : on prononce la consonne seule, liée à la voyelle précédente (comme dans « ab »)." },
    { id: 'chadda', signe: 'ّ', nom: 'Chadda', son: 'double', exemple: 'بَّ', lecture: 'bba', texte: "Un petit « w » au-dessus de la lettre. La lettre est doublée : on appuie dessus, comme dans « bb » de « abbé »." },
    { id: 'tanwin-fath', signe: 'ً', nom: 'Tanwîn fatha', son: 'an', exemple: 'بً', lecture: 'ban', texte: "Deux fathas à la fin d'un mot : on ajoute le son « an »." },
    { id: 'tanwin-damm', signe: 'ٌ', nom: 'Tanwîn damma', son: 'oun', exemple: 'بٌ', lecture: 'boun', texte: "Deux dammas à la fin d'un mot : on ajoute le son « oun »." },
    { id: 'tanwin-kasr', signe: 'ٍ', nom: 'Tanwîn kasra', son: 'in', exemple: 'بٍ', lecture: 'bin', texte: "Deux kasras à la fin d'un mot : on ajoute le son « in »." }
  ],
  voyellesLongues: [
    { exemple: 'بَا', lecture: 'bâ', texte: 'Fatha + alif : le « a » dure deux temps.' },
    { exemple: 'بُو', lecture: 'boû', texte: 'Damma + waw : le « ou » dure deux temps.' },
    { exemple: 'بِي', lecture: 'bî', texte: 'Kasra + yâ : le « i » dure deux temps.' }
  ],
  autresSignes: [
    { signe: 'ٰ', nom: 'Alif en exposant', texte: "Un petit alif au-dessus de la lettre : on allonge le « a » (comme dans ٱلرَّحۡمَٰنِ).", exemple: 'ـَٰ' },
    { signe: 'ٱ', nom: 'Alif de liaison', texte: "Au début d'un mot, elle ne se prononce pas quand on enchaîne avec le mot précédent (ٱللَّهِ, ٱلۡحَمۡدُ).", exemple: 'ٱ' },
    { signe: 'ٓ', nom: 'Madda', texte: "Un petit tilde : on allonge la voyelle plus longtemps (ءَآمَنُواْ, ٱلضَّآلِّينَ).", exemple: 'آ' }
  ],

  /* ---------- Tajwid ---------- */
  tajwid: [
    {
      id: 'nun-idhhar', groupe: 'Le nûn sans voyelle et le tanwîn', titre: 'Idh-hâr : le prononcer nettement',
      texte: "Devant les lettres de la gorge  ء ه ع ح غ خ , le « n » (نْ) ou le tanwîn se prononce clairement, sans le cacher.",
      exemples: [{ s: 2, v: 62, mots: [7, 8] }, { s: 113, v: 5, mots: [2, 3] }]
    },
    {
      id: 'nun-idgham', groupe: 'Le nûn sans voyelle et le tanwîn', titre: 'Idghâm : le fondre dans la lettre suivante',
      texte: "Devant les six lettres  ي ر م ل و ن  (on les retient avec le mot « يرملون »), le « n » se fond dans la lettre qui suit. Avec ghunna (un son nasal d'environ deux temps) devant  ي ن م و , et sans ghunna devant  ل ر .",
      exemples: [{ s: 2, v: 8, mots: [2, 3], note: 'Avec ghunna (nûn devant yâ)' }, { s: 2, v: 5, mots: [3, 4], note: 'Sans ghunna (nûn devant râ)' }]
    },
    {
      id: 'nun-iqlab', groupe: 'Le nûn sans voyelle et le tanwîn', titre: 'Iqlâb : le changer en mîm',
      texte: "Devant la lettre  ب , le « n » se change en « m » nasalisé (ghunna). Un petit mîm écrit au-dessus de la lettre le rappelle.",
      exemples: [{ s: 2, v: 27, mots: [4, 5] }]
    },
    {
      id: 'nun-ikhfa', groupe: 'Le nûn sans voyelle et le tanwîn', titre: 'Ikhfâ’ : le cacher dans le nez',
      texte: "Devant les quinze autres lettres  ت ث ج د ذ ز س ش ص ض ط ظ ف ق ك , le « n » est adouci et nasalisé, sans être prononcé complètement.",
      exemples: [{ s: 113, v: 2, mots: [0, 1] }]
    },
    {
      id: 'mim', groupe: 'Le mîm sans voyelle', titre: 'Les trois cas du mîm (مْ)',
      texte: "Devant un autre  م  : on fond les deux avec ghunna (idghâm). Devant  ب  : on cache le mîm légèrement avec les lèvres (ikhfâ’). Devant toutes les autres lettres : on le prononce nettement, surtout devant  و  et  ف .",
      exemples: [{ s: 2, v: 10, mots: [1, 2], note: 'Fusion devant un autre mîm' }, { s: 105, v: 4, mots: [0, 1], note: 'Mîm devant bâ' }]
    },
    {
      id: 'ghunna', groupe: 'Les sons nasaux', titre: 'Ghunna : le nûn et le mîm avec chadda',
      texte: "Quand un nûn (نّ) ou un mîm (مّ) porte une chadda, on le prononce avec un son nasal qui dure environ deux temps.",
      exemples: [{ s: 114, v: 4, mots: [3, 3] }, { s: 114, v: 6, mots: [1, 1] }]
    },
    {
      id: 'qalqala', groupe: 'Les rebonds', titre: 'Qalqala : le petit rebond',
      texte: "Les cinq lettres  ق ط ب ج د  (on les retient avec « قطب جد ») rebondissent légèrement quand elles portent un soukoun ou quand on s'arrête dessus. On ne prononce pas de voyelle : c'est un petit écho.",
      exemples: [{ s: 112, v: 3, mots: [1, 1] }]
    },
    {
      id: 'madd-naturel', groupe: 'Les allongements (madd)', titre: 'Madd naturel : 2 temps',
      texte: "Quand un alif, un waw ou un yâ prolonge la voyelle (ــَا  ــُو  ــِي), on la tient deux temps. Un temps correspond à peu près à un battement de doigt.",
      exemples: [{ s: 1, v: 2, mots: [3, 3] }]
    },
    {
      id: 'madd-muttasil', groupe: 'Les allongements (madd)', titre: 'Madd muttasil : plus long',
      texte: "Si une lettre d'allongement est suivie d'une hamza dans le même mot, on allonge de 4 à 5 temps.",
      exemples: [{ s: 110, v: 1, mots: [1, 1] }]
    },
    {
      id: 'madd-munfasil', groupe: 'Les allongements (madd)', titre: 'Madd munfasil : plus long aussi',
      texte: "Si la lettre d'allongement finit un mot et que le mot suivant commence par une hamza, on allonge de 4 à 5 temps. La durée exacte dépend de l'école de récitation de ton enseignant.",
      exemples: [{ s: 2, v: 4, mots: [2, 3] }]
    },
    {
      id: 'madd-lazim', groupe: 'Les allongements (madd)', titre: 'Madd lâzim : le plus long, 6 temps',
      texte: "Si la lettre d'allongement est suivie d'une lettre portant un soukoun ou une chadda dans le même mot, on allonge de 6 temps.",
      exemples: [{ s: 1, v: 7, mots: [8, 8] }]
    },
    {
      id: 'lam', groupe: 'Le lâm de « al »', titre: 'Lettres solaires et lettres lunaires',
      texte: "Devant les 14 lettres solaires  ت ث د ذ ر ز س ش ص ض ط ظ ل ن , le lâm de « al » ne se prononce pas et la lettre suivante est doublée. Devant les 14 autres lettres, dites lunaires  ا ب ج ح خ ع غ ف ق ك م ه و ي , on prononce le lâm.",
      exemples: [{ s: 91, v: 1, mots: [0, 0], note: 'Lettre solaire : on dit « ach-chams »' }, { s: 54, v: 1, mots: [3, 3], note: 'Lettre lunaire : on dit « al-qamar »' }]
    },
    {
      id: 'lourdes', groupe: 'Les lettres lourdes', titre: 'Tafkhîm : les sept lettres lourdes',
      texte: "Les lettres  خ ص ض غ ط ق ظ  (on les retient avec « خُصَّ ضَغْطٍ قِظْ ») se prononcent « pleines » : la langue se retire vers l'arrière et la bouche s'arrondit. Les autres lettres sont fines.",
      exemples: []
    }
  ],
  signesArret: [
    { signe: 'ۘ', texte: "Arrêt obligatoire : on s'arrête." },
    { signe: 'ۙ', texte: "Ne pas s'arrêter ici." },
    { signe: 'ۖ', texte: "On peut s'arrêter, mais continuer est préférable." },
    { signe: 'ۗ', texte: "On peut continuer, mais s'arrêter est préférable." },
    { signe: 'ۚ', texte: "Arrêt permis : s'arrêter ou continuer sont tous deux bien." },
    { signe: 'ۛ', texte: "Deux groupes de trois points : on peut s'arrêter à l'un des deux endroits, mais pas aux deux." },
    { signe: 'ۜ', texte: "Courte pause, sans reprendre son souffle." }
  ],

  /* ---------- Parcours conseillé ---------- */
  // type 'lecon' : leçon à valider · type 'passage' : versets de a à b (de = premier verset, a = dernier)
  parcours: [
    { id: 'alphabet', type: 'lecon', titre: "Découvrir les lettres arabes", lien: 'alphabet', duree: '15 min' },
    { id: 'voyelles', type: 'lecon', titre: 'Lire avec les voyelles', lien: 'voyelles', duree: '10 min' },
    { id: 'p1', type: 'passage', s: 1, de: 1, a: 7, titre: 'Al-Fatiha, la sourate d’ouverture' },
    { id: 'p114', type: 'passage', s: 114, de: 1, a: 6, titre: 'An-Nas' },
    { id: 'p113', type: 'passage', s: 113, de: 1, a: 5, titre: 'Al-Falaq' },
    { id: 'p112', type: 'passage', s: 112, de: 1, a: 4, titre: 'Al-Ikhlas' },
    { id: 'tajwid', type: 'lecon', titre: 'Les règles de base du tajwid', lien: 'tajwid', duree: '20 min' },
    { id: 'p111', type: 'passage', s: 111, de: 1, a: 5, titre: 'Al-Masad' },
    { id: 'p110', type: 'passage', s: 110, de: 1, a: 3, titre: 'An-Nasr' },
    { id: 'p109', type: 'passage', s: 109, de: 1, a: 6, titre: 'Al-Kafirun' },
    { id: 'p108', type: 'passage', s: 108, de: 1, a: 3, titre: 'Al-Kawthar' },
    { id: 'p107', type: 'passage', s: 107, de: 1, a: 7, titre: 'Al-Ma’un' },
    { id: 'p106', type: 'passage', s: 106, de: 1, a: 4, titre: 'Quraysh' },
    { id: 'p105', type: 'passage', s: 105, de: 1, a: 5, titre: 'Al-Fil' },
    { id: 'p104', type: 'passage', s: 104, de: 1, a: 9, titre: 'Al-Humaza' },
    { id: 'p103', type: 'passage', s: 103, de: 1, a: 3, titre: 'Al-Asr' },
    { id: 'p2-255', type: 'passage', s: 2, de: 255, a: 255, titre: 'Ayat al-Kursi, le verset du Trône' }
  ],

  /* ---------- Versets du jour (sourate, verset) ---------- */
  versetsDuJour: [
    [94, 5], [13, 28], [2, 152], [2, 153], [65, 3], [93, 3], [3, 139], [20, 46], [29, 69], [40, 60],
    [14, 7], [16, 128], [57, 4], [55, 13], [2, 255], [112, 1], [39, 53], [103, 3], [2, 186]
  ]
};
