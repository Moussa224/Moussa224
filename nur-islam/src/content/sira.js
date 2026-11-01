// Frise de la vie du Prophète ﷺ. Dates approximatives (calendrier grégorien), selon les repères les plus répandus.
export const SIRA = [
  { y: 'vers 570', h: "Année de l'Éléphant", t: 'Naissance à La Mecque', d: "Muhammad naît orphelin de père : ‘Abdullah est mort avant sa naissance. Sa mère est Âmina bint Wahb, de la tribu des Quraysh (clan des Banû Hâchim). Sa naissance est traditionnellement placée un lundi de Rabi‘ al-awwal, le plus souvent le 12.", sym: '🌟' },
  { y: 'vers 576–578', h: '', t: 'Enfance auprès de ses proches', d: "Il perd sa mère à six ans, puis son grand-père ‘Abd al-Muttalib à huit ans. Son oncle Abû Tâlib le prend en charge. Il est connu pour sa droiture ; on l'appelle « al-Amîn », le digne de confiance.", sym: '🤲' },
  { y: 'vers 595', h: '', t: 'Mariage avec Khadîja', d: "À 25 ans, il épouse Khadîja bint Khuwaylid, commerçante dont il avait conduit une caravane. Elle sera son soutien le plus constant ; elle est la première à croire en lui.", sym: '💍' },
  { y: 'vers 605', h: '', t: 'Reconstruction de la Kaaba', d: "Les Quraysh restaurent la Kaaba. Un différend éclate sur celui qui replacera la Pierre noire ; Muhammad propose de la poser sur un manteau tenu par les chefs de chaque clan : la querelle est apaisée.", sym: '🕋' },
  { y: '610', h: 'Ramadan', t: 'Première révélation', d: "Dans la grotte de Hirâ', l'ange Jibrîl lui apporte les premiers versets : « Lis, au nom de ton Seigneur qui a créé » (96:1-5). Khadîja, Abû Bakr, ‘Alî et Zayd comptent parmi les premiers croyants.", sym: '📖' },
  { y: 'vers 613', h: '', t: "L'appel public", d: "Après trois années d'appel discret, il monte sur la colline d'as-Safâ et appelle les Quraysh à adorer Allah seul. La persécution des croyants commence, surtout des plus faibles.", sym: '📣' },
  { y: '615', h: '', t: "Émigration en Abyssinie", d: "Un groupe de musulmans fuit la persécution vers l'Abyssinie, où règne un roi chrétien juste, le Négus, qui les protège.", sym: '⛵' },
  { y: 'vers 616–619', h: '', t: 'Le boycott', d: "Les Quraysh imposent un boycott aux Banû Hâchim et aux musulmans, confinés dans un ravin pendant près de trois ans, dans une grande privation.", sym: '⛰️' },
  { y: '619', h: "Année de la tristesse", t: 'Mort de Khadîja et d\'Abû Tâlib', d: "Il perd son épouse et son oncle protecteur à peu d'intervalle. Il se rend à Tâ'if pour appeler à l'Islam : il est repoussé et blessé, mais refuse la vengeance.", sym: '🕊️' },
  { y: 'vers 620–621', h: '', t: "Al-Isrâ' et al-Mi‘râj", d: "Voyage nocturne de la Mosquée sacrée à la Mosquée al-Aqsâ (17:1), puis élévation à travers les cieux. C'est à cette occasion que les cinq prières quotidiennes sont prescrites.", sym: '✨' },
  { y: '621–622', h: '', t: "Les serments d'al-‘Aqaba", d: "Des gens de Yathrib (la future Médine) lui prêtent serment et l'invitent à venir chez eux pour y mettre fin aux guerres tribales.", sym: '🤝' },
  { y: '622', h: '1 de l\'Hégire', t: 'L\'Hégire (hijra) vers Médine', d: "Il émigre à Médine avec Abû Bakr, après trois jours dans la grotte de Thawr. Il bâtit la mosquée, établit la fraternité entre Mouhâjirîn et Ansâr et une charte de coexistence. Cette année marque le début du calendrier hégirien, fixé plus tard par ‘Omar.", sym: '🌙' },
  { y: '624', h: '2 H', t: 'Changement de qibla et bataille de Badr', d: "La direction de la prière est tournée de Jérusalem vers la Kaaba (2:144). Le 17 Ramadan, environ 313 musulmans remportent la bataille de Badr contre une armée bien plus nombreuse.", sym: '⚔️' },
  { y: '625', h: '3 H', t: 'Bataille d\'Uhud', d: "Les Quraysh reviennent. Une partie des archers quitte sa position et la bataille se retourne ; le Prophète ﷺ est blessé. Le Coran en tire des leçons d'obéissance et de patience (3:121-179).", sym: '🏔️' },
  { y: '627', h: '5 H', t: 'La Tranchée (al-Khandaq)', d: "Une coalition assiège Médine. Sur le conseil de Salmân, les musulmans creusent une tranchée. Après un siège éprouvant, la coalition se disperse.", sym: '🛡️' },
  { y: '628', h: '6 H', t: 'Le traité de Hudaybiyya', d: "Parti pour la ‘umra, le Prophète ﷺ est arrêté près de La Mecque. Un traité de trêve de dix ans est conclu, qui paraît d'abord défavorable. Le Coran l'appelle « une victoire éclatante » (48:1).", sym: '📜' },
  { y: '630', h: '8 H', t: 'Ouverture de La Mecque', d: "Après la rupture de la trêve, il entre à La Mecque avec dix mille hommes, presque sans combat. Il purifie la Kaaba des idoles et pardonne à ses anciens adversaires.", sym: '🕋' },
  { y: '631', h: '9 H', t: 'Tabouk et l\'année des délégations', d: "Expédition de Tabouk au nord. Des délégations de toute l'Arabie viennent embrasser l'Islam.", sym: '🐪' },
  { y: '632', h: '10 H', t: "Le pèlerinage d'adieu", d: "Au mont ‘Arafât, devant des dizaines de milliers de pèlerins, il prononce son sermon d'adieu : sacralité de la vie et des biens, interdiction de l'usure, droits des épouses, et il recommande de s'attacher au Livre d'Allah. Le verset « Aujourd'hui, J'ai parachevé pour vous votre religion » (5:3) est révélé.", sym: '⛰️' },
  { y: '632', h: '11 H', t: 'Son décès à Médine', d: "Il meurt à Médine, à environ 63 ans, dans la chambre de ‘Â'icha. ‘Omar est bouleversé ; Abû Bakr dit alors : « Que celui qui adorait Muhammad sache que Muhammad est mort ; quant à celui qui adore Allah, Allah est Vivant et ne meurt pas. » (Boukhari 3668)", sym: '🌹' },
];

export const CALIPHS = [
  { n: 'Abû Bakr as-Siddîq', y: '11–13 H · 632–634' },
  { n: 'Omar ibn al-Khattâb', y: '13–23 H · 634–644' },
  { n: 'Outhmân ibn ‘Affân', y: '23–35 H · 644–656' },
  { n: 'Alî ibn Abî Tâlib', y: '35–40 H · 656–661' },
];
