# Décisions

Chaque décision structurante est consignée ici avec son contexte, son choix et ses conséquences.
Les décisions sont datées du 2026-10-19 sauf mention contraire.

## D-001 — Application local-first, sans backend

**Contexte** : usage personnel immédiat, apprentissage seul, volonté de ne pas dépendre d'un
service en ligne ni d'un compte.

**Décision** : Next.js exécuté localement, SQLite en fichier, aucun backend distant ni
authentification. Un profil local unique (`local`).

**Conséquences** : démarrage simple, données privées, pas de synchronisation entre appareils. Le
domaine et les ports sont séparés pour permettre plus tard un backend sans réécrire les règles.

## D-002 — Contenu en fichiers, progression en base

**Contexte** : le contenu doit être relu, versionné et diffusable facilement ; la progression est
personnelle et évolue en continu.

**Décision** : YAML/Markdown dans `content/` comme source de vérité ; SQLite uniquement pour la
progression et les tentatives.

**Conséquences** : contenu relu et versionné avec Git, aucune migration de contenu. La base ne
contient pas de copie permanente de la banque ; les snapshots des tentatives sont l'exception
volontaire, pour l'intégrité historique.

## D-003 — Next.js 16, React 19, TypeScript strict, Tailwind 4

**Contexte** : besoin d'une interface locale complète, testable, avec rendu serveur et actions
serveur, sans vouloir maintenir une API séparée.

**Décision** : App Router, Server Components par défaut, Server Actions pour les mutations,
TypeScript strict, Tailwind pour le style.

**Conséquences** : un seul processus pour l'interface et la logique. Les pages dépendant de la base
sont dynamiques ; aucun cache statique ne doit servir une progression périmée.

## D-004 — `node:sqlite` et runner de migrations maison

**Contexte** : projet local, petite base, volonté de limiter les dépendances natives et les ORM.

**Décision** : utiliser `node:sqlite` (Node 24+) et un runner de migrations SQL versionnées avec
checksum SHA-256 et une transaction par fichier. Pas d'ORM.

**Conséquences** : Node 24 obligatoire, SQL explicite, migrations append-only. Le repository
manuel doit être maintenu et testé. Une migration modifiée après application est refusée.

## D-005 — Snapshots des questions dans les tentatives

**Contexte** : le contenu évolue ; un résultat passé doit rester compréhensible et incontestable.

**Décision** : enregistrer dans `attempt_questions` un snapshot complet (énoncé, options, bonne
réponse, explication, sévérité, sources). La correction et les résultats utilisent le snapshot.

**Conséquences** : historique fiable même après modification du contenu. La base grossit un peu
plus vite et les snapshots doivent être validés à la lecture.

## D-006 — Publication contrôlée et preset officiel verrouillé

**Contexte** : risque de produire des questions fausses ou d'annoncer un examen incomplet.

**Décision** : statuts `draft`, `in_review`, `published` ; publication conditionnée à
`reviewedBy` et `reviewedAt` ; un examen officiel n'utilise que des questions publiées dont le
chapitre est publié. Le preset est verrouillé si le pool est insuffisant. Seul un preset de
démonstration peut utiliser des brouillons.

**Conséquences** : impossible de lancer le preset 50 questions tant que la banque n'est pas prête ;
l'interface indique clairement le verrouillage.

## D-007 — Temps autoritatif côté serveur

**Contexte** : un chronomètre client est manipulable et la latence réseau peut faire perdre une
réponse valide.

**Décision** : le serveur fixe les échéances, vérifie chaque réponse et applique une grâce de 2 s
(`ANSWER_GRACE_MS`). Le client ne fait qu'afficher le temps restant.

**Conséquences** : comportement prévisible et difficile à contourner. Un léger retard réseau est
toléré sans fausser le temps passé enregistré.

## D-008 — Format d'examen paramétrable, format belge par défaut

**Contexte** : le format officiel peut évoluer et la démonstration a besoin d'un format réduit.

**Décision** : nombre de questions, durée, seuil et pénalités sont des champs de preset. Le preset
belge retient 50 questions, 15 s, 41/50, pénalités 1 et 5.

**Conséquences** : aucun format codé en dur dans le moteur. Toute évolution du format se fait dans
un fichier de contenu justifié par une source officielle.

## D-009 — Pas de répétition espacée en V1

**Contexte** : le besoin immédiat est de comprendre, s'entraîner, passer un examen blanc et revoir
ses erreurs.

**Décision** : révision simple des dernières erreurs ; pas d'algorithme de répétition espacée.

**Conséquences** : parcours plus simple et plus prévisible. Les données de tentatives permettront
d'ajouter un algorithme plus tard sans changer le modèle de base.

## D-010 — Tests Vitest et Playwright avec isolation stricte

**Contexte** : les parcours manipulent du temps, de l'aléatoire et une base locale.

**Décision** : domaine testé unitairement avec horloge et aléatoire injectés ; intégration sur
SQLite en mémoire ; E2E sur base fraîche et build `.next-e2e` séparés.

**Conséquences** : tests reproductibles et sans effet sur la base personnelle. Les E2E sont plus
lents et limités à Chromium.

## D-011 — Séparation stricte entre documents personnels et médias diffusés

**Contexte** : les scans du manuel sont protégés et leur diffusion peut violer des droits.

**Décision** : `data/` est ignoré par Git, interdit comme chemin de base SQLite et jamais servi.
Les médias de l'application vivent sous `public/media/`, sont déclarés dans `content/media.yaml`,
avec des droits vérifiés. Les SVG servis doivent être originaux.

**Conséquences** : aucun scan ne peut être exposé accidentellement par l'application. Une
commercialisation exigera des contenus originaux ou des droits explicites.

## D-012 — Un seul profil local, sans authentification

**Contexte** : V1 personnelle, pas de besoin de partage.

**Décision** : profil `local` créé automatiquement. Les tables conservent `profile_id` et les
requêtes filtrent par profil, sans interface de gestion.

**Conséquences** : pas de conflit ni de compte à gérer. L'ajout de profils demandera une interface,
une authentification et des règles de séparation des données.

## D-013 — Micro-leçons, questions cœur et grand pool

**Contexte** : progression rapide de type Duolingo, avec un besoin de s'entraîner au-delà des
questions vues dans la leçon.

**Décision** : chaque leçon publiée déclare 4 ou 5 `coreQuestionIds` qui alimentent un entraînement
dédié. Le pool d'un chapitre reste plus large (8 questions par leçon dans le pilote 2.1) et
l'entraînement de chapitre en tire jusqu'à 10.

**Conséquences** : la leçon reste courte, l'entraînement de leçon est immédiat et le pool permet des
sessions supplémentaires. La validation refuse une leçon publiée sans questions cœur ou avec des
identifiants incohérents.

## D-014 — Options illustrées et médias par chapitre

**Contexte** : les panneaux et situations de circulation se répondent par l'image ; le chapitre 2.3
comptera des dizaines de médias.

**Décision** : une option de question peut référencer un `mediaId`. Les médias sont déclarés dans
`content/media.yaml` ou dans un `media.yaml` propre au chapitre. Les illustrations servies sont des
SVG originaux, jamais des scans du manuel.

**Conséquences** : les réponses illustrées ne nécessitent aucune migration, car le `mediaId` est
conservé dans le snapshot JSON de la tentative ; les anciennes tentatives relisent `null`. Chaque
média reste soumis à la validation d'existence, de droits et d'alternative textuelle.

## D-015 — Micro-sections, parcours linéaire et reprise persistée (2026-10-20)

**Contexte** : les leçons restaient de longues pages ; l'objectif est une progression courte de type
Duolingo, avec des questions intercalées et un déblocage progressif.

**Décision** : découper le corps Markdown sur les titres `##` sans dupliquer le contenu en base.
Placer une ou deux questions cœur après certaines sections via `sectionChecks`, garder les autres
pour le quiz final. Persister un parcours comme une tentative `practice` portant `lesson_id`, avec
`lesson_step` pour reprendre au bon endroit. Le déblocage est linéaire dans le chapitre ; une leçon
terminée reste consultable.

**Conséquences** : aucune nouvelle valeur de `mode` ni reconstruction de la table `attempts` (le
`CHECK` SQLite imposerait de recréer la table et le runner de migrations applique chaque fichier
dans une transaction). Les sections restent dérivées du Markdown, donc un renommage de titre change
les identifiants utilisés par `sectionChecks` : la validation le signale. Le mode `practice` existant
reste compatible avec les écrans d'entraînement et de résultats.

## D-016 — Défi d'unité sans seuil, examen de chapitre avec seuil (2026-10-20)

**Contexte** : le parcours linéaire des leçons manquait d'un jalon de fin d'unité et d'une
évaluation finale de chapitre capable de valider les acquis avant de poursuivre.

**Décision** : après lecture de toutes les leçons d'une unité, proposer un défi de 20 questions
mélangées issues de l'unité, en mode entraînement (sans chronomètre ni seuil), avec affichage du
dernier score. Après lecture de toutes les leçons du chapitre, proposer un examen de chapitre au
format officiel (50 questions, 15 s, seuil 41/50, pénalités 1 et 5). Ajouter `attempts.unit_id`
(migration `0004`) pour identifier les défis sans créer de nouveau `mode` ; identifier l'examen de
chapitre par `mode = 'exam'`, `preset_id IS NULL` et `chapter_id`. Le déblocage est vérifié côté
serveur et non seulement dans l'interface. Un chapitre sans unités n'obtient pas d'examen de
chapitre.

**Conséquences** : les défis restent des tentatives d'entraînement, réutilisent les écrans de
correction et n'ont pas de reprise dédiée. L'examen de chapitre réutilise le moteur chronométré et
les snapshots, mais accepte les brouillons pour rendre le pilote testable avant publication ; il
partage l'unicité de l'examen actif avec les presets. Le seuil de 41/50 est cohérent avec le format
belge et ne s'applique qu'à cette évaluation finale.
