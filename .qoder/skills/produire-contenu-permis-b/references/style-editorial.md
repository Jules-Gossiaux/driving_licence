# Style éditorial

## Voix et public

Le contenu s'adresse à un candidat adulte au permis B belge francophone. Il doit pouvoir lire une
leçon en quelques minutes, comprendre une règle et répondre à une question sans revenir au texte.

- Vouvoiement, phrases courtes, voix active, présent de l'indicatif.
- Ton calme et précis. Pas de dramatisation, pas de blague sur les sanctions ou les accidents.
- Une idée par paragraphe. Les termes techniques sont définis à leur première apparition.
- Français de Belgique : « passage pour piétons », « chaussée », « accotement », « perception
  immédiate », « procureur du Roi », « agent qualifié ». Reprendre le terme officiel de la source
  plutôt que le franciser ou l'adapter d'un autre pays.
- Pas de référence au manuel, à l'OCR ou au projet dans le corps de la leçon. Le contenu doit se
  suffire à lui-même ; la traçabilité reste dans `sourceRefs`.

## Structure d'une leçon

Une leçon est un micro-parcours, pas un chapitre de manuel.

- **Titre** : question ou groupe nominal court, sans point final. Éviter « Introduction à… ».
- **Summary** : une phrase qui annonce la décision ou la règle principale.
- **Key points** : 3 à 5 entrées, chacune formulée comme une règle actionnable. Le schéma en accepte
  jusqu'à 6 ; au-delà de 5, la leçon est probablement trop large.
- **Ouverture** (avant le premier `##`) : 2 ou 3 phrases qui posent la situation concrète. Ne pas
  commencer par « Dans cette leçon, nous allons voir… ».
- **Sections `##`** : 3 à 6 sections, une seule idée par section. Titre court et explicite. Deux à
  quatre paragraphes courts, ou une phrase suivie d'une liste.
- **Piège d'examen** : bloc `>` avec le préfixe `**Piège d'examen** —`, uniquement s'il existe une
  confusion réelle et documentée. Un seul par leçon.
- **À retenir** : dernière section facultative, avec une règle de décision utilisable en situation.

Longueur cible : 350 à 650 mots hors front matter. Une leçon de catalogue de panneaux peut être plus
courte ; une leçon qui couvre plusieurs exceptions ne doit pas dépasser 900 mots, sinon la découper.

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

## Ce qui est refusé

- Recopier une phrase du manuel ou d'un scan, même courte.
- Une règle présentée sans source ou avec une source qui ne dit pas cela.
- Une question dont la bonne réponse dépend d'une convention locale non précisée.
- Un piège fondé sur une formulation ambiguë plutôt que sur une règle.
- Une image décorative qui n'apporte aucune information à la question.
- Un ton moralisateur, infantilisant ou anxiogène.
