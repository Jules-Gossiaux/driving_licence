# Contenu

## Principe

`content/` est la source de vérité du contenu pédagogique. Tout est versionné avec le code. Aucun
contenu n'est stocké en base : seules la progression et les tentatives le sont.

Le contenu actuel est une **démonstration** : 2 chapitres, 9 leçons et 61 questions en brouillon.
Il permet de tester les parcours et le pilote du chapitre 2.1, pas de préparer sérieusement
l'examen.

## Arborescence

```text
content/
  sources.yaml                 documents de référence
  media.yaml                   médias servis et droits
  exam-presets/
    belgique-b-fr.yaml         preset officiel (verrouillé tant que le pool est insuffisant)
    demo-chapitre-1.yaml       preset de démonstration
  chapters/
    chapitre-1-permis-b/
      chapter.yaml
      lessons/
        le-permis-b-et-ses-limites.md
        tracter-une-remorque.md
      questions/
        ch01-q001.yaml
        ...
    chapitre-2-la-reglementation/
      chapter.yaml
      media.yaml               médias propres au chapitre (facultatif)
      lessons/
        qui-doit-respecter-les-regles.md
        ...
      questions/
        ch02-q001.yaml
        ...
```

Règles de nommage vérifiées par le loader :

- un fichier de question doit s'appeler `<id>.yaml` ;
- une leçon doit s'appeler `<slug>.md` ;
- un répertoire de chapitre doit s'appeler `<slug>` ;
- les identifiants et slugs sont en kebab-case minuscule (`[a-z0-9-]`), sans accent ni majuscule.

## Sources

Chaque chapitre, leçon, question, média et preset référence au moins une source déclarée.

```yaml
- id: official-category-b
  title: "Voitures (catégorie B) — SPF Mobilité et Transports"
  kind: official # manual | official | other
  publisher: "SPF Mobilité et Transports"
  url: https://example.be/... # HTTPS obligatoire
  accessedAt: 2026-10-19T00:00:00Z
  rights: external_reference # original | personal_use | licensed | public_domain | external_reference
```

Chaque source doit fournir au moins un `localPath` ou une `url`. Un document local doit rester sous
`data/` (jamais `public/`) et ne peut pas contenir `..`. Les sources officielles belges priment ; le
manuel sert de support, avec référence de page.

## Médias

```yaml
- id: demo-voiture-remorque
  file: /media/demo/voiture-remorque.svg
  alt: "Illustration neutre d'une voiture tractant une remorque sur une route."
  caption: "Un véhicule de catégorie B attelé à une remorque."
  kind: illustration # diagram | photo | illustration | scan | sign
  width: 960
  height: 540
  rights: original # original | personal_use | licensed | public_domain
  credit: "Projet Permis B"
  sourceRefs:
    - documentId: official-trailer
```

Contraintes :

- le fichier doit exister sous `public/` et être servi depuis `/media/...` ;
- un média peut être déclaré dans `content/media.yaml` ou dans le `media.yaml` d'un chapitre ;
- les images externes sont interdites dans les leçons ;
- un SVG servi doit être un original du projet (`rights: original`) ;
- un scan du manuel ne peut pas être publié sans droits explicites ;
- `alt` est obligatoire et doit décrire l'information utile, pas seulement l'objet.

## Chapitre

```yaml
id: ch01
slug: chapitre-1-permis-b
order: 1
title: "Chapitre 1 — Le permis B et le remorquage"
summary: >-
  Résumé affiché dans la liste et le tableau de bord.
units: # facultatif
  - id: ch01-u1
    slug: unites-de-base
    order: 1
    label: "1.1"
    title: "Les unités de base"
    summary: "Résumé facultatif de l'unité."
sourceRefs:
  - documentId: official-category-b
version: 1
status: draft # draft | in_review | published
origin: ai_assisted # manual | ai_assisted | original
reviewedBy: "Nom" # obligatoire si published
reviewedAt: 2026-10-20T09:00:00Z # ISO 8601 UTC, obligatoire si published
```

Lorsqu'un chapitre déclare des `units`, chaque leçon doit renseigner `unitId`. Un chapitre sans
unité reste autorisé (les leçons sont alors listées à plat).

## Leçon

Fichier Markdown avec front matter YAML :

```markdown
---
id: ch01-l01
chapterId: ch01
unitId: ch01-u1
slug: le-permis-b-et-ses-limites
order: 1
title: "Le permis B et ses limites"
summary: "Résumé court."
keyPoints:
  - "Point clé 1."
  - "Point clé 2."
coreQuestionIds:
  - ch01-q001
  - ch01-q002
  - ch01-q003
  - ch01-q004
sectionChecks: # facultatif
  - section: les-categories
    questionIds:
      - ch01-q001
  - section: les-limites
    questionIds:
      - ch01-q002
sourceRefs:
  - documentId: official-category-b
version: 1
status: draft
origin: ai_assisted
---

## Titre

Corps Markdown. Les images doivent pointer vers un fichier déclaré dans `content/media.yaml` ou
dans le `media.yaml` du chapitre.
```

`keyPoints` contient 1 à 6 entrées. Le corps ne peut pas être vide. `coreQuestionIds` est
facultatif, mais une leçon publiée doit déclarer **4 ou 5 questions cœur** appartenant à la leçon.

Le parcours de leçon découpe le corps sur les titres `##` : le contenu avant le premier titre
devient une section « Introduction ». Les titres `###` restent dans la section courante. Pour une
leçon à parcours, `sectionChecks` place une ou deux questions cœur juste après une section, par son
identifiant de slug (par exemple `les-categories`). Au moins une question cœur doit rester pour le
quiz final. Les questions cœur restantes sont posées à la fin, dans l'ordre de `coreQuestionIds`.

## Question

```yaml
id: ch01-q002
chapterId: ch01
lessonIds:
  - ch01-l01
prompt: >-
  Énoncé de la question.
options:
  - id: a
    label: "Réponse A"
  - id: b
    label: "Réponse B"
    mediaId: demo-media-option # facultatif : option illustrée
  - id: c
    label: "Réponse C"
  - id: d
    label: "Réponse D"
correctOptionId: b
explanation: >-
  Explication affichée après la réponse.
mediaId: demo-voiture-remorque # optionnel, média déclaré
difficulty: easy # easy | medium | hard
severity: normal # normal | severe
examEligible: true # défaut true
tags:
  - categories
sourceRefs:
  - documentId: official-category-b
version: 1
status: draft
origin: ai_assisted
```

Contraintes :

- 2 à 6 options, identifiants uniques ;
- `correctOptionId` doit désigner une option existante ;
- une option peut porter un `mediaId` déclaré dans un manifeste média ; elle affiche alors une
  image au-dessus de son libellé ;
- `lessonIds` doit référencer des leçons du même chapitre ;
- `severity: severe` doit rester rare et justifié : la faute grave coûte 5 points dans le preset
  officiel ;
- `examEligible: false` exclut la question de tous les examens, y compris la démonstration ;
- l'explication doit expliquer la règle, pas seulement répéter la bonne réponse ;
- les options sont mélangées à la création de la tentative : ne pas rédiger « la réponse A » dans
  l'explication.

## Pilote du chapitre 2.1

Le chapitre 2 est amorcé par un pilote limité au point 2.1 (« La réglementation ») : une unité
`ch02-u1`, 7 leçons, 8 questions par leçon et 56 questions au total, toutes en `draft` et
`ai_assisted`. Chaque leçon déclare 4 questions cœur (`ch02-q001` à `ch02-q004` pour la première,
etc.), deux vérifications de section et propose un parcours linéaire ; le reste du pool alimente
l'entraînement du chapitre.

Les faits sont tirés des pages 10 à 16 du manuel et recoupés avec la synthèse des pages 42 à 44.
Les questions illustrées utilisent les SVG originaux de `public/media/ch02/`. Le contenu doit être
relu avant publication : aucun élément du pilote n'est encore éligible à l'examen officiel.

## Preset d'examen

```yaml
id: belgique-b-fr
title: "Examen théorique B — Belgique francophone"
description: >-
  Description affichée.
questionCount: 50
secondsPerQuestion: 15
passingScore: 41
errorPenalty: 1
severeErrorPenalty: 5
allowUnpublished: false
chapterIds: []
sourceRefs:
  - documentId: official-exam-brussels
```

- `allowUnpublished: false` : seules les questions publiées dont le chapitre est publié sont
  éligibles. C'est le cas du preset officiel.
- `allowUnpublished: true` : mode démonstration, utilisable avec des brouillons. Ne jamais
  présenter ce mode comme un examen représentatif.
- `chapterIds: []` signifie « tous les chapitres ».
- Le preset est affiché comme verrouillé si le pool éligible est inférieur à `questionCount`.

Format belge retenu : **50 questions, 15 secondes par question, réussite à 41/50**, une erreur
coûte 1 point, une faute grave 5 points. La source est référencée dans `content/sources.yaml`
(`official-exam-brussels`). Toute modification de ce format doit être justifiée par une source
officielle et mise à jour dans le preset, pas codée en dur.

## Cycle de publication

1. Rédiger en `draft`.
2. Vérifier la règle sur une source officielle belge et/ou le manuel avec page.
3. Passer en `in_review`.
4. Après relecture réelle, renseigner `reviewedBy`, `reviewedAt` et passer en `published`.
5. Incrémenter `version` à chaque modification de fond. Les tentatives déjà créées conservent leur
   snapshot et ne sont pas affectées.

Un contenu `published` sans `reviewedBy` ou `reviewedAt` est refusé par la validation. Ne jamais
publier pour « débloquer » un preset sans avoir relu le contenu.

## Validation

```bash
pnpm content:validate
```

Le loader vérifie notamment :

- schémas Zod stricts (champs inconnus refusés) ;
- unicité des identifiants, slugs, ordres de leçon et fichiers média ;
- cohérence chapitre/leçon/question ;
- existence des références de sources et des médias ;
- interdiction des images externes dans les leçons ;
- présence des fichiers sous `public/` ;
- droits compatibles avec le type de média ;
- `coreQuestionIds` : 4 ou 5 questions du chapitre, sans doublon, pour toute leçon publiée ;
- unités : identifiants, slugs et ordres uniques, `unitId` obligatoire si le chapitre déclare des
  unités ;
- `sectionChecks` : section existante (slug dérivé du titre `##`), question cœur, pas de doublon,
  au moins une question cœur restante pour la fin ;
- médias d'options déclarés et résolus ;
- pool d'examen suffisant (avertissement) ;
- chapitre sans question (avertissement).

Une erreur bloque l'application ; un avertissement est affiché mais n'empêche pas le démarrage.

## Produire du contenu à partir de `data/`

`data/` contient des PDF et photos personnels, ignorés par Git et jamais servis. Pour en tirer du
contenu :

1. Identifier la page et la règle précise.
2. Vérifier la règle sur une source officielle belge lorsque c'est possible.
3. Rédiger une question originale, avec explication et référence.
4. Ne jamais copier un scan dans `public/` ni l'exposer via l'application.
5. Ne pas se fier à l'OCR seul : la qualité est insuffisante pour servir de vérité.

Toute commercialisation exigera des droits sur les contenus ou une réécriture entièrement
originale.
