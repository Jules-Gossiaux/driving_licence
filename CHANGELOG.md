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
- Cycle de publication `draft` / `in_review` / `published` avec relecture obligatoire.
- Chapitre 1 de démonstration : 2 leçons et 5 questions en brouillon.
- Pilote du chapitre 2.1 : 7 leçons, 56 questions et 4 questions cœur par leçon, toutes en
  brouillon.
- Preset belge francophone (50 questions, 15 s, 41/50, pénalités 1 et 5) et preset de démonstration
  (5 questions, brouillons autorisés).
- Persistance SQLite avec migrations versionnées et checksums, profil local unique et snapshots des
  questions.
- Tableau de bord, progression de lecture, entraînement par chapitre ou par leçon avec correction
  immédiate et options illustrées, examen blanc chronométré, reprise d'un examen en cours, résultats
  détaillés et révision des dernières erreurs.
- Contrôle du temps côté serveur avec délai de grâce de 2 secondes et protection contre les
  réponses hors délai.
- Suite de tests : 99 tests Vitest (domaine, contenu, migrations, repository, cas d'usage) et
  3 parcours Playwright avec base et build isolés.
- Documentation : README, règles de travail, contribution, architecture, développement, tests,
  contenu, décisions et feuille de route.

### Sécurité

- Les DTO publics d'examen n'exposent ni la bonne réponse ni l'explication.
- Le chemin SQLite est interdit dans `public/` et `data/`.
- Les scans personnels de `data/` sont ignorés par Git et jamais servis.
- En-têtes de sécurité de base configurés dans Next.js.
