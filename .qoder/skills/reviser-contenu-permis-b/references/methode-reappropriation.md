# Méthode de réécriture : originalité et clarté

## Objectif

Deux résultats sont attendus :

1. **Originalité** : remplacer le texte existant par une explication reconstruite à partir des faits,
   pas une suite de synonymes. Aucune phrase, aucune structure et aucun exemple ne doivent être repris
   de la source.
2. **Clarté** : ne garder que ce qui aide le candidat à comprendre et à décider. Une leçon courte et
   limpide vaut mieux qu'une leçon complète et confuse.

L'exactitude de la règle reste exigée : simplifier ne dispense jamais de vérifier une valeur, une
condition ou une exception.

## Étape 1 — Fiche de faits

Remplir une fiche par règle, sans recopier de phrases :

```text
Règle : ...
Sujet concerné : ...
Valeur exacte : ...
Conditions : ...
Exception : ...
Conséquence pratique : ...
Source officielle : <id> — <article / page> — consultée le <date>
Incertitude : aucune | <à vérifier>
```

Une règle sans valeur exacte ni conditions n'est pas prête à être réécrite.

## Étape 2 — Explication sans source

Fermer le manuel, le scan et l'ancienne leçon. Expliquer la règle à voix haute (ou en notes brutes)
comme à un candidat : quelle situation, quelle décision, quelle erreur éviter. Utiliser un exemple
concret inventé, pas l'exemple du manuel.

Si l'explication est impossible sans rouvrir la source, la fiche est incomplète : revenir à l'étape 1,
pas au copier-coller.

## Étape 3 — Rédaction

Écrire la leçon depuis l'explication, avec la structure cible :

1. une ouverture qui pose la situation ;
2. trois ou quatre sections, une décision par section ;
3. des points clés qui donnent les valeurs et les réflexes ;
4. aucune section de résumé, aucun bloc piège.

La formulation doit être celle d'un moniteur qui explique, pas celle d'un manuel qui énumère.
Viser 200 à 350 mots hors front matter. Dépasser 400 mots exige une règle ou une exception réelle à
couvrir, pas un enrichissement de style.

## Étape 4 — Simplifier

Reprendre la rédaction phrase par phrase et supprimer tout ce qui ne change ni la compréhension ni la
décision :

- phrases d'introduction, de transition et de conclusion ;
- rappels de bon sens et répétitions d'une idée déjà énoncée ;
- doubles explications, exemples décoratifs, détails historiques ;
- formules (« il est important de », « il convient de », « dans cette leçon ») ;
- nominalisations et tournures passives qui allongent la phrase ;
- adverbes et qualificatifs sans information.

Puis resserrer :

- une idée par phrase, 12 à 20 mots en moyenne ;
- diviser toute phrase de plus de 25 mots ;
- remplacer une énumération longue par une phrase de décision ;
- garder un exemple seulement s'il tranche une situation.

Exemple de coupe :

```text
Avant (33 mots) : Il est important de noter que, dans le cas où aucune signalisation ne serait
présente à l'approche d'un carrefour, la priorité doit être laissée aux véhicules qui arrivent sur
la droite du conducteur.

Après (13 mots) : Sans panneau ni feu, laissez passer le véhicule qui arrive à votre droite.
```

La coupe ne doit jamais retirer une condition, une exception ou une valeur. Une phrase peut être
longue si elle porte une règle qui ne peut pas être divisée sans perdre son sens.

## Étape 5 — Contrôle de fidélité

Comparer la rédaction à la **fiche**, jamais au texte source :

- [ ] chaque valeur chiffrée est exacte ;
- [ ] chaque condition et chaque négation sont présentes ;
- [ ] l'acteur compétent est le bon ;
- [ ] aucune exception n'a été ajoutée pour fluidifier ;
- [ ] la portée régionale est correcte ;
- [ ] le vocabulaire belge est conservé.

Une divergence avec la fiche est une erreur de contenu, même si la phrase est jolie.

## Étape 6 — Contrôle de similitude

Comparer ensuite la rédaction au texte source, uniquement pour détecter les ressemblances :

- rechercher les séquences de six mots ou plus identiques ou quasi identiques ;
- comparer l'ordre des sections : la source suit-elle la même progression ?
- comparer les exemples : est-ce le même carrefour, le même chiffre mis en scène, la même anecdote ?
- comparer les listes : même nombre d'items, même ordre, mêmes intitulés ?

Toute coïncidence se reformule en repartant de la décision à prendre, pas en remplaçant un mot.

## Exemple

Source fictive : « À défaut de signalisation, le conducteur doit céder le passage aux véhicules
venant de sa droite. »

Reformulation faible (à refuser) : « En l'absence de signalisation, le conducteur doit laisser
passer les véhicules qui viennent de droite. »

Réécriture appropriée : « Vous arrivez à un carrefour sans panneau ni feu : l'usager qui arrive sur
votre droite passe d'abord. Vous ne vous engagez qu'une fois sa trajectoire dégagée. »

La seconde version explique la même règle, mais elle est construite autour de la situation du
conducteur, avec un vocabulaire et une progression qui lui appartiennent.

## Ce qui ne suffit pas

- Remplacer des synonymes ou inverser deux propositions.
- Changer les noms et garder la même structure de phrases.
- Reprendre les exemples du manuel en les reformulant.
- Ajouter une introduction personnelle à un texte recopié.
- Copier un tableau et modifier les intitulés de colonnes.

## Traçabilité

- `origin: ai_assisted` pour toute réécriture assistée, même à partir d'un contenu déjà produit.
- `version` incrémentée à chaque modification de fond.
- `sourceRefs` mis à jour avec la source officielle qui établit la règle, pas seulement le manuel.
- Le rapport de révision indique les faits revérifiés et ce qui reste incertain.
