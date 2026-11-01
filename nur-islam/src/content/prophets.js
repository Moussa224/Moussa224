// Récits des prophètes cités dans le Coran. Chaque récit s'appuie sur des références coraniques (sourate:verset) ;
// les détails non établis par le Coran ou des hadiths authentiques ne sont pas rapportés.
// Que la paix soit sur eux tous.
export const PROPHETS = [
  {
    id: 'adam', n: 'Adam', ar: 'آدم', sym: '🌱', epithet: "Le père de l'humanité", peuple: "Premier homme",
    story: [
      `Allah annonça aux anges qu'Il établirait un successeur (khalîfa) sur terre (2:30). Il créa Adam d'argile, lui insuffla de Son esprit et lui enseigna les noms de toutes choses, ce qui fit apparaître l'excellence de sa science (2:31-33). Les anges se prosternèrent devant Adam sur ordre d'Allah, sauf Iblîs, que l'orgueil retint : « Je suis meilleur que lui : Tu m'as créé de feu et Tu l'as créé d'argile » (7:12).`,
      `Adam et son épouse furent installés au Paradis, avec la permission d'y goûter à volonté, sauf à un arbre. Iblîs les tenta et ils en mangèrent (7:19-22). Conscients de leur faute, ils dirent : « Seigneur, nous nous sommes fait du tort à nous-mêmes ; si Tu ne nous pardonnes pas et ne nous fais pas miséricorde, nous serons parmi les perdants » (7:23). Allah accepta leur repentir et les envoya sur terre, avec la promesse de Sa guidée (2:37-38).`,
    ],
    lessons: ["Le repentir sincère est toujours accepté.", "L'orgueil a causé la chute d'Iblîs ; l'humilité a relevé Adam.", "L'être humain est honoré par la science et la responsabilité."],
    refs: ['2:30-39', '7:11-25', '20:115-123', '38:71-85'],
  },
  {
    id: 'idris', n: 'Idrîs', ar: 'إدريس', sym: '✒️', epithet: 'Le véridique', peuple: 'Époque ancienne',
    story: [
      `Idrîs est mentionné brièvement : « Mentionne dans le Livre Idrîs. C'était un véridique (siddîq) et un prophète. Et Nous l'élevâmes à un rang élevé » (19:56-57). Il est aussi cité parmi les patients (21:85).`,
      `Le Coran ne donne pas davantage de détails sur sa vie. Les récits qui circulent à son sujet ne reposent sur aucune source sûre : nous nous en tenons à ce que dit le Livre.`,
    ],
    lessons: ['La véracité et la patience élèvent le rang.', "S'en tenir au texte sûr plutôt qu'à des récits non établis."],
    refs: ['19:56-57', '21:85-86'],
  },
  {
    id: 'nuh', n: 'Noûh', ar: 'نوح', sym: '⛵', epithet: "Le constructeur de l'arche", peuple: 'Son peuple',
    story: [
      `Noûh appela son peuple à n'adorer qu'Allah pendant « mille ans moins cinquante ans » (29:14). Les notables se moquèrent de lui et le traitèrent d'égaré ; peu le suivirent. Il appelait de nuit et de jour, en secret et publiquement (71:5-9), mais ils se bouchaient les oreilles par orgueil.`,
      `Allah lui ordonna de construire l'arche. Quand l'ordre vint et que « le four bouillonna » (11:40), il y fit monter une paire de chaque espèce, ainsi que les croyants. Son fils refusa d'embarquer, disant qu'il se réfugierait sur une montagne ; les vagues les séparèrent et il fut englouti (11:42-43). Puis l'eau fut absorbée et l'arche se posa sur le mont Joûdî (11:44).`,
    ],
    lessons: ["La constance dans l'appel malgré le rejet.", "Le lien de la foi prime sur le lien du sang.", "Le salut est dans la soumission à l'ordre d'Allah."],
    refs: ['11:25-49', '23:23-30', '29:14-15', '54:9-17', '71:1-28'],
  },
  {
    id: 'hud', n: 'Hoûd', ar: 'هود', sym: '🌪️', epithet: 'Envoyé aux ‘Âd', peuple: '‘Âd',
    story: [
      `Hoûd fut envoyé aux ‘Âd, un peuple puissant qui bâtissait de hautes demeures et se croyait sans égal (89:6-8 ; 26:128-130). Il les appela à n'adorer qu'Allah et à cesser leur orgueil et leur tyrannie. Ils répondirent : « Es-tu venu pour que nous adorions Allah seul et abandonnions ce qu'adoraient nos pères ? » (7:70).`,
      `Allah les châtia par un vent glacial et violent, qui souffla sept nuits et huit jours et les laissa comme des troncs de palmiers creux (69:6-7). Hoûd et les croyants furent sauvés par miséricorde (11:58).`,
    ],
    lessons: ["La force matérielle ne protège pas de l'orgueil et de l'injustice.", 'Les bienfaits sont une épreuve : il faut remercier.'],
    refs: ['7:65-72', '11:50-60', '26:123-140', '46:21-26', '69:6-8'],
  },
  {
    id: 'salih', n: 'Sâlih', ar: 'صالح', sym: '🐪', epithet: 'Le prophète de la chamelle', peuple: 'Thamoûd',
    story: [
      `Sâlih fut envoyé aux Thamoûd, qui taillaient des demeures dans les montagnes (7:74 ; 26:149). Ils lui demandèrent un signe : Allah fit sortir pour eux une chamelle, avec la règle de se partager l'eau : un jour pour elle, un jour pour eux (26:155). Sâlih les avertit : « Ne lui faites aucun mal, sinon un châtiment douloureux vous saisira » (7:73).`,
      `Mais ils la tuèrent. Il leur annonça un délai de trois jours (11:65), puis un cri terrible les saisit : ils se retrouvèrent au matin gisant dans leurs demeures (11:67). Sâlih et les croyants furent sauvés (11:66).`,
    ],
    lessons: ["Les signes d'Allah doivent être respectés.", "Le partage équitable des ressources est une responsabilité."],
    refs: ['7:73-79', '11:61-68', '26:141-159', '54:23-31', '91:11-15'],
  },
  {
    id: 'ibrahim', n: 'Ibrâhîm', ar: 'إبراهيم', sym: '🔥', epithet: "L'ami intime d'Allah (Khalîl)", peuple: 'Mésopotamie · Palestine · La Mecque',
    story: [
      `Ibrâhîm, « l'ami intime d'Allah » (4:125), chercha la vérité en observant les astres : devant l'étoile, la lune puis le soleil qui disparaissent, il déclara : « Je n'aime pas ce qui disparaît » et se tourna vers Celui qui a créé les cieux et la terre (6:75-79). Il appela son père et son peuple à abandonner les idoles ; un jour il les brisa, laissant la plus grande. Le peuple le fit jeter dans un grand feu, mais Allah ordonna : « Ô feu, sois fraîcheur et paix pour Ibrâhîm ! » (21:51-70).`,
      `Il émigra, puis Allah lui accorda Ismâ‘îl, puis Ishâq. Il fut éprouvé par l'ordre de sacrifier son fils : lorsque tous deux se soumirent, Allah le racheta par un grand sacrifice (37:99-111). Avec Ismâ‘îl, il éleva les fondations de la Maison sacrée en invoquant : « Notre Seigneur, accepte cela de notre part » (2:125-129 ; 14:35-41).`,
    ],
    lessons: ["La réflexion et l'observation conduisent à l'Unicité.", "La confiance totale en Allah dans l'épreuve.", "Sa soumission est à l'origine du Hajj et de l'Aïd al-Adha."],
    refs: ['2:124-135', '6:74-83', '14:35-41', '19:41-50', '21:51-73', '37:83-113'],
  },
  {
    id: 'lut', n: 'Loût', ar: 'لوط', sym: '🏜️', epithet: 'Le neveu d\'Ibrâhîm', peuple: 'Sodome (région de la mer Morte)',
    story: [
      `Loût fut envoyé à un peuple qui commettait un acte abominable que nul avant eux n'avait commis, et qui coupait aussi les routes (7:80-81 ; 29:28-29). Il les exhorta en vain : ils voulurent l'expulser, lui et ses proches, « parce que ce sont des gens qui se tiennent purs » (7:82).`,
      `Les anges, venus chez Ibrâhîm puis chez Loût, annoncèrent la destruction : Loût et sa famille furent sauvés, sauf son épouse, qui resta parmi les condamnés (7:83 ; 11:81). Une pluie de pierres s'abattit sur la cité (11:82).`,
    ],
    lessons: ['Dire la vérité même quand on est seul.', "L'appartenance familiale ne sauve pas sans la foi."],
    refs: ['7:80-84', '11:77-83', '15:57-77', '26:160-175', '27:54-58'],
  },
  {
    id: 'ismail', n: 'Ismâ‘îl', ar: 'إسماعيل', sym: '🕋', epithet: 'Véridique dans sa promesse', peuple: 'La Mecque',
    story: [
      `Ismâ‘îl est le fils d'Ibrâhîm et de Hâjar. Allah le décrit comme « véridique dans sa promesse », messager et prophète, qui ordonnait à sa famille la prière et la zakât (19:54-55). Avec son père, il releva les murs de la Kaaba (2:127). Face à l'épreuve du sacrifice, il répondit : « Ô mon père, fais ce qui t'est ordonné ; tu me trouveras, si Allah le veut, parmi les endurants » (37:102).`,
      `Un hadith rapporté par Boukhari (3364) raconte que Hâjar, laissée avec l'enfant dans la vallée de La Mecque, courut entre as-Safâ et al-Marwa en cherchant de l'eau, et que la source de Zamzam jaillit : d'où le rite du sa‘y.`,
    ],
    lessons: ['Tenir sa parole.', 'La patience et la confiance en Allah sont récompensées.', "Le sa‘y rappelle l'effort et la foi de Hâjar."],
    refs: ['2:125-129', '14:37', '19:54-55', '21:85', '37:100-111'],
  },
  {
    id: 'ishaq', n: 'Ishâq', ar: 'إسحاق', sym: '🌟', epithet: 'La bonne nouvelle', peuple: 'Palestine',
    story: [
      `Ishâq est le fils d'Ibrâhîm et de Sâra. Des anges annoncèrent à Ibrâhîm sa naissance alors que son épouse était âgée : elle s'étonna, et ils répondirent : « T'étonnes-tu du décret d'Allah ? » (11:71-73 ; 51:28-30). Allah dit : « Nous lui annonçâmes Ishâq, prophète, parmi les gens de bien » (37:112) et lui accorda Ya‘qoûb comme descendant (11:71).`,
      `Par sa lignée vinrent de nombreux prophètes parmi les Banû Isrâ'îl.`,
    ],
    lessons: ["Rien n'est impossible à Allah.", 'La bénédiction de la descendance.'],
    refs: ['11:69-73', '15:51-56', '37:112-113', '51:24-30'],
  },
  {
    id: 'yaqub', n: 'Ya‘qoûb', ar: 'يعقوب', sym: '🌙', epithet: 'La belle patience', peuple: 'Palestine',
    story: [
      `Ya‘qoûb (Israël) est le fils d'Ishâq et le père de douze fils. À l'approche de sa mort, il recommanda à ses enfants de n'adorer qu'Allah (2:132-133). Son épreuve la plus célèbre est la perte de Yoûsouf : lorsque les frères revinrent avec la chemise tachée de faux sang, il dit : « C'est plutôt vos âmes qui ont embelli quelque chose pour vous : patience belle ! (sabrun jamîl) » (12:18).`,
      `Même quand son autre fils lui fut retenu, il dit : « Je ne me plains de ma détresse et de ma peine qu'à Allah » (12:86). Ses yeux blanchirent de tristesse (12:84), sans qu'il perde l'espoir : « Allez, et enquérez-vous de Yoûsouf et de son frère, et ne désespérez pas de la miséricorde d'Allah » (12:87). Il retrouva la vue lorsque la chemise de Yoûsouf fut posée sur son visage (12:96).`,
    ],
    lessons: ['La belle patience, sans plainte aux créatures.', "Ne jamais désespérer de la miséricorde d'Allah."],
    refs: ['2:132-133', '12:4-6', '12:83-87', '12:93-101'],
  },
  {
    id: 'yusuf', n: 'Yoûsouf', ar: 'يوسف', sym: '👑', epithet: 'Le plus beau des récits', peuple: 'Palestine · Égypte',
    story: [
      `Dans la sourate qui porte son nom, Allah raconte « le plus beau des récits » (12:3). Enfant, Yoûsouf rêva de onze étoiles, du soleil et de la lune qui se prosternaient devant lui ; son père lui conseilla de ne pas le dire à ses frères (12:4-5). Jaloux, ceux-ci le jetèrent dans un puits, puis vinrent en pleurant avec une histoire de loup (12:15-18). Des voyageurs le recueillirent et le vendirent en Égypte.`,
      `Dans la maison de son maître, il fut tenté par l'épouse de celui-ci ; il résista en disant : « Que je me réfugie auprès d'Allah ! » (12:23) et fut injustement emprisonné (12:35). En prison, il interpréta des songes, puis celui du roi (sept vaches grasses et sept maigres), ce qui lui valut d'être mis à la tête des réserves du pays (12:43-56).`,
      `Quand ses frères vinrent le trouver, il les reconnut et leur pardonna : « Pas de reproche contre vous aujourd'hui. Qu'Allah vous pardonne ! » (12:92). Le rêve de son enfance s'accomplit, et il invoqua : « Fais-moi mourir en soumission et rejoindre les gens de bien » (12:101).`,
    ],
    lessons: ['Résister à la tentation par la crainte d\'Allah.', 'Le pardon dans la puissance.', 'Allah accomplit Son dessein à travers les épreuves : patience et confiance.'],
    refs: ['12:1-101'],
  },
  {
    id: 'ayyub', n: 'Ayyoûb', ar: 'أيوب', sym: '🌿', epithet: 'Le patient', peuple: 'Moyen-Orient',
    story: [
      `Ayyoûb fut éprouvé dans son corps, ses biens et sa famille, mais demeura patient. Il invoqua son Seigneur : « Le mal m'a touché, et Tu es le plus miséricordieux des miséricordieux » (21:83). Allah répondit : « Frappe le sol de ton pied : voici une eau fraîche pour te laver et pour boire » (38:42), le guérit, lui rendit sa famille et autant avec eux, par miséricorde (21:84).`,
      `Le Coran conclut : « Nous l'avons trouvé patient. Quel excellent serviteur ! Il était repentant » (38:44).`,
    ],
    lessons: ['La patience sans plainte contre Allah, mais avec invocation.', "Après l'épreuve vient la guérison."],
    refs: ['4:163', '6:84', '21:83-84', '38:41-44'],
  },
  {
    id: 'shuayb', n: 'Chou‘ayb', ar: 'شعيب', sym: '⚖️', epithet: 'Le prédicateur de la juste mesure', peuple: 'Madyan',
    story: [
      `Chou‘ayb fut envoyé aux gens de Madyan, qui trichaient sur les mesures et les poids et semaient la corruption. Il leur dit : « Donnez la pleine mesure et le juste poids ; ne lésez pas les gens dans leurs biens ; et ne semez pas la corruption sur terre après sa réforme » (7:85). Il leur parlait avec douceur : « Je ne veux que la réforme autant que je le peux » (11:88).`,
      `Ils menacèrent de l'expulser, lui et les croyants. Un tremblement de terre les saisit et ils se retrouvèrent gisant dans leurs demeures (7:91 ; 11:94). C'est à Madyan que Moûsâ séjourna ; beaucoup de savants identifient le vieil homme qui l'accueillit à Chou‘ayb (28:22-28), mais cela reste une opinion et non un fait établi.`,
    ],
    lessons: ["L'honnêteté dans les affaires est un acte d'adoration.", "La tricherie et l'injustice économique mènent à la ruine."],
    refs: ['7:85-93', '11:84-95', '26:176-191', '29:36-37'],
  },
  {
    id: 'musa', n: 'Moûsâ', ar: 'موسى', sym: '🌊', epithet: 'Celui à qui Allah a parlé (Kalîmoullah)', peuple: 'Banû Isrâ\'îl · Égypte · Sinaï',
    story: [
      `Moûsâ est le prophète le plus cité dans le Coran. Il naquit à une époque où Pharaon tuait les nouveau-nés des Banû Isrâ'îl. Par inspiration d'Allah, sa mère le plaça dans un coffre qu'elle jeta au fleuve (20:38-39 ; 28:7) ; il fut recueilli dans le palais de Pharaon et rendu à sa mère (28:8-13). Devenu homme, il frappa un Égyptien, qui mourut sans qu'il l'ait voulu ; il fuit vers Madyan (28:15-22) et y resta des années.`,
      `Sur le chemin du retour, il vit un feu ; Allah l'appela près de la vallée sacrée de Touwâ : « Je suis ton Seigneur » (20:11-12). Il reçut le bâton qui devint serpent et la main blanche (20:17-22), et l'ordre d'aller vers Pharaon avec son frère Hâroûn (20:24, 43-44). Les magiciens de Pharaon, vaincus, se prosternèrent (20:70). Moûsâ conduisit son peuple de nuit ; devant la mer, Allah lui ordonna de la frapper de son bâton, elle se fendit, et Pharaon fut englouti (26:60-66 ; 20:77-78).`,
      `Pendant que Moûsâ était au mont pour recevoir la Torah, son peuple se mit à adorer le veau d'or (20:83-98). Le Coran relate aussi son voyage avec un serviteur d'Allah doté d'une science particulière, qui lui enseigna la patience face à des événements dont la sagesse n'apparaissait pas (18:60-82).`,
    ],
    lessons: ["Allah protège Ses serviteurs de la façon la plus inattendue.", 'Face au tyran : parler avec douceur, mais avec fermeté.', "La patience devant ce dont on ignore la sagesse."],
    refs: ['7:103-157', '18:60-82', '20:9-98', '26:10-68', '28:3-43'],
  },
  {
    id: 'harun', n: 'Hâroûn', ar: 'هارون', sym: '🤝', epithet: 'Le soutien de Moûsâ', peuple: 'Banû Isrâ\'îl',
    story: [
      `Hâroûn, frère de Moûsâ, fut choisi comme assistant : Moûsâ demanda à Allah « un ministre de ma famille, Hâroûn, mon frère ; fortifie par lui mon dos et associe-le à mon affaire » (20:29-32). Allah dit : « Ta demande est exaucée, ô Moûsâ ! » (20:36). Hâroûn était plus éloquent que son frère (28:34).`,
      `Pendant l'absence de Moûsâ, le peuple fabriqua le veau d'or ; Hâroûn les avertit : « Ô mon peuple, vous êtes éprouvés par cela ; votre Seigneur est le Tout Miséricordieux » (20:90). Moûsâ, à son retour, le saisit par la tête dans sa colère ; Hâroûn lui expliqua qu'il avait craint la division du peuple (20:92-94 ; 7:150).`,
    ],
    lessons: ["Le soutien d'un frère est un don d'Allah.", "Préserver l'unité tout en prévenant du mal."],
    refs: ['19:53', '20:29-36', '20:90-94', '28:34-35'],
  },
  {
    id: 'dhulkifl', n: 'Dhoul-Kifl', ar: 'ذو الكفل', sym: '⏳', epithet: 'Parmi les patients', peuple: 'Époque ancienne',
    story: [
      `Dhoul-Kifl est cité par son nom à deux reprises : parmi ceux qui sont patients (21:85-86) et parmi « les meilleurs » (38:48). Le Coran ne dit rien de plus sur sa vie, et les détails qui circulent à son sujet ne sont pas établis.`,
      `Retenons ce que dit le Livre : il était patient et parmi les justes.`,
    ],
    lessons: ["La patience est un titre d'honneur.", "Le silence du texte invite à ne pas ajouter de récits non établis."],
    refs: ['21:85-86', '38:48'],
  },
  {
    id: 'dawud', n: 'Dâwoûd', ar: 'داود', sym: '🎶', epithet: 'Roi, prophète et artisan', peuple: 'Banû Isrâ\'îl',
    story: [
      `Dâwoûd, jeune guerrier de l'armée de Tâloût, tua Jâloût (Goliath), et Allah lui donna la royauté et la sagesse (2:251). Il reçut le Zaboûr (4:163 ; 17:55). Allah lui soumit les montagnes et les oiseaux, qui glorifiaient avec lui (38:18-19 ; 21:79), et rendit le fer malléable pour qu'il fabrique des cottes de mailles (34:10-11). L'ordre lui fut donné : « Œuvrez avec reconnaissance » (34:13) ; il vivait du travail de ses mains.`,
      `Le Coran évoque aussi le jugement entre deux plaideurs qui escaladèrent son oratoire : Dâwoûd comprit qu'il était mis à l'épreuve, demanda pardon, se prosterna et se repentit, et Allah lui pardonna (38:21-25).`,
    ],
    lessons: ["Travailler de ses mains est honorable, même pour un roi.", "Le repentir immédiat après l'erreur."],
    refs: ['2:251', '21:78-80', '34:10-13', '38:17-26'],
  },
  {
    id: 'sulayman', n: 'Soulaymân', ar: 'سليمان', sym: '🐦', epithet: 'Le roi reconnaissant', peuple: 'Banû Isrâ\'îl · Jérusalem',
    story: [
      `Soulaymân hérita de Dâwoûd (27:16). Allah lui soumit le vent et les djinns et lui apprit le langage des oiseaux (27:16-17 ; 34:12-13). Il comprit les paroles d'une fourmi qui avertissait ses semblables, sourit et dit : « Seigneur, inspire-moi de remercier Ton bienfait » (27:18-19). Il s'inquiéta de l'absence de la huppe, qui revint avec des nouvelles du royaume de Saba, dont la reine et son peuple adoraient le soleil (27:20-24).`,
      `Soulaymân lui écrivit ; la reine, après réflexion, vint à lui. Devant son trône apporté en un clin d'œil, il dit : « Cela est de la grâce de mon Seigneur, pour m'éprouver : serai-je reconnaissant ou ingrat ? » (27:40). La reine se soumit à Allah, Seigneur des mondes (27:44).`,
    ],
    lessons: ["Plus on a de pouvoir, plus on doit être reconnaissant et humble.", "La sagesse consiste à écouter même les plus petits."],
    refs: ['21:78-82', '27:15-44', '34:12-14', '38:30-40'],
  },
  {
    id: 'ilyas', n: 'Ilyâs', ar: 'إلياس', sym: '☁️', epithet: 'Envoyé à ceux qui invoquaient Ba‘l', peuple: 'Son peuple',
    story: [
      `Ilyâs fit partie des messagers (37:123). Il dit à son peuple : « Ne craignez-vous pas Allah ? Invoquez-vous Ba‘l et délaissez-vous le meilleur des créateurs, Allah, votre Seigneur et le Seigneur de vos premiers ancêtres ? » (37:124-126). Ils le traitèrent de menteur, à l'exception des serviteurs sincères d'Allah (37:127-128).`,
      `Allah dit : « Paix sur Ilyâsîn ! » (37:130) et le cite parmi les gens de bien (6:85).`,
    ],
    lessons: ["Appeler à l'Unicité malgré l'attachement aux idoles.", "La salutation d'Allah est la plus belle récompense."],
    refs: ['6:85', '37:123-132'],
  },
  {
    id: 'alyasa', n: 'Al-Yasa‘', ar: 'اليسع', sym: '🌾', epithet: 'Parmi les meilleurs', peuple: 'Époque ancienne',
    story: [
      `Al-Yasa‘ est cité dans deux listes de prophètes : parmi ceux qu'Allah a préférés au-dessus des mondes (6:86) et parmi les meilleurs (38:48). Le Coran ne rapporte pas son histoire détaillée ; retenons l'éloge qu'Allah lui adresse.`,
    ],
    lessons: ["Beaucoup de serviteurs d'Allah sont honorés sans qu'on connaisse leur histoire."],
    refs: ['6:86', '38:48'],
  },
  {
    id: 'yunus', n: 'Yoûnous', ar: 'يونس', sym: '🐋', epithet: "Dhoun-Noûn, l'homme au poisson", peuple: 'Ninive',
    story: [
      `Yoûnous fut envoyé aux gens de Ninive. Voyant que son peuple persistait, il partit en colère sans attendre l'ordre d'Allah (21:87 ; 37:139-140). Embarqué sur un navire, le sort le désigna et il fut jeté à la mer : un grand poisson l'avala (37:141-142).`,
      `Dans les ténèbres, il invoqua : « Il n'y a de divinité que Toi ! Gloire à Toi ! J'étais du nombre des injustes ! » (21:87). Allah l'exauça et le sauva de l'angoisse (21:88), le déposa sur la rive, malade, et fit pousser sur lui une plante (37:145-146). Son peuple, entre-temps, avait cru, et Allah les fit jouir de la vie pour un temps (10:98 ; 37:147-148).`,
    ],
    lessons: ["Reconnaître sa faute et invoquer Allah, même dans les plus grandes ténèbres.", "Ne pas désespérer d'un peuple, et ne pas se précipiter."],
    refs: ['10:98', '21:87-88', '37:139-148', '68:48-50'],
  },
  {
    id: 'zakariyya', n: 'Zakariyyâ', ar: 'زكريا', sym: '🤲', epithet: "L'invocation dans le secret", peuple: 'Jérusalem',
    story: [
      `Zakariyyâ était âgé et son épouse stérile. Voyant la place de Maryam, dont il avait la charge et auprès de qui il trouvait des provisions inattendues (3:37), il invoqua Allah en secret : « Seigneur, mes os se sont affaiblis… accorde-moi de Ta part un héritier » (19:2-6 ; 3:38). Les anges l'appelèrent pendant qu'il priait dans le sanctuaire : « Allah t'annonce Yahyâ » (3:39).`,
      `Comme signe, il ne put parler aux gens pendant trois jours, sauf par gestes, et devait glorifier Allah matin et soir (3:41 ; 19:10-11).`,
    ],
    lessons: ["Invoquer Allah avec certitude, malgré les apparences.", "L'invocation à voix basse, dans le secret."],
    refs: ['3:37-41', '19:2-11', '21:89-90'],
  },
  {
    id: 'yahya', n: 'Yahyâ', ar: 'يحيى', sym: '🕊️', epithet: 'La sagesse dès l\'enfance', peuple: 'Jérusalem',
    story: [
      `Yahyâ naquit en réponse à l'invocation de son père Zakariyyâ. Allah dit : « Ô Yahyâ, tiens fermement le Livre ! » et lui donna la sagesse dès l'enfance, la tendresse, la pureté et la piété (19:12-13). Il était bon envers ses parents, ni violent ni rebelle (19:14). Allah le décrit comme « noble, chaste, prophète parmi les gens de bien » (3:39).`,
      `« Paix sur lui le jour de sa naissance, le jour de sa mort et le jour où il sera ressuscité » (19:15).`,
    ],
    lessons: ["La piété filiale, fondement de la bonne éducation.", "La sagesse n'a pas d'âge."],
    refs: ['3:39', '19:12-15', '21:90'],
  },
  {
    id: 'isa', n: '‘Îsâ', ar: 'عيسى', sym: '🌿', epithet: 'Fils de Maryam, Parole d\'Allah', peuple: 'Banû Isrâ\'îl',
    story: [
      `‘Îsâ, fils de Maryam, est un messager d'Allah, Sa parole qu'Il a déposée en Maryam, et un esprit venu de Lui (4:171). Sa mère Maryam fut choisie « au-dessus des femmes de l'univers » (3:42). Les anges lui annoncèrent la naissance d'un fils sans père, car Allah crée ce qu'Il veut (3:45-47 ; 19:16-21). Nouveau-né, il parla dans le berceau pour défendre sa mère : « Je suis le serviteur d'Allah ; Il m'a donné le Livre et m'a fait prophète » (19:29-30).`,
      `Avec la permission d'Allah, il guérissait l'aveugle-né et le lépreux, ressuscitait les morts et façonnait un oiseau d'argile auquel il insufflait la vie (3:49 ; 5:110). Les apôtres crurent en lui : « Nous sommes les alliés d'Allah ; sois témoin que nous sommes soumis » (3:52). Le Coran enseigne qu'on ne l'a ni tué ni crucifié, mais qu'Allah l'a élevé vers Lui (4:157-158). Il n'a jamais dit aux gens de l'adorer (5:116-117). Il annonça la venue d'un messager après lui, nommé Ahmad (61:6).`,
    ],
    lessons: ["La naissance miraculeuse rappelle que la création relève de la seule volonté d'Allah.", "Ni divinisation ni dénigrement : un serviteur et messager honoré.", 'La pureté et la dévotion de Maryam.'],
    refs: ['3:42-55', '4:157-159', '4:171', '5:110-118', '19:16-36', '61:6'],
  },
  {
    id: 'muhammad', n: 'Muhammad ﷺ', ar: 'محمد', sym: '☪️', epithet: 'Le sceau des prophètes, miséricorde pour les mondes', peuple: 'La Mecque · Médine',
    story: [
      `Muhammad ﷺ est le dernier des prophètes (33:40), envoyé comme « miséricorde pour les mondes » (21:107), doté d'un caractère sublime (68:4). Il reçut la première révélation dans la grotte de Hirâ' : « Lis, au nom de ton Seigneur qui a créé » (96:1). Pendant vingt-trois ans, le Coran lui fut révélé par l'ange Jibrîl, d'abord à La Mecque puis à Médine.`,
      `Il appela à l'adoration d'Allah seul, subit la persécution à La Mecque, émigra à Médine en 622, y fonda une communauté bâtie sur la justice et la fraternité, et revint à La Mecque en pardonnant à ses opposants. Sa vie est un modèle : « Vous avez, dans le Messager d'Allah, un excellent modèle » (33:21). Voir la rubrique « Sîra » pour le détail de sa vie.`,
    ],
    lessons: ['Le Coran et la sunna sont les deux sources de la guidée.', 'Un modèle de miséricorde, de patience et de justice.'],
    refs: ['3:144', '21:107', '33:21', '33:40', '48:29', '68:4', '96:1-5'],
  },
];

export const OTHER_STORIES = [
  { id: 'kahf', n: 'Les gens de la caverne', ar: 'أصحاب الكهف', sym: '⛰️', epithet: 'Jeunes gens fidèles',
    story: [
      `Des jeunes gens croyants, au milieu d'un peuple qui adorait d'autres divinités, se réfugièrent dans une caverne en disant : « Seigneur, accorde-nous de Ta part une miséricorde et facilite-nous une issue favorable » (18:10). Allah les endormit pendant de longues années : « trois cents ans et neuf de plus » (18:25).`,
      `À leur réveil, l'un d'eux fut envoyé en ville avec une monnaie, et leur histoire fut découverte. Elle devint un signe que la promesse d'Allah est vraie et que l'Heure ne fait aucun doute (18:21).`,
    ],
    lessons: ['Protéger sa foi en s\'en remettant à Allah.', 'La résurrection est aussi aisée pour Allah que ce long sommeil.'], refs: ['18:9-26'] },
  { id: 'dhulqarnayn', n: 'Dhoul-Qarnayn', ar: 'ذو القرنين', sym: '🧭', epithet: 'Le roi juste et humble',
    story: [
      `Dhoul-Qarnayn est un roi puissant à qui Allah avait donné les moyens de toute chose. Il voyagea vers l'occident, puis l'orient, rendant justice et punissant l'oppression (18:83-91). Des gens lui demandèrent de construire une barrière contre Yâ'joûj et Mâ'joûj ; il refusa toute rémunération et les aida de sa force, en élevant un rempart de fer et de cuivre fondu (18:92-97).`,
      `Après cela, il dit : « Ceci est une miséricorde de mon Seigneur ; mais quand viendra la promesse de mon Seigneur, Il l'aplanira » (18:98) : le pouvoir et la réussite ne sont jamais source d'orgueil.`,
    ],
    lessons: ['Le pouvoir est une responsabilité.', 'Le travail se fait par humilité et sans rien attendre en retour.'], refs: ['18:83-98'] },
  { id: 'luqman', n: 'Louqmân', ar: 'لقمان', sym: '🦉', epithet: 'Le sage',
    story: [
      `Allah dit : « Nous avons donné la sagesse à Louqmân : remercie Allah » (31:12). Il conseilla son fils : « Ô mon fils, n'associe rien à Allah : l'association est une injustice énorme » (31:13) ; « Ô mon fils, même si l'acte est du poids d'un grain de moutarde, caché dans un rocher, dans les cieux ou sur terre, Allah le fera venir » (31:16).`,
      `Il lui recommanda d'accomplir la prière, d'ordonner le bien, d'interdire le blâmable, d'être patient (31:17), de ne pas tourner son visage avec dédain, de ne pas marcher avec arrogance et de baisser la voix (31:18-19).`,
    ],
    lessons: ["Transmettre la foi et les valeurs avec tendresse.", "Humilité, patience et modestie dans la voix et la démarche."], refs: ['31:12-19'] },
  { id: 'maryam', n: 'Maryam', ar: 'مريم', sym: '🌴', epithet: 'La mère de ‘Îsâ',
    story: [
      `Maryam, fille de ‘Imrân, est la seule femme nommée dans le Coran, et une sourate porte son nom. Sa mère l'avait vouée à Allah (3:35). Zakariyyâ en eut la charge et la trouvait toujours avec des provisions : « Cela vient d'Allah », disait-elle (3:37). Elle fut choisie et purifiée par Allah au-dessus des femmes de l'univers (3:42).`,
      `Quand l'ange lui annonça un fils, elle s'étonna ; il lui dit que c'est facile pour Allah (19:20-21). Aux douleurs de l'enfantement, elle s'adossa à un palmier, et Allah la consola : « Ne t'attriste pas, ton Seigneur a placé à tes pieds un ruisselet » (19:23-26).`,
    ],
    lessons: ["La confiance en Allah dans l'épreuve.", "La pureté et le silence devant les accusations."], refs: ['3:35-47', '19:16-34', '66:12'] },
  { id: 'asiya', n: 'Âsiya', ar: 'آسية', sym: '🏛️', epithet: 'L\'épouse de Pharaon',
    story: [
      `Épouse de Pharaon, Âsiya crut en Allah malgré la tyrannie de son mari. Allah la donne en exemple aux croyants : « Seigneur, construis-moi auprès de Toi une maison dans le Paradis, sauve-moi de Pharaon et de ses actes, sauve-moi des injustes » (66:11). C'est elle qui, avec tendresse, demanda de recueillir l'enfant trouvé dans le fleuve (28:9).`,
    ],
    lessons: ["La foi est personnelle : nul n'est lié à la mécréance de son entourage.", 'Demander à Allah une demeure auprès de Lui plutôt que les honneurs de ce monde.'], refs: ['28:9', '66:11'] },
  { id: 'qarun', n: 'Qâroûn', ar: 'قارون', sym: '💰', epithet: "La richesse qui rend orgueilleux",
    story: [
      `Qâroûn faisait partie du peuple de Moûsâ, mais il se montra arrogant. Allah lui avait donné des trésors dont les clés pesaient lourd à une troupe d'hommes forts (28:76). Les gens de bien lui dirent : « Ne te réjouis pas avec excès, et cherche, dans ce qu'Allah t'a donné, la demeure dernière » (28:76-77). Il répondit : « Tout cela m'a été donné grâce à une science que j'ai » (28:78).`,
      `Allah fit engloutir Qâroûn et sa demeure par la terre (28:81). Ceux qui enviaient sa fortune la veille comprirent que la subsistance est entre les mains d'Allah.`,
    ],
    lessons: ['La richesse est une épreuve : il faut la partager et remercier.', 'Attribuer ses bienfaits à soi seul mène à la perte.'], refs: ['28:76-82'] },
  { id: 'talut', n: 'Tâloût et Jâloût', ar: 'طالوت وجالوت', sym: '⚔️', epithet: 'Le petit nombre victorieux',
    story: [
      `Les Banû Isrâ'îl demandèrent à leur prophète un roi pour les mener au combat ; Allah leur désigna Tâloût (2:246-247). Avant la bataille, il les éprouva avec un fleuve : ceux qui en burent beaucoup restèrent en arrière (2:249).`,
      `Face à l'armée de Jâloût, les croyants dirent : « Que de fois un petit groupe a triomphé d'un grand, par la permission d'Allah ! » Dâwoûd tua Jâloût (2:249-251).`,
    ],
    lessons: ["La victoire vient d'Allah, non du nombre.", "L'endurance et l'obéissance dans l'épreuve."], refs: ['2:246-251'] },
  { id: 'fil', n: "Les gens de l'Éléphant", ar: 'أصحاب الفيل', sym: '🐘', epithet: 'La protection de la Maison',
    story: [
      `Une armée venue du Yémen, menée par Abraha et accompagnée d'éléphants, marcha sur La Mecque pour détruire la Kaaba. Allah envoya sur eux des oiseaux en groupes qui lançaient sur eux des pierres d'argile cuite, et les rendit semblables à de la paille mâchée (105:1-5).`,
      `La tradition situe cet événement l'année de la naissance du Prophète ﷺ, d'où le nom d'« Année de l'Éléphant ».`,
    ],
    lessons: ["Allah protège Sa Maison sacrée.", "L'orgueil militaire ne peut rien contre Sa volonté."], refs: ['105:1-5'] },
  { id: 'ukhdud', n: 'Les gens du Fossé', ar: 'أصحاب الأخدود', sym: '🕯️', epithet: 'La fidélité jusqu\'au bout',
    story: [
      `Le Coran évoque des croyants que des persécuteurs jetèrent dans un fossé rempli de feu, simplement « parce qu'ils croyaient en Allah, le Puissant, le Digne de louange » (85:4-8). Un hadith rapporté par Mouslim (3005) en donne le contexte : un jeune homme, un roi, des gens de foi qui préférèrent le feu à l'apostasie.`,
      `Allah promet aux croyants fidèles les jardins sous lesquels coulent des ruisseaux, et c'est « la grande réussite » (85:11).`,
    ],
    lessons: ['La fermeté de la foi malgré la persécution.', "Le vrai succès est celui de l'au-delà."], refs: ['85:4-11'] },
];
