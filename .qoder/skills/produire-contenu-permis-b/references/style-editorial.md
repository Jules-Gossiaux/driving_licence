# Style éditorial

Référence commune à `produire-contenu-permis-b` et `reviser-contenu-permis-b`.

## Voix et public

Le contenu s'adresse à un candidat adulte au permis B belge francophone. Il doit pouvoir lire une
leçon en deux ou trois minutes, comprendre une règle et répondre à une question sans revenir au texte.

- Vouvoiement, phrases courtes, voix active, présent de l'indicatif.
- Ton calme et précis. Pas de dramatisation, pas de blague sur les sanctions ou les accidents.
- Une idée par paragraphe. Les termes techniques sont définis à leur première apparition.
- Français de Belgique : « passage pour piétons », « chaussée », « accotement », « perception
  immédiate », « procureur du Roi », « agent qualifié ». Reprendre le terme officiel de la source
  plutôt que le franciser ou l'adapter d'un autre pays.
- Pas de référence au manuel, à l'OCR ou au projet dans le corps de la leçon. Le contenu doit se
  suffire à lui-même ; la traçabilité reste dans `sourceRefs`.

## Structure d'une leçon

Une leçon est un micro-parcours, pas un chapitre de manuel. Tout ce qui n'aide pas à trancher une
situation ou à répondre à une question est supprimé.

- **Titre** : question ou groupe nominal court, sans point final. Éviter « Introduction à… ».
- **Summary** : une phrase qui annonce la décision ou la règle principale.
- **Key points** : 3 ou 4 entrées, chacune formulée comme une règle actionnable. Cinq au maximum.
- **Ouverture** (avant le premier `##`) : 2 ou 3 phrases qui posent la situation concrète. Ne pas
  commencer par « Dans cette leçon, nous allons voir… ».
- **Sections `##`** : 3 ou 4 sections, une seule idée par section. Titre court et explicite. Deux ou
  trois paragraphes courts, ou une phrase suivie d'une liste.
- **Longueur cible** : 250 à 450 mots hors front matter. Une leçon de catalogue de panneaux peut
  descendre à 150 mots ; au-delà de 600 mots, supprimer ou découper.
- **Pas de section « À retenir »** : la règle de décision est déjà dans les key points et dans la
  dernière section. Un résumé final qui répète la leçon est supprimé.
- **Pas de bloc « Piège d'examen »** : voir la section suivante.

## Supprimer la redondance

Le défaut le plus fréquent n'est pas la longueur brute, c'est la répétition. Une même idée ne doit
apparaître qu'à un seul endroit :

- le `summary` annonce la règle, il ne la démontre pas ;
- les `keyPoints` donnent les valeurs et les réflexes, ils ne racontent pas la situation ;
- le corps explique, illustre et tranche ;
- les questions vérifient, elles ne réintroduisent pas un paragraphe de cours.

Si une phrase peut être supprimée sans qu'une question devienne impossible à répondre, elle est
probablement décorative.

## Transformer un piège en question

Un piège n'est conservé que s'il change une décision. Il ne reste jamais sous forme de bloc séparé.

1. **Confusion réelle et non testée** : créer ou réutiliser une question qui met la confusion en
   situation, avec une explication qui tranche. La question peut être une vérification de section si
   le piège se rattache à une section dense, sinon une question du quiz final.
2. **Confusion déjà couverte par une question** : supprimer le bloc sans rien ajouter.
3. **Nuance mineure** (un mot, une condition de forme) : l'intégrer en une phrase dans la règle
   concernée, sans lui consacrer une section.
4. **Fausse exception ou formulation ambiguë** : supprimer purement et simplement.

Avant de retirer un piège, vérifier la couverture : `grep` du sujet dans les questions de la leçon
et lecture des explications. Un piège ne disparaît jamais sans que la règle reste vérifiable.

## Rédiger une règle

1. Écrire la règle générale avant l'exception.
2. Donner la valeur exacte avec son unité et sa portée : « 750 kg de MMA », « 3 500 kg pour
   l'ensemble », « moins de 20 mètres », « 15 secondes par question ».
3. Nommer qui est concerné et dans quelle situation. Une règle sans sujet ni contexte est
   inutilisable à l'examen.
4. Distinguer une obligation, une interdiction et une recommandation. Ne pas écrire « il faut »
   pour une bonne pratique.
5. Si une règle varie selon la Région, le dire explicitement et nommer la Région. Ne pas présenter
   une particularité bruxelloise comme une règle fédérale.
6. Ne pas inventer d'exception pour rendre la leçon plus intéressante. Une exception non sourcée est
   supprimée.

## Questions

Une question doit tester une décision, pas la mémoire d'une formulation.

- **Énoncé** : une à trois phrases, autosuffisant. Le contexte vient avant la question. Éviter les
  doubles négations et les questions à tiroirs.
- **Options** : 4 par défaut (2 à 6 autorisées). Même registre, longueur comparable, une seule
  réponse correcte. Chaque distracteur doit correspondre à une erreur réelle : confusion de seuil,
  de priorité, de catégorie d'usager ou d'acteur compétent.
- **Pas de position** : ne jamais écrire « la première réponse », « la réponse A » ou « ci-dessus »
  dans l'énoncé ou l'explication ; les options sont mélangées à la création de la tentative.
- **Explication** : rappeler la règle, justifier la bonne réponse, puis nommer l'erreur du
  distracteur le plus tentant. Deux ou trois phrases suffisent. Ne pas répéter l'énoncé.
- **Images** : l'énoncé doit renvoyer à ce qu'il faut observer. L'`alt` décrit la scène sans révéler
  la réponse. Une question illustrée doit être répondable sans deviner un détail illisible.
- **Questions à options illustrées** : chaque option visuelle doit être déclarée par un `mediaId` et
  rester comparable aux autres (même cadrage, même niveau de détail).

### Difficulté

| Niveau   | Usage                                                                     |
| -------- | ------------------------------------------------------------------------- |
| `easy`   | Rappel direct d'une règle ou d'un panneau, une seule condition            |
| `medium` | Application à une situation, une exception ou un acteur à identifier      |
| `hard`   | Combinaison de deux règles, seuil à calculer, priorité ambiguë à trancher |

Viser environ 40 % `easy`, 40 % `medium`, 20 % `hard` par pool de leçon. Ce n'est pas une obligation
mécanique : une leçon factuelle peut être majoritairement `easy`.

### Sévérité

`severity: severe` est réservé aux fautes qui mettent directement en danger ou que le format
d'examen sanctionne lourdement. Elles doivent rester rares et justifiées par la source. Une erreur
de procédure administrative n'est pas « grave » au sens de l'examen.

### Éligibilité à l'examen

`examEligible: false` pour une question dont la réponse est incertaine, régionale sans portée
générale, ou hors du programme visé. Une question de brouillon peut rester éligible : c'est le
`status` qui décide de son entrée dans le preset officiel, pas `examEligible`.

### Tags

2 à 4 tags en kebab-case, réutilisés d'une question à l'autre : `priorites`, `panneaux-danger`,
`alcool`, `sanctions`, `usagers`. Ne pas créer un tag pour une seule question sans raison.

## Vérifications de section et reprises

- Une leçon ne contient **qu'une seule vérification de section**, placée après la section la plus
  dense, avec 1 ou 2 questions. C'est un contrôle de compréhension, pas un quiz au fil du texte.
- Les autres questions cœur forment le **quiz final** (2 à 4 questions, 4 ou 5 au total avec la
  vérification).
- Le moteur de leçon repose automatiquement, à la fin, **les questions ratées**. Ne pas dupliquer
  ces questions dans le contenu et ne pas prévoir de session de consolidation séparée.
- Choisir comme vérification une question qui révèle une incompréhension utile, pas la plus facile.

## Tableaux et schémas

- Un tableau sert à comparer des **valeurs courtes** (seuils, durées, catégories). Maximum 3 ou 4
  colonnes, cellules de quelques mots.
- Une cellule ne contient jamais une phrase complète ni un paragraphe. Si c'est le cas, convertir le
  tableau en liste ou en cartes HTML.
- Un schéma doit rester lisible sur un écran de 320 px de large. L'information ne repose jamais sur
  la couleur seule.
- Ne pas incruster de paragraphes de texte dans une image : les explications vont dans le Markdown.
  Un SVG ne porte que des libellés courts.
- Les images sont déclarées avec leurs dimensions réelles et un `alt` utile. L'interface les ouvre en
  grand au clic ; cela ne dispense pas de les concevoir lisibles à taille normale.
- Pour une comparaison de plusieurs cas, préférer une liste ou des cartes HTML à un schéma large.

## Originalité et réappropriation

Un contenu original reprend des **faits**, pas une formulation, une structure ni des exemples.

1. Construire une fiche de faits : règle, valeur, portée, exception, source officielle, page.
2. Quitter la source et expliquer la règle à voix haute, avec ses propres mots et un exemple concret.
3. Rédiger depuis cette explication, sans rouvrir le manuel.
4. Confronter ensuite la rédaction à la fiche, pas au texte source : chaque fait doit être exact et
   chaque valeur sourcée.
5. Chercher les séquences de six mots ou plus qui ressemblent à la source ; reformuler toute
   coïncidence. Vérifier aussi que l'ordre des sections et les exemples ne recopient pas le manuel.

Une reformulation mot à mot reste un plagiat. Changer trois mots ou déplacer une phrase ne suffit
pas : il faut reconstruire l'explication autour de la décision à prendre.

## Ce qui est refusé

- Recopier une phrase du manuel ou d'un scan, même courte.
- Une règle présentée sans source ou avec une source qui ne dit pas cela.
- Une question dont la bonne réponse dépend d'une convention locale non précisée.
- Un bloc « Piège d'examen » ou une section « À retenir » qui répète la leçon.
- Un tableau de phrases complètes.
- Une image décorative qui n'apporte aucune information à la question.
- Un ton moralisateur, infantilisant ou anxiogène.
