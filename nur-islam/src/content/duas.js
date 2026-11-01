// Invocations et adhkar. `ref: [sourate, v1, v2?]` = texte pris directement dans le Coran embarqué (arabe + traduction),
// pour éviter toute faute de copie. Les autres textes viennent des hadiths cités en source.
// Avertissement : pour tout avis de jurisprudence, se référer à un savant qualifié.
export const DUA_CATS = [
  { id: 'apres-priere', t: 'Après la prière', ar: 'أذكار الصلاة', i: '🕌' },
  { id: 'matin-soir', t: 'Matin et soir', ar: 'أذكار الصباح والمساء', i: '🌅' },
  { id: 'sommeil', t: 'Sommeil et réveil', ar: 'النوم والاستيقاظ', i: '🌙' },
  { id: 'quotidien', t: 'Au quotidien', ar: 'أدعية يومية', i: '🏠' },
  { id: 'soulagement', t: 'Épreuves et soulagement', ar: 'الفرج والشفاء', i: '🤲' },
  { id: 'coran', t: 'Invocations du Coran', ar: 'أدعية قرآنية', i: '📖' },
  { id: 'ramadan', t: 'Ramadan et calendrier', ar: 'رمضان', i: '⭐' },
];

export const DUAS = [
  // ── après la prière ──
  { cat: 'apres-priere', ar: 'أَسْتَغْفِرُ اللَّهَ', tr: 'Astaghfirou Allah', fr: 'Je demande pardon à Allah.', count: 3, src: 'Mouslim 591' },
  { cat: 'apres-priere', ar: 'اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ', tr: "Allahoumma anta s-salâm wa minka s-salâm, tabârakta yâ dhal-jalâli wal-ikrâm", fr: "Ô Allah, Tu es la Paix et de Toi vient la paix. Béni sois-Tu, ô Détenteur de la Majesté et de la Munificence.", src: 'Mouslim 591' },
  { cat: 'apres-priere', ref: [2, 255], title: 'Âyat al-Kursî', note: "« Quiconque la récite après chaque prière prescrite, rien ne l'empêche d'entrer au Paradis si ce n'est la mort. »", src: "an-Nasâ'î (‘Amal al-yawm wal-layla) ; jugé authentique par al-Albânî" },
  { cat: 'apres-priere', ref: [112, 1, 4], title: 'Sourate al-Ikhlâs', note: "Le Prophète ﷺ a ordonné de réciter al-Ikhlâs, al-Falaq et an-Nâs après chaque prière.", src: 'Abou Dâwoud 1523 · at-Tirmidhî 2903' },
  { cat: 'apres-priere', ref: [113, 1, 5], title: 'Sourate al-Falaq', src: 'Abou Dâwoud 1523 · at-Tirmidhî 2903' },
  { cat: 'apres-priere', ref: [114, 1, 6], title: 'Sourate an-Nâs', src: 'Abou Dâwoud 1523 · at-Tirmidhî 2903' },
  { cat: 'apres-priere', ar: 'سُبْحَانَ اللَّهِ ‏(٣٣)‏ ، الْحَمْدُ لِلَّهِ ‏(٣٣)‏ ، اللَّهُ أَكْبَرُ ‏(٣٣)‏', tr: "Soubhan Allah (33), Al-hamdou lillah (33), Allahou akbar (33)", fr: "Gloire à Allah (33 fois), louange à Allah (33 fois), Allah est le plus grand (33 fois).", src: 'Mouslim 597', tasbih: 'subhanallah' },
  { cat: 'apres-priere', ar: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ', tr: "La ilaha illa Allahou wahdahou la charika lah, lahou l-moulk wa lahou l-hamd wa houwa 'ala koulli chay'in qadîr", fr: "Il n'y a de divinité digne d'adoration qu'Allah, Seul, sans associé. À Lui la royauté, à Lui la louange, et Il est capable de toute chose.", note: 'Pour compléter le nombre de cent.', src: 'Mouslim 597' },

  // ── matin et soir ──
  { cat: 'matin-soir', ref: [2, 255], title: 'Âyat al-Kursî', note: "Récitée le matin, elle protège jusqu'au soir ; récitée le soir, jusqu'au matin.", src: 'al-Hâkim ; jugé authentique par al-Albânî' },
  { cat: 'matin-soir', ref: [112, 1, 4], title: 'Al-Ikhlâs', count: 3, note: "Avec al-Falaq et an-Nâs, trois fois le matin et le soir : elles « te suffisent pour tout ».", src: 'Abou Dâwoud 5082 · at-Tirmidhî 3575' },
  { cat: 'matin-soir', ref: [113, 1, 5], title: 'Al-Falaq', count: 3, src: 'Abou Dâwoud 5082 · at-Tirmidhî 3575' },
  { cat: 'matin-soir', ref: [114, 1, 6], title: 'An-Nâs', count: 3, src: 'Abou Dâwoud 5082 · at-Tirmidhî 3575' },
  { cat: 'matin-soir', title: 'Sayyid al-istighfâr · le maître des demandes de pardon', ar: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ', tr: "Allahoumma anta rabbî la ilaha illa ant, khalaqtanî wa ana 'abdouk, wa ana 'ala 'ahdika wa wa'dika ma stata't, a'oudhou bika min charri ma sana't, aboû'ou laka bi ni'matika 'alayya wa aboû'ou bi dhanbî faghfir lî fa innahou la yaghfirou dh-dhounouba illa ant", fr: "Ô Allah, Tu es mon Seigneur, il n'y a de divinité que Toi. Tu m'as créé et je suis Ton serviteur ; je me tiens, autant que je le peux, à Ton engagement et à Ta promesse. Je cherche refuge auprès de Toi contre le mal de ce que j'ai commis. Je reconnais Tes bienfaits envers moi et je reconnais mon péché : pardonne-moi, car nul autre que Toi ne pardonne les péchés.", note: "Celui qui la dit avec conviction le jour et meurt avant le soir est des gens du Paradis ; de même pour la nuit.", src: 'Boukhari 6306' },
  { cat: 'matin-soir', ar: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ', tr: "Bismi Llahi lladhî la yaddourrou ma'a smihi chay'oun fî l-ardi wa la fî s-samâ'i wa houwa s-samî'ou l-'alîm", fr: "Au nom d'Allah, avec le nom duquel rien sur terre ni dans le ciel ne peut nuire, et Il est l'Audient, l'Omniscient.", count: 3, src: 'Abou Dâwoud 5088 · at-Tirmidhî 3388' },
  { cat: 'matin-soir', ar: 'رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ نَبِيًّا', tr: "Radîtou bi Llahi rabban, wa bi l-islâmi dînan, wa bi Mouhammadin nabiyyan", fr: "J'agrée Allah comme Seigneur, l'Islam comme religion et Muhammad comme prophète.", count: 3, note: "Quiconque le dit, Allah s'engage à le satisfaire le Jour de la Résurrection.", src: 'Abou Dâwoud 5072 · at-Tirmidhî' },
  { cat: 'matin-soir', ar: 'اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ', tr: "Allahoumma bika asbahnâ, wa bika amsaynâ, wa bika nahyâ, wa bika namoût, wa ilayka n-nouchoûr", fr: "Ô Allah, c'est par Toi que nous entrons dans le matin, par Toi que nous entrons dans le soir, par Toi nous vivons, par Toi nous mourons, et vers Toi est la résurrection.", note: "Version du matin. Le soir, on dit : « bika amsaynâ wa bika asbahnâ… wa ilayka l-masîr » (vers Toi est le retour).", src: 'at-Tirmidhî 3391 (hasan) · Abou Dâwoud 5068' },
  { cat: 'matin-soir', ar: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', tr: "Soubhan Allah wa bihamdih", fr: "Gloire à Allah et louange à Lui.", count: 100, note: "Cent fois le matin et cent fois le soir : nul ne viendra le Jour de la Résurrection avec mieux, sauf qui aura dit autant ou plus.", src: 'Mouslim 2692', tasbih: 'tasbihhamd' },
  { cat: 'matin-soir', ref: [9, 129], title: 'Hasbiya Allah', note: "Verset de confiance en Allah, que beaucoup récitent matin et soir.", src: 'Coran 9:129' },

  // ── sommeil ──
  { cat: 'sommeil', ref: [2, 255], title: 'Âyat al-Kursî avant de dormir', note: "Celui qui la récite en se couchant aura un protecteur de la part d'Allah, et aucun diable ne s'approchera de lui jusqu'au matin.", src: 'Boukhari 2311' },
  { cat: 'sommeil', ref: [2, 285, 286], title: 'Les deux derniers versets d’al-Baqara', note: "« Quiconque les récite la nuit, ils lui suffiront. »", src: 'Boukhari 5009 · Mouslim 807' },
  { cat: 'sommeil', ref: [112, 1, 4], title: 'Al-Ikhlâs, al-Falaq, an-Nâs', note: "Le Prophète ﷺ, chaque nuit au coucher, joignait ses paumes, soufflait dedans en récitant ces trois sourates, puis passait ses mains sur son corps, trois fois.", src: 'Boukhari 5017' },
  { cat: 'sommeil', ar: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا', tr: "Bismika Allahoumma amoûtou wa ahyâ", fr: "C'est en Ton nom, ô Allah, que je meurs et que je vis.", src: 'Boukhari 6324' },
  { cat: 'sommeil', ar: 'سُبْحَانَ اللَّهِ ‏(٣٣)‏ ، الْحَمْدُ لِلَّهِ ‏(٣٣)‏ ، اللَّهُ أَكْبَرُ ‏(٣٤)‏', tr: "Soubhan Allah (33), Al-hamdou lillah (33), Allahou akbar (34)", fr: "Gloire à Allah (33), louange à Allah (33), Allah est le plus grand (34).", note: "Conseillé par le Prophète ﷺ à Fatima et ‘Ali avant de dormir : meilleur pour eux qu'un serviteur.", src: 'Boukhari 3705 · Mouslim 2727', tasbih: 'subhanallah' },
  { cat: 'sommeil', ar: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ', tr: "Al-hamdou li-Llahi lladhî ahyânâ ba'da ma amâtanâ wa ilayhi n-nouchoûr", fr: "Louange à Allah qui nous a rendu la vie après nous avoir fait mourir, et vers Lui est la résurrection.", note: 'Au réveil.', src: 'Boukhari 6312' },

  // ── quotidien ──
  { cat: 'quotidien', ar: 'بِسْمِ اللَّهِ', tr: "Bismi Llah", fr: "Au nom d'Allah.", note: "Avant de manger. Si on oublie : « Bismi Llahi awwalahou wa âkhirah » (بِسْمِ اللَّهِ أَوَّلَهُ وَآخِرَهُ).", src: 'Abou Dâwoud 3767 · at-Tirmidhî 1858' },
  { cat: 'quotidien', ar: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ', tr: "Al-hamdou li-Llahi lladhî at'amanî hâdha wa razaqanîhi min ghayri hawlin minnî wa la qouwwa", fr: "Louange à Allah qui m'a nourri de ceci et me l'a accordé sans force ni puissance de ma part.", note: 'Après le repas : les péchés passés sont pardonnés.', src: 'Abou Dâwoud 4023 · at-Tirmidhî 3458 (hasan)' },
  { cat: 'quotidien', ar: 'بِسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', tr: "Bismi Llah, tawakkaltou 'ala Llah, wa la hawla wa la qouwwata illa bi-Llah", fr: "Au nom d'Allah, je m'en remets à Allah ; il n'y a de force ni de puissance qu'en Allah.", note: "En sortant de la maison : « Tu es guidé, protégé et préservé. »", src: 'Abou Dâwoud 5095 · at-Tirmidhî 3426' },
  { cat: 'quotidien', ar: 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ', tr: "Allahoumma ftah lî abwâba rahmatik", fr: "Ô Allah, ouvre-moi les portes de Ta miséricorde.", note: "En entrant à la mosquée. En sortant : « Allahoumma innî as'alouka min fadlik » (اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ), « Ô Allah, je Te demande de Ta grâce ».", src: 'Mouslim 713' },
  { cat: 'quotidien', ar: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْخُبُثِ وَالْخَبَائِثِ', tr: "Allahoumma innî a'oûdhou bika mina l-khoubouthi wa l-khabâ'ith", fr: "Ô Allah, je cherche refuge auprès de Toi contre les démons mâles et femelles.", note: "En entrant aux toilettes. En sortant : « Ghoufrânak » (غُفْرَانَكَ), « Ton pardon ».", src: 'Boukhari 142 · Mouslim 375 · Abou Dâwoud 30' },
  { cat: 'quotidien', ref: [43, 13, 14], title: 'En voyage', note: "Le Prophète ﷺ la récitait en montant sur sa monture, après avoir dit trois fois « Allahou akbar ».", src: 'Coran 43:13-14 · Mouslim 1342' },
  { cat: 'quotidien', ar: 'اللَّهُمَّ صَيِّبًا نَافِعًا', tr: "Allahoumma sayyiban nâfi'â", fr: "Ô Allah, fais que ce soit une pluie bienfaisante.", note: 'Quand il pleut.', src: 'Boukhari 1032' },
  { cat: 'quotidien', ar: 'الْحَمْدُ لِلَّهِ', tr: "Al-hamdou li-Llah", fr: "Louange à Allah.", note: "Quand on éternue. On lui répond : « Yarhamouka Allah » (يَرْحَمُكَ اللَّهُ), puis il répond : « Yahdîkoumou Llahou wa youslihou bâlakoum » (يَهْدِيكُمُ اللَّهُ وَيُصْلِحُ بَالَكُمْ).", src: 'Boukhari 6224' },
  { cat: 'quotidien', ar: 'السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ', tr: "As-salâmou 'alaykoum wa rahmatou Llahi wa barakâtouh", fr: "Que la paix, la miséricorde d'Allah et Ses bénédictions soient sur vous.", note: 'La plus belle des salutations, à répandre entre les croyants.', src: 'Abou Dâwoud 5195 · at-Tirmidhî 2689' },

  // ── soulagement ──
  { cat: 'soulagement', ar: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ، وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ', tr: "Allahoumma innî a'oûdhou bika mina l-hammi wa l-hazan, wa l-'ajzi wa l-kasal, wa l-boukhli wa l-joubn, wa dala'i d-dayni wa ghalabati r-rijâl", fr: "Ô Allah, je cherche refuge auprès de Toi contre le souci et la tristesse, l'impuissance et la paresse, l'avarice et la lâcheté, le poids des dettes et la domination des hommes.", src: 'Boukhari 6369' },
  { cat: 'soulagement', ref: [21, 87], title: "L'invocation de Yûnus", note: "« Aucun musulman ne l'invoque pour quelque chose sans qu'Allah l'exauce. »", src: 'at-Tirmidhî 3505 ; jugé authentique par al-Albânî' },
  { cat: 'soulagement', ref: [3, 173], title: 'Hasbunallahu wa ni‘ma l-wakîl', note: "Dite par Ibrahim lorsqu'il fut jeté dans le feu, et par Muhammad ﷺ lorsqu'on lui dit : « Les gens se sont rassemblés contre vous ».", src: 'Boukhari 4563' },
  { cat: 'soulagement', ar: 'يَا مُقَلِّبَ الْقُلُوبِ ثَبِّتْ قَلْبِي عَلَى دِينِكَ', tr: "Yâ mouqallibal-qouloûb, thabbit qalbî 'ala dînik", fr: "Ô Celui qui retourne les cœurs, affermis mon cœur dans Ta religion.", note: "Invocation que le Prophète ﷺ répétait souvent.", src: 'at-Tirmidhî 2140 (hasan)' },
  { cat: 'soulagement', ar: 'اللَّهُمَّ رَبَّ النَّاسِ، أَذْهِبِ الْبَأْسَ، اشْفِ أَنْتَ الشَّافِي، لَا شِفَاءَ إِلَّا شِفَاؤُكَ، شِفَاءً لَا يُغَادِرُ سَقَمًا', tr: "Allahoumma rabba n-nâs, adhhibi l-ba's, ichfi anta ch-châfî, la chifâ'a illa chifâ'ouk, chifâ'an la youghâdirou saqamâ", fr: "Ô Allah, Seigneur des hommes, écarte le mal, guéris : Tu es le Guérisseur ; il n'est de guérison que la Tienne, une guérison qui ne laisse aucun mal.", note: "Pour un malade, en passant la main droite sur lui.", src: 'Boukhari 5743 · Mouslim 2191' },

  // ── Coran ──
  { cat: 'coran', ref: [2, 201], title: "La plus fréquente invocation du Prophète ﷺ", src: 'Coran 2:201 · Boukhari 4522' },
  { cat: 'coran', ref: [3, 8], title: 'Fermeté du cœur', src: 'Coran 3:8' },
  { cat: 'coran', ref: [7, 23], title: "L'invocation d'Adam et Hawwa", src: 'Coran 7:23' },
  { cat: 'coran', ref: [14, 40, 41], title: "L'invocation d'Ibrahim", src: 'Coran 14:40-41' },
  { cat: 'coran', ref: [17, 24], title: 'Pour ses parents', src: 'Coran 17:24' },
  { cat: 'coran', ref: [18, 10], title: 'Les gens de la caverne', src: 'Coran 18:10' },
  { cat: 'coran', ref: [20, 25, 28], title: "L'invocation de Moussa", note: "Demande de l'ouverture de la poitrine, de la facilité et de l'éloquence.", src: 'Coran 20:25-28' },
  { cat: 'coran', ref: [20, 114], title: 'Pour la science', src: 'Coran 20:114' },
  { cat: 'coran', ref: [21, 83], title: "L'invocation d'Ayyoub", src: 'Coran 21:83' },
  { cat: 'coran', ref: [25, 74], title: 'Pour sa famille', src: 'Coran 25:74' },
  { cat: 'coran', ref: [28, 24], title: 'Rabbi innî limâ anzalta', note: "Dite par Moussa, fatigué et démuni, à l'ombre d'un arbre à Madyan.", src: 'Coran 28:24' },
  { cat: 'coran', ref: [2, 286], title: "Fin d'al-Baqara", src: 'Coran 2:286' },

  // ── Ramadan & calendrier ──
  { cat: 'ramadan', ar: 'ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الْأَجْرُ إِنْ شَاءَ اللَّهُ', tr: "Dhahaba z-zama'ou wa btallati l-'ourouqou wa thabata l-ajrou in châ'a Llah", fr: "La soif est partie, les veines sont humectées et la récompense est assurée, si Allah le veut.", note: 'À la rupture du jeûne.', src: 'Abou Dâwoud 2357 (hasan)' },
  { cat: 'ramadan', ar: 'اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي', tr: "Allahoumma innaka 'afouwwoun touhibbou l-'afwa fa'fou 'annî", fr: "Ô Allah, Tu es Celui qui efface les fautes et Tu aimes le pardon : pardonne-moi.", note: "‘Â'icha demanda au Prophète ﷺ que dire si elle rencontrait la nuit du Destin : il lui enseigna cette invocation.", src: 'at-Tirmidhî 3513 · Ibn Mâja' },
  { cat: 'ramadan', ar: 'اللَّهُمَّ أَهِلَّهُ عَلَيْنَا بِالْأَمْنِ وَالْإِيمَانِ، وَالسَّلَامَةِ وَالْإِسْلَامِ، رَبِّي وَرَبُّكَ اللَّهُ', tr: "Allahoumma ahillahou 'alaynâ bi l-amni wa l-îmân, wa s-salâmati wa l-islâm, rabbî wa rabbouka Llah", fr: "Ô Allah, fais apparaître cette lune pour nous avec sécurité et foi, paix et soumission. Mon Seigneur et ton Seigneur est Allah.", note: "À la vue du nouveau croissant.", src: 'at-Tirmidhî 3451 (hasan)' },
];
