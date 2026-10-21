# Contrat de contenu

Ce document résume les contraintes qui piègent le plus souvent la production. Les sources
d'autorité restent, dans cet ordre :

1. `src/domain/content/schemas.ts` : schémas Zod stricts, longueurs et énumérations.
2. `src/domain/content/catalog.ts` : cohérence inter-fichiers, questions cœur, sections, pool.
3. `src/infrastructure/content/loader.ts` : emplacements et noms de fichiers.
4. `src/domain/learning/progression.ts` : défi d'unité et examen de chapitre.
5. `docs/CONTENT.md` : documentation humaine du modèle.

En cas de divergence, lire le code ; ne jamais déduire un champ de ce document seul.

## Emplacements et noms

```text
content/
  sources.yaml
  media.yaml                        médias transverses
  exam-presets/<id>.yaml
  chapters/<slug>/
    chapter.yaml
    media.yaml                      facultatif
    lessons/<slug>.md
    questions/<id>.yaml
```

Le loader vérifie les noms :

- répertoire de chapitre = `chapter.slug` ;
- leçon = `<slug>.md` ;
- question = `<id>.yaml` ;
- preset = `<id>.yaml`.

Les identifiants et slugs sont en kebab-case minuscule, sans accent : `[a-z0-9]+(-[a-z0-9]+)*`,
80 caractères maximum pour un identifiant, 100 pour un slug.

Un fichier de leçon contient un front matter YAML puis un corps Markdown non vide. Un fichier de
question, un chapitre, un preset et chaque entrée média sont des objets YAML stricts : un champ
inconnu fait échouer la validation.

## Limites de schéma à connaître

| Élément       | Contrainte utile                                                                  |
| ------------- | --------------------------------------------------------------------------------- |
| Chapitre      | `summary` ≤ 600 ; 1 à 20 `sourceRefs` ; jusqu'à 30 unités ; `version` ≥ 1         |
| Unité         | `id`, `slug`, `order`, `label` ≤ 20, `title` ≤ 160, `summary` ≤ 600 facultatif    |
| Leçon         | `keyPoints` 1 à 6 (≤ 300 chacun) ; `coreQuestionIds` ≤ 8 ; `sectionChecks` ≤ 8    |
| Section check | `section` = slug d'un titre `##` ; 1 à 2 `questionIds`, tous cœur                 |
| Question      | 2 à 6 options ; `prompt` ≤ 1200 ; `explanation` ≤ 4000 ; 1 à 20 `lessonIds`       |
| Média         | `alt` ≤ 500 ; `sourceRefs` ≤ 10 ; `credit` ≤ 200 ; `width`/`height` positifs      |
| Source        | `localPath` sous `data/` ou URL HTTPS ; `accessedAt` ISO 8601 UTC avec suffixe Z  |
| Preset        | 1 à 200 questions ; 1 à 120 s ; seuil ≤ nombre de questions ; pénalités positives |

Un SVG servi doit porter `rights: original`. Un scan ne peut pas être servi depuis `public/`.
Les formats acceptés sont `svg`, `png`, `jpg`, `jpeg`, `webp` et `avif`, sous `/media/`.

## Invariants inter-fichiers

Le loader bloque le démarrage sur les erreurs suivantes :

- `chapterId` d'une leçon ou d'une question différente du chapitre qui la contient ;
- `unitId` absent alors que le chapitre déclare des unités, ou inconnu ;
- `lessonIds` d'une question absente du même chapitre ;
- `coreQuestionIds` inconnu, dupliqué, ou question qui ne référence pas la leçon ;
- `sectionChecks` sur une section inconnue, une question non cœur, ou épuisant toutes les questions
  cœur (il en faut au moins une pour le quiz final) ;
- identifiants, slugs, ordres de leçon ou fichiers média dupliqués ;
- `correctOptionId` absent des options, ou identifiants d'options dupliqués ;
- `sourceRefs.documentId` non déclaré dans `content/sources.yaml` ;
- `mediaId` ou `mediaId` d'option non déclaré ;
- image Markdown hors `/media/`, ou fichier `/media/...` non déclaré ou absent de `public/` ;
- fichier média déclaré dont le fichier n'existe pas.

Avertissements à ne pas ignorer :

- chapitre sans aucune question (entraînement indisponible) ;
- preset avec moins de questions éligibles que `questionCount`.

## Publication, version et snapshots

- `status` : `draft`, `in_review` ou `published`. Le skill ne produit que `draft` ou `in_review`.
- `published` exige `reviewedBy` et `reviewedAt` réels. Ne jamais les inventer ni les recopier d'un
  autre fichier.
- `origin` : `manual`, `ai_assisted` ou `original`. Une reformulation assistée reste
  `ai_assisted` ; `original` ne signifie pas « libre de droits ».
- Toute modification de fond incrémente `version` et repasse le contenu en `in_review`. Une
  modification d'un contenu publié sans nouvelle relecture est interdite.
- Les tentatives enregistrent un snapshot des questions. Modifier un fichier ne réécrit pas
  l'historique. En revanche, les médias sont résolus en direct depuis le catalogue : ne jamais
  supprimer ni renommer un média encore référencé par un snapshot.
- Ne jamais réutiliser un identifiant supprimé. Ne jamais renuméroter.

## Dimensionnement et parcours

- Une leçon publiée doit déclarer **4 ou 5 questions cœur**. En brouillon, un autre nombre est un
  avertissement, pas une erreur — mais le corriger avant `in_review`.
- Viser un pool d'environ **8 questions par leçon** pour alimenter l'entraînement, sans compter les
  questions de révision.
- Chaque question du pool référence au moins une leçon. Une question peut servir plusieurs leçons
  si elle est réellement transversale.
- **Une seule vérification de section par leçon**, placée après la section la plus dense, avec 1 ou
  2 questions. Les autres questions cœur forment le quiz final (2 à 4 questions). Le schéma autorise
  plusieurs `sectionChecks` ; la règle éditoriale n'en veut qu'un. Les leçons existantes sont
  migrées progressivement.
- Le moteur repose automatiquement les questions ratées à la fin de la leçon. Ne pas créer de
  questions de consolidation ni dupliquer une question dans le quiz.
- `sectionChecks` : au plus une vérification par section, 1 ou 2 questions, et au moins une
  question cœur hors vérifications pour le quiz final.
- Défi d'unité : 10 questions maximum, tirées des questions dont au moins une `lessonIds` appartient
  à l'unité. Il se débloque quand toutes les leçons de l'unité sont lues. Le défi utilise
  `min(10, pool)` : une unité avec moins de 10 questions fonctionne, mais le format est incomplet.
- Examen de chapitre : **20 questions, 15 s, seuil 17/20, pénalités 1 et 5**. Il n'apparaît que si
  le chapitre déclare au moins une unité. Il se débloque quand toutes les leçons du chapitre sont
  lues et que le chapitre compte au moins 20 questions `examEligible`. Les brouillons comptent pour
  cet examen de chapitre ; le preset officiel, lui, n'utilise que le contenu publié et reste à
  50 questions / 41 sur 50.
- Un chapitre sans unité reste valide techniquement, mais n'offre ni défi d'unité ni examen de
  chapitre : ne pas le prévoir pour un parcours complet.

## Comptages et tests

`tests/unit/content/loader.test.ts` verrouille le nombre de chapitres, de leçons et de questions.
Tout ajout ou retrait de contenu doit mettre à jour ce test, puis les comptages de `README.md`,
`docs/CONTENT.md`, `docs/TESTING.md` et `docs/ROADMAP.md` lorsqu'ils sont cités. Ne pas annoncer un
comptage sans l'avoir mesuré avec `pnpm content:validate` et le test de chargement.

## Checklist avant de rendre un lot

- [ ] Chaque fichier est au bon emplacement et porte le bon nom.
- [ ] Aucun champ hors schéma.
- [ ] Toutes les références croisées existent et pointent dans le bon chapitre.
- [ ] Les 4 ou 5 questions cœur sont présentes, avec une seule vérification de section et 2 à 4
      questions finales.
- [ ] Aucun bloc « Piège d'examen » ni section « À retenir » ; les confusions utiles sont testées.
- [ ] Les médias sont déclarés, présents sous `public/` et les SVG sont originaux.
- [ ] Les sources sont déclarées et les pages vérifiées.
- [ ] Le statut est `draft` ou `in_review`, sans relecture inventée.
- [ ] Les comptages et tests sont à jour si le volume change.
- [ ] `pnpm content:validate` a été exécuté et lu.
