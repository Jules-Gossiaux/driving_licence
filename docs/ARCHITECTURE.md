# Architecture

## Vue d'ensemble

Application Next.js locale, sans backend distant. Le contenu pédagogique est chargé depuis des
fichiers versionnés ; la progression et les tentatives sont persistées dans SQLite. Le domaine est
pur et ne dépend d'aucune technologie d'interface ou de stockage.

```text
Navigateur
   │  requêtes HTTP + Server Actions
   ▼
src/app  (Server Components, routes, actions)
   │
   ▼
src/application  (cas d'usage : examen, entraînement, requêtes)
   │            ↘ ports (LearningRepository)
   ▼                 ▲
src/domain           │ implémentation
(schémas, scoring,   │
 sélection, temps)   │
   ▲                 │
   └──── src/infrastructure
         (loader YAML/MD, SQLite, container)
              │                 │
              ▼                 ▼
          content/          var/app.db
       public/media/        migrations/
```

Règle de dépendance : `app → application → domain`. L'infrastructure dépend du domaine et de
l'application (elle implémente leurs ports), jamais l'inverse. Aucun composant React ne contient de
règle métier ni d'accès SQLite.

## Arborescence

```text
src/
  app/                    routes Next.js et Server Actions
    actions.ts            démarrage des parcours, réponses, lecture des leçons
    page.tsx              tableau de bord
    chapitres/            liste, détail chapitre, leçon
    entrainement/         hub et runner d'entraînement / révision
    examen/               hub des presets et runner d'examen
    resultats/[attemptId] résultat détaillé
    revision/             liste des dernières erreurs
  application/            cas d'usage et ports
    exam.ts               démarrer, ouvrir, répondre, finaliser un examen
    practice.ts           entraînement, révision, correction immédiate
    lesson-runs.ts        parcours de leçon : sections, vérifications, reprise
    queries.ts            projections pour le tableau de bord et les résultats
    content-views.ts      type des dépendances et projections de contenu
    ports.ts              contrat LearningRepository
  domain/                 logique pure, testable sans I/O
    content/              schémas Zod, catalogue, sections Markdown, erreurs
    exam/                 scoring, sélection aléatoire, temps
    learning/             types de tentative, snapshots, erreurs, progression
    clock.ts, profile.ts
  infrastructure/
    content/loader.ts     lecture et validation de content/
    db/open.ts            ouverture SQLite, garde-fou de chemin, profil local
    db/migrations.ts      runner de migrations avec checksums
    db/repository.ts      implémentation SQLite du port
    db/client.ts          instance unique côté serveur
    container.ts          assemblage des dépendances
  components/             composants d'interface (runner, navigation, parcours, UI)
  lib/format.ts           formats d'affichage français
content/                  source de vérité du contenu (versionnée)
public/media/             médias servis par l'application
data/                     documents personnels, ignorés par Git, jamais servis
migrations/               schéma SQLite versionné
scripts/                  migration et validation du contenu
tests/                    unitaires, intégration, E2E
var/                      base locale, ignorée par Git
```

## Routes

| Route                                                        | Rôle                                                         |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| `/`                                                          | Tableau de bord : statistiques, reprise, chapitres, presets  |
| `/chapitres`                                                 | Liste des chapitres                                          |
| `/chapitres/[slug]`                                          | Parcours visuel : unités, leçons et évaluations              |
| `/chapitres/[slug]/lecons/[lessonSlug]`                      | Leçon : programme, sources, démarrage ou reprise du parcours |
| `/chapitres/[slug]/lecons/[lessonSlug]/parcours/[attemptId]` | Runner de micro-leçon : sections et questions mêlées         |
| `/entrainement`                                              | Choix d'un entraînement par chapitre ou d'une révision       |
| `/entrainement/[attemptId]`                                  | Runner d'entraînement, de défi ou de révision                |
| `/examen`                                                    | Presets disponibles, verrouillés ou non                      |
| `/examen/[attemptId]`                                        | Runner d'examen blanc ou d'examen de chapitre                |
| `/resultats/[attemptId]`                                     | Résultat, détail par question, explications et sources       |
| `/revision`                                                  | Questions dont la dernière réponse est fausse                |

Toutes les pages sont rendues dynamiquement (`force-dynamic` dans le layout racine) : la
progression et les tentatives ne doivent jamais être servies depuis un cache statique.

### Server Actions

| Action                       | Effet                                                           |
| ---------------------------- | --------------------------------------------------------------- |
| `startPracticeAction`        | Crée une tentative `practice` pour un chapitre                  |
| `startLessonPracticeAction`  | Crée un entraînement à partir des questions cœur d'une leçon    |
| `startLessonRunAction`       | Crée ou reprend le parcours d'une leçon débloquée               |
| `saveLessonRunStepAction`    | Mémorise l'étape courante du parcours (progression seule)       |
| `startReviewAction`          | Crée une tentative `review` à partir des dernières erreurs      |
| `startUnitChallengeAction`   | Crée un défi `practice` rattaché à une unité                    |
| `startExamAction`            | Crée ou reprend l'examen actif d'un preset                      |
| `startChapterExamAction`     | Crée ou reprend l'examen actif d'un chapitre                    |
| `submitTrainingAnswerAction` | Enregistre une réponse et renvoie la correction immédiate       |
| `submitExamAnswerAction`     | Enregistre une réponse, passe à la question suivante ou termine |
| `markLessonReadAction`       | Met à jour la progression de lecture d'une leçon                |
| `continueLessonAction`       | Marque la leçon lue et ouvre la suivante ou le chapitre         |

Les entrées `FormData` sont validées avant usage. Les mutations ne se produisent que sur une
action explicite, jamais sur un GET.

## Flux principaux

### Chargement du contenu

1. `loadContentCatalog()` lit `content/sources.yaml`, `content/media.yaml`,
   `content/exam-presets/*.yaml` et chaque chapitre (`chapter.yaml`, `lessons/*.md`,
   `questions/*.yaml`).
2. Chaque entrée est validée par un schéma Zod strict ; le nom de fichier doit correspondre à
   l'identifiant ou au slug.
3. `buildContentCatalog()` vérifie les doublons, les références croisées, les leçons/chapitres
   incohérents, les médias absents et les images externes.
4. Toute erreur bloque le démarrage de l'application ; les avertissements (pool d'examen
   insuffisant, chapitre sans question) sont affichés par `pnpm content:validate`.

Aucune donnée de contenu n'est écrite en base. Modifier un YAML suffit à modifier le contenu, après
redémarrage ou rechargement côté serveur.

### Examen

1. `startExam` vérifie qu'aucun examen n'est déjà actif. Si un examen est actif, il est repris.
2. Le preset filtre les questions éligibles (`examEligible`, chapitre autorisé, statut publié sauf
   preset de démonstration). Le pool doit contenir au moins `questionCount` questions.
3. Les questions sont tirées et mélangées, leurs options sont mélangées, puis un **snapshot**
   complet est enregistré dans `attempt_questions`.
4. À l'ouverture, le serveur fournit la question courante et sa `deadlineAt`. Le client ne reçoit
   ni la bonne réponse ni l'explication.
5. À la soumission, le serveur vérifie la position, l'appartenance de l'option et l'échéance. Un
   délai de grâce de 2 s (`ANSWER_GRACE_MS`) absorbe la latence. Au-delà, la réponse est comptée
   comme temps écoulé.
6. La dernière réponse finalise la tentative : score, réussite, durée. Le résultat est calculé à
   partir des snapshots.

Un examen non terminé reste `in_progress` et peut être repris depuis le tableau de bord ; le
serveur recalcule le temps restant à chaque ouverture. Le dépôt sait marquer une tentative
`abandoned`, mais aucune interface ne propose encore cette action en V1.

### Entraînement et révision

- Entraînement : jusqu'à 10 questions du chapitre, sans chronomètre, correction immédiate après
  chaque réponse, score final = nombre de bonnes réponses, sans seuil de réussite.
- Parcours de leçon : le corps Markdown est découpé en sections (`##`). Une ou deux questions cœur
  peuvent être intercalées après certaines sections (`sectionChecks`) ; les questions restantes
  forment le quiz final. L'ordre est conservé, les options sont mélangées, et l'étape courante est
  mémorisée dans `attempts.lesson_step`. Reprendre un parcours actif ne crée pas de tentative.
- Les parcours sont persistés comme des tentatives `practice` avec `lesson_id` ; le mode `exam`
  n'est pas réutilisé. Terminer le parcours marque la leçon lue, ce qui débloque la suivante.
- Déblocage linéaire : une leçon non lue exige que la précédente soit lue. Une leçon terminée reste
  accessible pour révision.
- Une leçon sans questions cœur conserve l'ancien affichage de lecture et le marquage manuel.
- Entraînement de leçon : mêmes règles qu'un entraînement, à partir des `coreQuestionIds` (4 ou 5
  questions), accessible séparément du parcours.
- Révision : sélection des questions dont la **dernière** réponse en tentative terminée est fausse,
  éventuellement filtrées par chapitre, puis mêmes règles qu'un entraînement.
- Une tentative d'entraînement terminée ne peut plus recevoir de réponse.

### Défi d'unité et examen de chapitre

- Défi d'unité : accessible quand toutes les leçons de l'unité sont lues. Il tire 10 questions
  parmi celles référencées par les leçons de l'unité, les mélange, et se déroule comme un
  entraînement (`practice` avec `unit_id`) : sans chronomètre, correction immédiate, sans seuil.
  Le dernier défi terminé est affiché sur la page du chapitre. Un nouveau défi peut être lancé
  sans reprendre le précédent.
- Examen de chapitre : accessible quand toutes les leçons du chapitre sont lues, que le chapitre
  déclare des unités et que la banque contient au moins 50 questions `examEligible`. Il utilise le
  moteur d'examen (`exam` sans `preset_id`, avec `chapter_id`) : 50 questions, 15 s par question,
  seuil 41/50, pénalités 1 et 5. Un seul examen actif par profil, tous types confondus ; un examen
  en cours est repris au lieu d'en créer un autre. Contrairement au preset officiel, il accepte les
  questions en brouillon afin de rendre le pilote testable avant publication.
- Les deux fonctionnalités vérifient le déblocage côté serveur : l'action refuse une tentative si
  les leçons requises ne sont pas lues, même si le bouton est contourné.
- Un chapitre sans unités (chapitre 1 de démonstration) n'affiche pas d'examen de chapitre ; son
  entraînement et le preset démo restent disponibles.

### Parcours visuel

La page chapitre rend un chemin serpentin (`src/components/learning-path.tsx`) : un tracé SVG
décoratif relie des nœuds espacés régulièrement, dont la position alterne entre le centre, la
droite et la gauche. Chaque nœud de leçon est dérivé des données de progression :

- **terminé** : `readAt` renseigné, pastille verte et lien « Revoir » vers la leçon ;
- **courant** : première leçon non verrouillée, pastille indigo et `aria-current="step"` ;
- **verrouillé** : `locked`, pastille grise non interactive avec libellé « Verrouillée ».

Le défi d'unité forme le dernier nœud du chemin et l'examen de chapitre une évaluation finale
distincte, avec les mêmes règles de déblocage que les cas d'usage. Le parcours est rendu côté
serveur ; seules les actions de lancement sont des formulaires. Aucun état de parcours
supplémentaire n'est stocké : la vérité reste `lesson_progress` et les tentatives.

### Statistiques et révision des erreurs

`getCompletedStats` ignore les tentatives `abandoned` et les questions sans réponse.
`getLatestIncorrectQuestionIds` classe les réponses par date de fin de tentative décroissante et ne
retient que la plus récente par question ; seules les tentatives terminées comptent.

## Modèle de contenu

```text
sources.yaml          documents utilisés comme références (manuel, sources officielles)
media.yaml            médias servis et leurs droits
exam-presets/*.yaml   format et filtres d'un examen
chapters/<slug>/
  chapter.yaml        métadonnées du chapitre
  media.yaml          médias du chapitre (facultatif)
  lessons/*.md        front matter YAML + corps Markdown
  questions/*.yaml    énoncé, options, bonne réponse, explication, sévérité
```

Statuts : `draft`, `in_review`, `published`. Une publication exige `reviewedBy` et `reviewedAt`.
Origine : `manual`, `ai_assisted`, `original`.

Éligibilité à un examen officiel : question `examEligible`, question `published` **et** chapitre
`published`. Un preset avec `allowUnpublished: true` (démonstration) contourne cette règle.

Chaque question référence au moins un document source traçable (`sourceRefs`). Les médias servis
vivent sous `/media/` et doivent exister dans `public/` ; les scans de `data/` ne sont jamais
référencés.

Un chapitre peut déclarer des `units` (identifiant, slug, ordre, label, titre). Chaque leçon peut
être rattachée à une unité via `unitId` ; si un chapitre déclare des unités, toutes ses leçons
doivent en référencer une.

Une leçon peut déclarer `coreQuestionIds` (4 ou 5 à la publication) ; ces questions alimentent son
parcours et son entraînement dédié. `sectionChecks` associe une section Markdown à une ou deux
questions cœur ; au moins une question cœur doit rester pour le quiz final. Les sections sont
dérivées du corps (`##`), sans stockage séparé. Une option de question peut référencer un `mediaId`
déclaré dans un manifeste média global ou de chapitre. Le lien est conservé dans le snapshot JSON,
ce qui rend les réponses illustrées compatibles avec les tentatives existantes.

## Modèle SQLite

```text
profiles 1 ─── N attempts 1 ─── N attempt_questions
    │
    └───── N lesson_progress
```

| Table               | Rôle                                                                           |
| ------------------- | ------------------------------------------------------------------------------ |
| `profiles`          | Profil local unique (`local`) ; prépare un futur multi-profils                 |
| `lesson_progress`   | Date de lecture par leçon                                                      |
| `attempts`          | Mode, statut, configuration, score, dates, position, leçon ou unité            |
| `attempt_questions` | Snapshot JSON, dates de présentation/échéance/réponse, correction, temps passé |
| `schema_migrations` | Version, checksum SHA-256, date d'application                                  |

Invariants principaux :

- `question_count > 0`, pénalités strictement positives, seuil de réussite positif ou nul.
- `UNIQUE (attempt_id, question_id)` : une question n'apparaît qu'une fois par tentative.
- Index partiel `attempts_one_active_exam_per_profile` : au plus un examen `in_progress` par profil.
- `lesson_id` identifie un parcours de leçon ; `lesson_step` mémorise l'étape courante et ne recule
  jamais. Un parcours actif est unique par profil et par leçon.
- `unit_id` identifie un défi d'unité terminé ; il est indépendant de `lesson_id` et ne crée pas de
  reprise dédiée. L'examen de chapitre se reconnaît à `mode = 'exam'`, `preset_id IS NULL` et
  `chapter_id` renseigné.
- Les dates sont stockées en ISO 8601 UTC (`...Z`).
- Le score d'examen vaut `max(0, question_count − pénalités)` ; le score d'entraînement vaut le
  nombre de bonnes réponses.
- Les snapshots sont validés à la lecture ; une incohérence entre snapshot et colonnes lève une
  erreur plutôt que d'afficher un résultat faux.

Migrations : `migrations/NNNN_nom.sql`, appliquées dans l'ordre, une transaction par fichier,
checksum vérifié. Une migration déjà appliquée ne doit jamais être modifiée.

## Sécurité et confidentialité

- Aucun compte, aucune authentification, aucun envoi de données à un tiers.
- `DATABASE_PATH` ne peut pas pointer dans `public/` ou `data/`.
- Les modules de base de données et de contenu importent `server-only`.
- Pendant un examen, les DTO publics excluent `correctOptionId` et `explanation`.
- Le temps est autoritatif côté serveur ; le client ne fait qu'afficher.
- Les en-têtes de sécurité sont définis dans `next.config.ts` (nosniff, frame DENY, referrer
  policy, permissions restreintes).
- La base locale n'est pas chiffrée ; sa protection relève des permissions du système.

## Limites connues

- Un seul profil local ; pas de synchronisation entre appareils.
- Pas d'export/import de la progression.
- Pas d'action d'abandon d'examen dans l'interface.
- Le contenu de démonstration n'est pas une vérité d'examen.
- Le build Turbopack émet des avertissements de traçage de fichiers dynamiques pour le loader et
  les migrations ; ils sont attendus et documentés dans `docs/DEVELOPMENT.md`.
