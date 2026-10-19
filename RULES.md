# Règles de travail — Permis B Belgique

Ce fichier adapte le modèle universel `D:\code\A_new_projects\rules.md` au présent dépôt. Il
s'applique à tout intervenant, humain ou agent IA. En cas de conflit, le code réellement exécuté
prime sur la documentation, et ce fichier prime sur les habitudes personnelles.

Les règles sont volontairement proportionnées : une retouche de texte ne demande pas la même
cérémonie qu'une migration de données. Le niveau d'exigence monte avec le risque.

## 1. Contexte du projet

| Champ                         | Valeur                                                                                                                                                                                                           |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nom du projet                 | Permis B Belgique (`permis-b-belgique`)                                                                                                                                                                          |
| Objectif en une phrase        | Préparer l'examen théorique du permis B belge francophone avec des leçons, un entraînement corrigé, un examen blanc chronométré et une révision des erreurs.                                                     |
| Utilisateurs                  | D'abord l'auteur du projet, qui apprend le code belge ; ensuite d'éventuels apprenants francophones ; commercialisation envisagée plus tard.                                                                     |
| Stack, langages, frameworks   | Next.js 16.4 (App Router), React 19, TypeScript 5.9 strict, Tailwind CSS 4, Node.js 24 avec `node:sqlite`, Zod 4, YAML/Markdown, Vitest 5, Playwright 1.64, pnpm 10.17.                                          |
| Plateformes et environnements | Application web exécutée localement (Windows, macOS ou Linux) avec Node.js 24+ ; aucun hébergement ni backend distant prévu en V1.                                                                               |
| Modèle                        | Local-first : contenu versionné dans des fichiers, progression et tentatives dans SQLite.                                                                                                                        |
| Données sensibles manipulées  | Progression de lecture, tentatives et réponses. Les scans du manuel sous `data/` sont réservés à un usage personnel et ne sont jamais servis. Aucun compte, aucune donnée envoyée à un tiers.                    |
| Contraintes clés              | Exactitude du code de la route **belge**, respect des droits sur les contenus, aucune dépendance à un service en ligne, migrations rejouables, structure prête pour un futur backend sans réécriture du domaine. |

Vocabulaire du domaine : une **théorie** est portée par des leçons ; un **entraînement** corrige
immédiatement ; un **examen blanc** est chronométré et noté ; une **révision** rejoue les
dernières erreurs ; une **tentative** (`attempt`) est une instance persistée d'un de ces parcours.

## 2. Priorités

Ne jamais sacrifier une priorité supérieure pour livrer plus vite ou ajouter du polish.

1. Exactitude du contenu et intégrité des données historiques.
2. Droits d'usage des contenus et respect de la vie privée.
3. Sécurité.
4. Fiabilité et comportement prévisible.
5. Maintenabilité et simplicité.
6. Tests et observabilité utiles.
7. Accessibilité et expérience utilisateur.
8. Performance mesurée.
9. Apparence et fonctionnalités secondaires.

L'exactitude passe avant la quantité : mieux vaut dix questions vérifiées que cinquante
approximations. Une tentative terminée doit rester lisible même si le contenu source change
ensuite.

## 3. Principes transverses

### 3.1 Proportionnalité

- **Changement local et évident** (texte, style, micro-correctif) : inspecter les fichiers, règles
  et tests directement concernés ; valider de façon ciblée ; rester sur la branche de travail
  existante si elle couvre déjà l'objectif.
- **Changement structurel, migration, intégration externe, opération sur les données ou Git
  importante** : inspection complète (section 4), validations complètes, branche dédiée.

En cas de doute, prendre le niveau supérieur.

### 3.2 Changement minimal

- Résoudre la cause du problème, pas seulement le symptôme.
- Ne jamais refactorer de code sans rapport avec la tâche.
- Ne jamais introduire d'abstraction pour un cas d'usage hypothétique ; extraire un module à
  partir du deuxième ou troisième cas réel.
- Ne jamais remplacer une technologie ou une dépendance fonctionnelle sans bénéfice concret.
- Modifier le moins de fichiers possible tout en conservant une architecture correcte.
- Une correction locale ne devient une refonte que sur demande explicite ou justification
  documentée.

### 3.3 Honnêteté

- Ne jamais présenter comme existant, compatible ou testé ce qui n'a pas été vérifié par le code
  ou par une commande réellement exécutée.
- Ne jamais annoncer « l'examen est prêt » tant que la banque publiée ne couvre pas le format
  officiel. Le contenu de démonstration est explicitement signalé comme non fiable.
- Si une validation échoue : corriger la cause quand elle appartient au changement ; sinon
  documenter précisément l'échec sans prétendre qu'elle est réussie.

## 4. Inspection avant d'agir

Avant de créer, modifier ou supprimer quoi que ce soit, au niveau défini en 3.1 :

1. Identifier le répertoire de travail et l'objectif de la tâche.
2. Lire `RULES.md`, `README.md`, `CONTRIBUTING.md`, `docs/` et la configuration CI disponible.
3. Inspecter l'arborescence, `package.json`, les scripts, les migrations et les dépendances.
4. Vérifier l'état Git : branche courante, modifications en cours, remotes, derniers commits.
5. Vérifier les outils disponibles et leurs versions (`node --version`, `pnpm --version`).
6. Chercher les tests, workflows, mécanismes de build et de déploiement concernés.
7. Identifier les changements déjà présents : ne jamais les écraser silencieusement, ne jamais
   reformater des fichiers sans nécessité.
8. Signaler les incohérences entre documentation, code et comportement réellement vérifié.

## 5. Décisions et hypothèses

Avant toute décision structurante, identifier :

- le problème résolu et les utilisateurs concernés ;
- les plateformes et versions ciblées ;
- les données importantes ou sensibles ;
- le caractère local-first, connecté ou hybride ;
- les contraintes de coût, compatibilité et déploiement ;
- le périmètre indispensable du MVP et les limitations acceptées.

Une question non critique ne doit pas bloquer : formuler une hypothèse explicite, choisir la
solution la plus simple et réversible, et la documenter dans `docs/DECISIONS.md` si elle influence
l'architecture ou le produit.

**Hypothèses structurantes déjà actées** (détail dans `docs/DECISIONS.md`) :

- Belgique francophone, et non France : les règles, panneaux et formats d'examen doivent être
  belges.
- Aucun backend ni authentification en V1 : un profil local unique (`local`).
- Le contenu reste dans des fichiers versionnés ; SQLite ne stocke que la progression et les
  tentatives.
- Le format officiel (50 questions, 15 s, 41/50) est un paramètre de preset, pas une constante du
  moteur.
- La révision des erreurs simple suffit en V1 ; pas de répétition espacée.

## 6. Architecture et code

### Adapter à l'existant

- Respecter les couches et conventions décrites dans `docs/ARCHITECTURE.md`.
- Utiliser Prettier, ESLint et TypeScript strict en continu ; ne pas livrer de code non formaté.
- Ne pas introduire d'ORM ni de bibliothèque de state management sans décision documentée.

### Structure scalable

- Séparer : domaine (`src/domain`), application (`src/application`), infrastructure
  (`src/infrastructure`), interface (`src/app`, `src/components`).
- Les dépendances vont dans un seul sens : interface → application → domaine. L'infrastructure
  implémente les ports définis par l'application ; le domaine ne connaît ni Next.js, ni SQLite.
- Aucune règle métier complexe ni persistance dans un composant React.
- Modules à responsabilité unique, frontières stables, aucune dépendance circulaire.
- La structure reste proportionnée à la taille réelle du projet.

### Qualité du code

- Préférer un code explicite, lisible et facilement supprimable à une abstraction générique.
- Ne pas dupliquer les sources de vérité : un schéma Zod est la référence d'un format de contenu.
- Utiliser des identifiants stables en kebab-case ; un titre affiché n'est jamais une clé métier.
- Utiliser des timestamps ISO 8601 UTC (`...Z`) pour toute persistance.
- Valider toutes les entrées aux frontières : `FormData` des Server Actions, fichiers de contenu,
  paramètres de route, réponses d'examen.
- Ne pas masquer une erreur importante derrière une valeur silencieuse ou un fallback trompeur.
- Ne pas ajouter de dépendance sans vérifier nécessité, compatibilité, maintenance et licence.

### Règles métier sensibles

- **Temps serveur** : les échéances d'examen sont calculées et vérifiées côté serveur. Le compte à
  rebours client est un affichage, jamais une autorité. Un délai de grâce de 2 s absorbe la
  latence réseau (voir `ANSWER_GRACE_MS`).
- **Pas de fuite de correction** : pendant un examen actif, les DTO publics ne contiennent ni la
  bonne réponse ni l'explication. Les snapshots complets restent côté serveur.
- **Intégrité historique** : chaque tentative stocke un snapshot de la question (énoncé, options,
  bonne réponse, explication, sévérité, sources). Modifier le contenu source ne réécrit pas le
  passé.
- **Notation** : une erreur normale coûte `errorPenalty`, une faute grave
  `severeErrorPenalty`, un temps écoulé coûte une erreur normale ; le score ne descend pas sous 0.
- **Une seule session d'examen en cours** par profil, garantie par un index partiel SQLite.
- **Révision** : une question n'est proposée que si sa dernière réponse en tentative terminée est
  fausse. Une bonne réponse ultérieure la retire de la liste.

## 7. Règles spécifiques à la plateforme

### Next.js / React

- App Router, Server Components par défaut. Un composant client n'est créé que pour une
  interaction réelle (chronomètre, sélection de réponse).
- Les modules qui touchent la base ou le système de fichiers importent `server-only`.
- Les pages qui lisent SQLite ou la progression sont dynamiques ; ne jamais les prérendre
  statiquement ni les mettre en cache comme du contenu public.
- Les Server Actions valident leurs entrées et ne modifient l'état que sur une action explicite
  (jamais sur un simple GET).
- Ne pas exposer `DATABASE_PATH`, les chemins sous `data/` ou des secrets au client.
- La télémétrie Next.js est désactivée (`NEXT_TELEMETRY_DISABLED=1`).

### SQLite (`node:sqlite`)

- Node.js 24+ est obligatoire : `node:sqlite` n'existe pas dans les versions antérieures.
- Les migrations sont **append-only**, numérotées, à transaction unique et vérifiées par un
  checksum SHA-256. Ne jamais modifier une migration déjà appliquée : en ajouter une nouvelle.
- Le chemin de la base ne peut jamais se trouver dans `public/` ou `data/` ; le garde-fou
  `resolveDatabasePath` doit rester en place.
- Activer les clés étrangères, `busy_timeout` et WAL comme le fait `openDatabase`.
- Ne jamais supprimer silencieusement une tentative : utiliser le statut `abandoned`.

### Contenu et droits

- `content/` est la source de vérité versionnée. `data/` contient des documents personnels
  ignorés par Git, jamais copiés dans `public/` ni référencés par l'application.
- Les médias servis vivent sous `public/media/` et sont déclarés dans `content/media.yaml`.
- Un contenu `published` exige `reviewedBy` et `reviewedAt`. Un examen officiel n'utilise que des
  questions publiées dont le chapitre est publié.
- Les SVG servis doivent être des originaux du projet. Aucun média ne peut provenir d'un scan du
  manuel sans droits explicites.
- Toute affirmation de règle belge doit être adossée à une source officielle ou au manuel avec
  référence de page. L'OCR seul ne suffit pas.
- La commercialisation éventuelle exigera des droits sur les contenus ou une réécriture originale.

### Navigateur et tests d'interface

- L'application n'a pas de backend distant : aucun test ne doit dépendre du réseau.
- Les tests E2E utilisent une base et un répertoire de build isolés (`NEXT_DIST_DIR=.next-e2e`,
  base fraîche sous `var/`) et ne doivent jamais toucher `var/app.db`.
- Vérifier les parcours critiques sur desktop et mobile avant une livraison visuelle.

### Développement sous Windows

- Utiliser Git Bash et des chemins compatibles (le code normalise déjà les séparateurs).
- Un serveur `next dev` orphelin verrouille `.next` ; identifier le processus avant de le tuer.
- Les scripts E2E évitent ce verrou grâce à `.next-e2e` ; ne pas le réutiliser pour le serveur
  de développement.

## 8. Données, migrations et sécurité

- Le modèle de données et les invariants sont décrits dans `docs/ARCHITECTURE.md`.
- Toute modification de schéma est versionnée, rejouable exactement une fois (idempotente) et
  testée.
- Utiliser des transactions pour les opérations multi-étapes.
- Définir le comportement en cas d'interruption, doublon, donnée manquante ou invalide.
- Ne jamais supprimer silencieusement des données ; documenter et tester toute opération
  destructive.
- Ne jamais commiter de secret, token, certificat privé ou donnée utilisateur. `.env` est ignoré ;
  seul `.env.example` est versionné.
- Réduire les logs au nécessaire ; ne jamais loguer de contenu sensible.
- Vérifier dépendances, permissions, entrées utilisateur et fichiers importés.
- La base locale est un fichier non chiffré : la protéger par les permissions du système
  d'exploitation, pas par un mécanisme applicatif inexistant.

## 9. Tests et qualité

Pyramide adaptée :

- tests unitaires pour le domaine déterministe ;
- tests d'intégration pour SQLite, les migrations et les cas d'usage ;
- tests de contrat pour les schémas de contenu ;
- tests E2E pour les parcours critiques.

Chaque comportement observable important est testé : cas nominal, erreurs et données invalides,
limites (pool insuffisant, temps écoulé, reprise), régressions de bugs connus, permissions et
états hors ligne lorsque concerné.

**Commandes du projet :**

```text
installation       : corepack enable && corepack prepare pnpm@10.17.0 --activate && pnpm install
développement      : pnpm dev
formatage          : pnpm format
vérif. formatage   : pnpm format:check
lint               : pnpm lint
typecheck          : pnpm typecheck
contenu            : pnpm content:validate
tests ciblés       : pnpm exec vitest run tests/unit/domain/scoring.test.ts
tests unitaires    : pnpm exec vitest run tests/unit
tests intégration  : pnpm exec vitest run tests/integration
suite complète     : pnpm check
build              : pnpm build
E2E                : pnpm exec playwright install chromium && pnpm test:e2e
tout               : pnpm check:full
migrations         : pnpm db:migrate
```

**Validations proportionnées (règle 3.1)** : toujours exécuter les tests ciblés ; exécuter
`pnpm check` et, si le changement peut les affecter, le build et les E2E avant livraison.

## 10. Documentation — objectif 10 minutes

Une personne qui ne connaît rien au projet doit, en 10 minutes et sans aide, pouvoir :

1. dire ce que fait le projet et pour qui ;
2. le lancer localement ;
3. situer chaque composant majeur dans l'arborescence ;
4. dire ce qui fonctionne réellement, ce qui est prévu et ce qui est hors périmètre.

### Fichiers de référence

- `README.md` — objectif, démarrage rapide, commandes, limites.
- `docs/ARCHITECTURE.md` — couches, routes, flux, modèle SQLite.
- `docs/DEVELOPMENT.md` — environnement local, scripts, dépannage.
- `docs/TESTING.md` — stratégie, commandes, couverture réelle, limites.
- `docs/CONTENT.md` — création, validation et publication du contenu.
- `docs/ROADMAP.md` — état réel, suites prévues, hors périmètre.
- `docs/DECISIONS.md` — décisions d'architecture et de produit.
- `CHANGELOG.md` — journal des changements.

### Cadence atomique

- Toute modification de comportement, d'API, de commande, de structure ou de limite connue livre sa
  documentation **dans le même commit ou la même PR que le code**.
- Une documentation obsolète est un bug, pas une dette acceptable.
- Ne jamais écrire qu'une fonctionnalité existe, qu'une plateforme est compatible ou qu'un test
  passe sans preuve dans le code ou les commandes exécutées.
- Avant de taguer une version : relire `README.md` et `docs/`, corriger les écarts.

## 11. Git et traçabilité

Objectif : retrouver et comprendre n'importe quelle ancienne version en moins de deux minutes.

### Branches de session

- Ne jamais travailler directement sur `main` / `master`.
- Une branche par objectif, pas par sous-tâche.
- Nommage : `feat/<zone>-<nom>`, `fix/<zone>-<nom>`, `docs/<nom>`, `refactor/<zone>-<nom>`,
  `test/<zone>-<nom>`, `chore/<nom>`.
- Utiliser un worktree pour les travaux parallèles ; ne jamais toucher aux modifications d'un
  autre worktree ou d'un autre agent.

### Autonomie : local automatique, distant sur demande

- L'agent gère librement et sans validation : création de branches, commits, stash local.
- L'agent ne fait **jamais** sans demande explicite : push, merge, ouverture ou mise à jour de PR,
  création de tag, publication de release, force-push, `reset --hard`, suppression de branche ou
  de worktree distant.

### Commits

- Petits, cohérents, en Conventional Commits : `feat`, `fix`, `docs`, `refactor`, `test`, `chore`,
  `perf`, `style`, `ci`, `build`.
- Un commit = une intention ; jamais de changement sans rapport dans un même commit.
- Corps du commit dès que le « pourquoi » n'est pas évident dans le titre.
- Relire `git status` et `git diff` avant chaque commit : aucun secret, aucun artefact de build,
  aucun fichier accidentel, rien sous `data/`, `var/`, `.next*`, `test-results/`.

### Pull requests

- Une PR par unité de travail révisable et testable.
- Contenu obligatoire : contexte, comportement attendu, changements, tests exécutés et résultats,
  limites, captures si l'interface change.
- Vérifier la CI avant de demander le merge.
- Une PR validée est mergée avant d'empiler des fonctionnalités dépendantes, sauf raison
  documentée.
- Après merge : synchroniser la branche principale localement ; ne jamais supprimer une branche
  distante sans demande explicite.

### Versions : tags, releases, changelog

- SemVer : `PATCH` corrections, `MINOR` fonctionnalités rétrocompatibles, `MAJOR` ruptures.
- Tag annoté sur la branche principale à chaque livraison notable :
  `git tag -a vX.Y.Z -m "Version X.Y.Z — résumé"`.
- Release GitHub pour chaque tag, si un dépôt distant existe et si l'utilisateur le demande :
  `gh release create vX.Y.Z --title "X.Y.Z" --notes-file <notes>`.
- `CHANGELOG.md` au format Keep a Changelog : `Unreleased` en tête, puis une section par version,
  catégories Ajouté, Modifié, Déprécié, Supprimé, Corrigé, Sécurité.
- Le changelog est mis à jour **dans le même commit que le changement visible**.

### Retrouver une ancienne version

- `git log --oneline --decorate` : historique et tags.
- `git log -S "<chaîne>"` / `git log -p <fichier>` : retrouver quand et pourquoi un code a changé.
- `git blame <fichier>` : origine de chaque ligne.
- `git tag` et page Releases : versions livrées.
- `git switch --detach vX.Y.Z` ou worktree temporaire : explorer sans toucher à la branche
  courante.
- `CHANGELOG.md` : fil conducteur lisible.

## 12. Workflow de référence d'un changement

1. Décrire le besoin et les critères d'acceptation.
2. Inspecter l'implémentation concernée, à la profondeur définie en 3.1.
3. Identifier le plus petit changement vérifiable.
4. Identifier les risques : données, droits, compatibilité, sécurité, régressions.
5. Implémenter sans élargir le périmètre.
6. Ajouter ou mettre à jour les tests.
7. Exécuter les validations proportionnées ; suite complète et build si nécessaire.
8. Relire le diff entier : rechercher fichiers et changements accidentels.
9. Mettre à jour la documentation et le changelog dans le même commit que le code.
10. Créer un commit ciblé sur la bonne branche de session.
11. Sur demande explicite uniquement : push, PR, tag, release.
12. Donner un compte rendu exact : changements, commandes exécutées, résultats, limites, prochaine
    étape.

## 13. Critères de fin de tâche

Une tâche n'est terminée que si :

- le code est compréhensible et limité au besoin ;
- les tests pertinents existent et passent ;
- typage, lint et formatage sont validés ;
- la documentation reflète le comportement réel, limites comprises ;
- le diff ne contient aucun changement sans rapport ;
- le commit est créé sur la bonne branche ;
- la PR est prête à être relue si une livraison a été demandée ;
- aucun résultat n'est présenté comme vérifié sans avoir été réellement exécuté.
