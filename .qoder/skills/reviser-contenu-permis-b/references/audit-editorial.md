# Grille de contrôle : originalité et clarté

## Les deux critères de réussite

1. **Originalité** : aucune séquence de six mots ni structure ni exemple repris de la source. La
   leçon est reconstruite depuis les faits.
2. **Clarté** : aucune phrase inutile, aucune idée répétée, une décision par section. Un débutant
   comprend la règle après une seule lecture.

L'exactitude de la règle et la couverture par les questions sont des garde-fous : elles ne
compensent jamais un texte copié ou confus.

## Ce qu'on mesure

Mesurer chaque leçon séparément, puis le pool de questions associé. Ne pas auditer « à l'œil » : une
leçon qui paraît courte peut répéter trois fois la même règle.

```bash
# mots hors front matter (approx.)
awk 'BEGIN{fm=0} /^---$/{fm++; next} fm>=2{print}' lecon.md | wc -w

# sections, blocs piège, sections à retenir
grep -n '^## ' lecon.md
grep -n 'Piège d.examen' lecon.md
grep -n '^## À retenir' lecon.md

# tableaux et images
grep -n '^|' lecon.md
grep -n '!\[\|^<figure\|^<table' lecon.md
```

## Seuils

| Élément       | Correct                | À corriger                                              |
| ------------- | ---------------------- | ------------------------------------------------------- |
| Longueur      | 200–350 mots           | plus de 400 sans justification, ou moins de 150         |
| Sections      | 3–4                    | 5 ou plus, ou une section fourre-tout                   |
| Points clés   | 3–4                    | 5 ou plus, ou un point clé de plus de 30 mots           |
| Vérifications | 1 check, 1–2 questions | 2 checks ou plus, ou plus de 2 questions                |
| Quiz final    | 2–4 questions          | moins de 2, ou 4 questions cœur épuisées par les checks |
| Pièges        | aucun bloc             | un ou plusieurs blocs                                   |
| À retenir     | aucune section         | une ou plusieurs sections                               |
| Tableau       | valeurs courtes        | cellule de plus de 8 mots, plus de 4 colonnes           |
| Image         | lisible à 320 px       | texte incrusté, détails illisibles                      |
| Répétition    | une idée, un endroit   | même règle dans summary, keyPoints et corps             |

## Grille par leçon

### Originalité

- [ ] Aucune séquence de six mots identique ou quasi identique à la source.
- [ ] L'ordre des sections ne suit pas celui du manuel.
- [ ] Aucun exemple, anecdote ou liste ne reprend celui de la source.
- [ ] La rédaction part de la fiche de faits et d'une explication sans source.

### Clarté

- [ ] Chaque phrase apporte une information utile.
- [ ] Une idée par phrase ; aucune phrase de plus de 25 mots.
- [ ] Aucune idée répétée entre summary, keyPoints et corps.
- [ ] Aucun paragraphe décoratif, aucune formule de transition.
- [ ] Le texte tient en 200 à 350 mots, ou le dépassement est justifié.
- [ ] Chaque section répond à une question concrète du candidat.

### Fond

- [ ] Chaque règle a une source officielle identifiable et une date de consultation.
- [ ] Les seuils, unités, durées et négations sont exacts.
- [ ] Les acteurs compétents sont nommés (agent, procureur du Roi, juge, commune, Région).
- [ ] Une règle régionale est identifiée comme telle.
- [ ] Aucune exception inventée ou reprise sans vérification.

### Forme

- [ ] Le titre annonce une décision ou un groupe nominal court.
- [ ] Le summary annonce la règle sans la démontrer.
- [ ] Chaque section traite une seule idée.
- [ ] Les points clés sont actionnables et ne répètent pas le corps.
- [ ] L'ouverture pose une situation concrète, pas « dans cette leçon ».
- [ ] Il reste 2 à 4 questions pour le quiz final.
- [ ] Aucun bloc piège ni section de résumé.

### Couverture

- [ ] La vérification de section porte sur la section la plus dense.
- [ ] Chaque question peut être répondue avec la leçon seule.
- [ ] Aucune question ne teste une règle supprimée ou une nuance devenue fausse.
- [ ] Chaque confusion réelle retirée de la théorie est couverte par une question.
- [ ] Le pool reste suffisant pour l'entraînement de l'unité.

### Médias

- [ ] Les tableaux comparent des valeurs, pas des phrases.
- [ ] Les schémas portent des libellés courts, pas des paragraphes.
- [ ] Les dessins sont exacts (position, sens, couleur, proportion).
- [ ] Chaque média est déclaré, dimensionné et décrit par un `alt` utile.
- [ ] Le rendu a été vérifié à 320 px et sur grand écran.

## Classement des problèmes

- **Bloquant** : règle fausse, source absente, formulation reprise du manuel, question impossible,
  média qui enseigne une erreur, incohérence de schéma, références cassées.
- **Important** : texte encore trop long ou redondant, piège non converti, couverture incomplète,
  tableau illisible, vérification mal placée.
- **Mineur** : formulation lourde, titre vague, point clé trop long, `alt` perfectible.

Un problème bloquant arrête le lot. Un problème important se corrige avant de déclarer la leçon
prête. Un problème mineur peut être listé pour la relecture humaine.

## Diagnostic type

| Symptôme                                                     | Cause probable                  | Décision                                                        |
| ------------------------------------------------------------ | ------------------------------- | --------------------------------------------------------------- |
| Une séquence de six mots revient                             | paraphrase de la source         | reconstruire depuis la décision, pas depuis la phrase           |
| La leçon reste longue malgré la réécriture                   | texte conservé par prudence     | supprimer tout ce qui ne change aucune décision                 |
| La leçon dépasse 400 mots                                    | plusieurs règles dans une leçon | découper ou supprimer les exemples redondants                   |
| Le summary, les points clés et le corps disent la même chose | empilement de formats           | garder la règle dans le corps, résumer ailleurs                 |
| Une section « À retenir » répète la leçon                    | reflexe de manuel               | supprimer                                                       |
| Un bloc piège énonce une confusion                           | règle mal expliquée             | corriger la règle, puis convertir le piège en question si utile |
| Un tableau contient des phrases                              | tableau utilisé comme texte     | convertir en liste ou en cartes                                 |
| Un schéma contient un paragraphe                             | SVG utilisé comme page          | reconstruire en HTML/CSS                                        |
| Une question n'est plus répondable                           | règle supprimée                 | mettre à jour la question ou la retirer du pool                 |
| Le pool de la leçon est trop mince                           | questions jamais créées         | signaler, ne pas inventer pour remplir                          |
