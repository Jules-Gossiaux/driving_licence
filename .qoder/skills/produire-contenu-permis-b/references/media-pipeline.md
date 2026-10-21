# Pipeline média

## Principe

Un média n'existe que s'il aide à comprendre une règle ou à répondre à une question. Une image
décorative, un doublon ou un visuel approximatif est supprimé. Tout média déclaré doit être un
original du projet ou disposer de droits explicites, et son fichier doit exister sous `public/`.

## Emplacements et déclaration

```text
public/media/<chapitre>/<sujet>.svg
content/media.yaml                 médias transverses
content/chapters/<slug>/media.yaml médias du chapitre
```

- Chemin déclaré : `/media/...`, en minuscules, sans accent ni espace.
- Formats : `svg`, `png`, `jpg`, `jpeg`, `webp`, `avif`.
- Un fichier ne peut être déclaré qu'une fois dans tout le catalogue.
- Un SVG servi doit obligatoirement avoir `rights: original`.
- Un scan du manuel reste `personal_use`, sous `data/`, et ne doit jamais être copié dans
  `public/`.

Exemple de déclaration :

```yaml
- id: ch02-panneau-stop
  file: /media/ch02/panneau-stop.svg
  alt: "Panneau stop octogonal rouge avec l'inscription STOP en blanc."
  caption: "Le stop impose l'arrêt complet à la ligne d'arrêt."
  kind: sign
  width: 480
  height: 480
  rights: original
  credit: "Projet Permis B"
  sourceRefs:
    - documentId: source-a-declarer # identifiant réel de content/sources.yaml
      page: 12
```

`source-a-declarer` est volontairement un identifiant non déclaré : il doit être remplacé, sinon la
validation échoue.

`alt` décrit l'information utile, pas l'objet (« Panneau circulaire à bord rouge… » plutôt que
« Image de panneau »). Ne jamais y mettre la réponse à la question.

## Panneaux de signalisation

1. Vérifier la forme, les couleurs, le symbole et le sens exact sur une source officielle. Ne pas se
   fier à un modèle générique ni à un souvenir.
2. Dessiner un SVG original avec des formes géométriques propres. Ne jamais vectoriser un scan, ni
   télécharger un fichier existant, ni laisser une IA dessiner le panneau.
3. Respecter les proportions et les couleurs réglementaires. Le texte éventuel doit être exact,
   lisible et en français si le panneau belge l'exige.
4. Utiliser un `viewBox`, des polices de substitution standard, aucun script, aucune image externe,
   aucune dépendance réseau.
5. Déclarer `kind: sign`, les dimensions réelles et une source qui documente le panneau.
6. Relire le rendu à taille réelle et en petit : le symbole doit rester identifiable.

Un panneau inventé, approximatif ou recomposé « à la manière de » est interdit : il enseignerait une
règle fausse.

## Scènes photoréalistes

Une scène générée n'est utile que si la situation de conduite est difficile à décrire en mots :
intersection, priorité, dépassement, positionnement, visibilité. Pour toute scène :

1. Rédiger un brief précis : point de vue du conducteur, pays et sens de circulation, type de route,
   nombre de voies, usagers présents et leur position, météo, moment de la journée, état de la
   chaussée, panneaux et marquages attendus.
2. Exiger l'absence de texte, de logo, de plaque lisible, de visage identifiable et de panneau
   inventé. Les panneaux nécessaires seront ajoutés après coup.
3. Faire valider le brief par l'utilisateur avant de générer. Une scène ne se génère pas « pour
   voir ».
4. Générer, puis inspecter : nombre de voies, sens de circulation, feux, marquages, cohérence des
   usagers, absence d'artefacts. Une scène fausse est régénérée ou abandonnée.
5. Si un panneau doit apparaître, l'intégrer à partir du SVG original validé, à la bonne échelle et
   au bon endroit. Ne jamais laisser l'IA dessiner un panneau ou du texte.
6. Déclarer le média avec `kind: photo`, `rights: original`, `credit`, `sourceRefs` et le bloc
   `generator` :

```yaml
generator:
  tool: "Nom de l'outil"
  prompt: >-
    Brief complet utilisé pour la génération.
  generatedAt: 2026-10-20T00:00:00Z
```

Pour une image composite, garder le brief et mentionner l'outil de composition dans `credit` ou
`generator.tool`.

## Schémas et illustrations

- Privilégier un schéma clair à une scène réaliste quand la règle est abstraite.
- Dimensions usuelles : 960 × 540 pour un schéma, 480 × 360 pour une illustration. Les dimensions
  déclarées doivent correspondre au fichier réel.
- Dès qu'un visuel contient des phrases ou un tableau, le construire en HTML/CSS dans la leçon
  plutôt qu'en SVG. Un SVG ne porte que des libellés courts.
- Pas de texte incrusté superflu : si un libellé est nécessaire, il doit être lisible, contrasté et
  cohérent avec le vocabulaire de la leçon, y compris à 320 px de large.
- Ne pas coder une information par la couleur seule ; ajouter une forme, un symbole ou un libellé.
- Vérifier le contraste et la lisibilité en niveaux de gris.
- L'interface ouvre les images en grand au clic et permet de zoomer : cela ne dispense pas de les
  concevoir lisibles à taille normale.

## Utilisation dans les contenus

- Dans une leçon : `![alt](/media/ch02/fichier.svg)`. Le chemin doit correspondre à un média déclaré.
  Les images externes et les URL distantes sont interdites.
- Dans une question : `mediaId` pour l'image d'énoncé, `mediaId` sur une option pour une option
  illustrée. Les deux doivent être déclarés.
- Ne pas réutiliser un média pour deux intentions différentes si l'`alt` ou le cadrage ne convient
  plus.
- L'image d'une question ne doit pas contenir la réponse sous forme de texte lisible.

## Contrôle avant validation

- [ ] Le fichier existe au chemin déclaré et son format est autorisé.
- [ ] `width` et `height` correspondent au fichier.
- [ ] `alt` décrit l'information utile et ne révèle pas la réponse.
- [ ] `kind`, `rights` et `credit` sont corrects ; un SVG est `original`.
- [ ] Aucun scan, logo, plaque, visage ou fichier téléchargé.
- [ ] Aucun panneau généré par IA ; les panneaux sont des SVG originaux validés.
- [ ] Les `sourceRefs` documentent le visuel lorsque c'est pertinent.
- [ ] Le rendu a été vérifié dans la leçon ou la question, pas seulement dans le fichier.
