# Changelog

Toutes les évolutions notables de ce projet sont documentées ici.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le projet utilise le
versionnage sémantique.

## [Unreleased]

### Ajouté

- Socle Next.js 16 / React 19 / TypeScript strict / Tailwind 4, avec formatage, lint, typecheck et
  validation de contenu.
- Modèle de contenu YAML/Markdown validé par Zod : chapitres, leçons, questions (dont options
  illustrées), médias par chapitre, sources et presets d'examen.
- Questions cœur (4 ou 5) déclarées par leçon publiée pour alimenter un entraînement dédié.
- Unités de chapitre et parcours de micro-leçons : sections dérivées du Markdown, vérifications
  intercalées, quiz final, reprise à l'étape enregistrée et déblocage linéaire.
- Migration `0003_lesson_runs.sql` : rattachement d'une tentative à une leçon et mémorisation de
  l'étape courante.
- Migration `0004_attempt_units.sql` : rattachement d'une tentative à une unité pour les défis.
- Défi d'unité : 10 questions mélangées issues des leçons de l'unité, sans chronomètre ni seuil,
  débloqué quand toutes les leçons de l'unité sont terminées. Le dernier score reste affiché, avec
  un accès direct à la leçon suivante ; la révision n'est proposée qu'en cas d'erreur.
- Examen de chapitre : 20 questions, 15 s par question, seuil de 17 sur 20, débloqué quand toutes
  les leçons du chapitre sont terminées et que la banque compte assez de questions éligibles.
  Reprise d'un examen actif et pénalités 1 et 5 ; le preset officiel reste à 50 questions / 41.
- Parcours visuel Duolingo sur la page chapitre : chemin serpentin chapitre → unité → leçons, avec
  nœuds verrouillés, courant et terminés, accès de révision aux leçons terminées, défi d'unité en
  jalon de fin d'unité et examen de chapitre en évaluation finale.
- Cycle de publication `draft` / `in_review` / `published` avec relecture obligatoire.
- Chapitre 1 de démonstration : 2 leçons et 5 questions en brouillon.
- Chapitre 1 restructuré en deux unités et six micro-leçons (50 questions), avec vérifications de
  section et quiz final comme le chapitre 2.
- Page Théorie transformée en feuille de route verticale avec états terminé, en cours et à venir ;
  curseur pointeur sur les contrôles cliquables.
- Pilote du chapitre 2.1 : 7 leçons, 56 questions et 4 questions cœur par leçon, toutes en
  brouillon.
- Pilote du chapitre 2.2 : 6 leçons, 48 questions et 4 questions cœur par leçon, toutes en
  brouillon, avec 17 SVG originaux pour les feux, flèches, silhouettes et signaux de bandes.
- Preset belge francophone (50 questions, 15 s, 41/50, pénalités 1 et 5) et preset de démonstration
  (5 questions, brouillons autorisés).
- Persistance SQLite avec migrations versionnées et checksums, profil local unique et snapshots des
  questions.
- Tableau de bord, progression de lecture, entraînement par chapitre ou par leçon avec correction
  immédiate et options illustrées, examen blanc chronométré, reprise d'un examen en cours, résultats
  détaillés et révision des dernières erreurs.
- Contrôle du temps côté serveur avec délai de grâce de 2 secondes et protection contre les
  réponses hors délai.
- Suite de tests : 141 tests Vitest (domaine, contenu, migrations, repository, cas d'usage) et
  5 parcours Playwright avec base et build isolés.
- Documentation : README, règles de travail, contribution, architecture, développement, tests,
  contenu, décisions et feuille de route.
- Skill projet `produire-contenu-permis-b` : pipeline de production du contenu (cadrage, sources,
  rédaction, médias, validation), contrôles de publication et gabarits de fichiers.
- Skill projet `reviser-contenu-permis-b` : audit de longueur, de redondance, de réappropriation et
  de couverture des questions, sans publication automatique.
- Zoom plein écran des schémas et des tableaux ; les tableaux larges défilent horizontalement sur
  mobile et les schémas textuels passent en cartes empilées.
- Reprise des questions ratées à la fin d'une leçon : le score initial reste affiché, les erreurs
  sont reposées après le quiz et la leçon n'est marquée terminée qu'après la reprise.

### Modifié

- Une leçon à parcours est marquée terminée à la dernière réponse ; l'ancien marquage manuel reste
  disponible pour les leçons sans questions cœur.
- La leçon en cours est marquée lue automatiquement quand on ouvre la leçon suivante ou que l'on
  termine le chapitre.
- Interface allégée : header, footer et descriptions secondaires réduits ; pictogrammes du
  conducteur et du tram redessinés.
- Leçons pilotes du point 2.1 (`a-qui-obeir`, `les-quatre-degres-d-infraction`,
  `payer-une-amende`) réécrites en micro-parcours : une seule vérification de section, un quiz
  final, suppression des blocs « Piège d'examen » et « À retenir ». La nuance sur le signal
  d'arrêt devient la question `ch02-q333`.
- Agents et schéma des trois positions redessinés en SVG original.
- La banque compte 275 questions, dont 57 pour le point 2.1.

### Sécurité

- Les DTO publics d'examen n'exposent ni la bonne réponse ni l'explication.
- Le chemin SQLite est interdit dans `public/` et `data/`.
- Les scans personnels de `data/` sont ignorés par Git et jamais servis.
- En-têtes de sécurité de base configurés dans Next.js.
