---
name: produire-contenu-permis-b
description: Créer ou compléter le contenu pédagogique original du projet Permis B belge (leçons Markdown, questions YAML, médias, sources, chapitres, presets) dans content/. Utiliser dès qu'il faut ajouter une leçon, une question, une illustration ou un chapitre, vérifier une règle belge, préparer des questions d'examen, ou traiter des scans de data/. Pour auditer, simplifier ou réécrire du contenu existant, utiliser plutôt reviser-contenu-permis-b. Ne pas utiliser pour du code applicatif sans lien avec le contenu.
---

# Produire du contenu pour le permis B

## Vue d'ensemble

Appliquer le pipeline de production du contenu : cadrage, extraction sourcée, vérification belge, rédaction originale, médias, validation et livraison en brouillon ou en relecture. Le skill ne publie jamais à la place d'un humain.

## Règles non négociables

- Lire `RULES.md`, `AGENTS.md`, [docs/CONTENT.md](../../../docs/CONTENT.md) et les schémas réels avant de modifier le contenu.
- Ne jamais travailler sur `main` ou `master`. Créer une branche dédiée si nécessaire.
- `content/` est la source de vérité. La base ne stocke que la progression et les tentatives ; les snapshots sont un historique immuable, pas une source à éditer.
- Reformuler. Ne jamais recopier le manuel ni un scan. Ne jamais placer un document de `data/` sous `public/`.
- Vérifier chaque règle sur une source officielle belge quand elle existe. En cas de doute ou de contradiction, s'arrêter et signaler ; ne jamais inventer un seuil, une exception ou un panneau.
- Ne jamais publier : produire `draft` ou `in_review`. Ne jamais renseigner `reviewedBy` ou `reviewedAt` sans relecture humaine réelle.
- Garder les identifiants et slugs stables. Ne jamais renuméroter ni réutiliser un identifiant existant.
- Un SVG servi doit être original. Aucun panneau inventé par l'IA ; une scène générée ne doit pas contenir de panneau, texte ou logo non validé.
- Valider réellement avant de déclarer un lot terminé. Ne pas annoncer un comptage sans l'avoir mesuré.

## Workflow

### 0. Cadrer

1. Lire les règles du dépôt, [docs/CONTENT.md](../../../docs/CONTENT.md), `references/contrat-contenu.md` et les fichiers de schéma réels.
2. Inspecter `content/` : chapitre, unité, leçons, questions, médias et sources existants. Relever les identifiants libres et les conventions locales.
3. Définir le périmètre exact : chapitre ou point, nombre de leçons, questions cœur, pool, médias. Pour tout lot de plus d'une leçon ou toute génération d'image, présenter le plan et attendre l'accord de l'utilisateur.
4. Vérifier la branche Git. Ne pas partir de `main`.

### 1. Extraire les faits

1. Identifier les pages ou zones fournies dans `data/`. Demander les pages manquantes plutôt que de deviner.
2. Construire un registre des règles : règle, seuil ou valeur exacte, page, source officielle, incertitude.
3. Considérer l'OCR comme une aide, jamais comme une vérité. Vérifier les passages critiques sur la photo de page et sur la source officielle.
4. Ne pas produire de contenu si une règle centrale reste illisible ou contradictoire.

### 2. Vérifier la règle belge

1. Utiliser d'abord les sources officielles fédérales ou régionales, puis le manuel avec page.
2. Ajouter toute nouvelle source dans `content/sources.yaml` avec URL HTTPS, `accessedAt`, `rights` et note. Ne citer qu'un identifiant déclaré.
3. Distinguer les règles fédérales des compétences régionales. Signaler les différences régionales et la date de consultation.
4. En cas de conflit : conserver le contenu en brouillon, documenter le conflit et demander un arbitrage.

Voir `references/sources-et-verification.md`.

### 3. Planifier

1. Décrire la structure : chapitre → unités → leçons → sections `##`.
2. Prévoir 3 ou 4 sections courtes par leçon et 4 ou 5 questions cœur, chacune rattachée à la leçon. Le pool par leçon doit permettre l'entraînement et, à terme, l'examen : viser 8 questions par leçon sauf justification.
3. Placer **une seule vérification de section** (1 ou 2 questions) après la section la plus dense. Les autres questions cœur forment le quiz final. Le moteur repose ensuite les questions ratées : ne pas prévoir de questions de consolidation.
4. Équilibrer difficulté (`easy`, `medium`, `hard`), sévérité (`normal`, `severe` rare), `examEligible` et tags. Prévoir les questions illustrées avec leurs médias dès le plan.
5. Pour un chapitre destiné à l'examen de chapitre, viser au moins 20 questions `examEligible` et au moins 20 questions par unité. Un chapitre sans unité n'aura ni défi ni examen de chapitre.
6. Faire valider le plan avant la rédaction d'un lot important.

### 4. Rédiger

1. Utiliser `assets/templates/lecon.md` et `references/style-editorial.md`.
2. Écrire une leçon originale en français belge, de 250 à 450 mots, avec 3 ou 4 sections et 3 ou 4 points clés. Supprimer toute redondance entre `summary`, points clés et corps.
3. Ne jamais écrire de bloc « Piège d'examen » ni de section « À retenir ». Une confusion utile devient une question ; une nuance mineure est intégrée à la règle.
4. Rédiger les questions avec des distracteurs plausibles, une explication de règle et sans référence à la position des options.
5. Ne pas introduire de champ absent du schéma. Ne pas ajouter de difficulté, de tag ou de média décoratif sans utilité pédagogique.
6. Incrémenter `version` et repasser en `in_review` pour toute modification de fond d'un contenu déjà publié ; ne jamais laisser un contenu modifié en `published` sans nouvelle relecture.

### 5. Produire les médias

1. Lire `references/media-pipeline.md`.
2. Pour un panneau : créer un SVG original et fidèle aux formes et couleurs officielles, jamais un scan vectorisé ni un fichier trouvé en ligne.
3. Pour un schéma : privilégier une liste ou des cartes HTML dès que le visuel contient des phrases. Un SVG ne porte que des libellés courts, lisibles à 320 px.
4. Pour une scène photoréaliste : décrire d'abord la situation de conduite (point de vue, voie, usagers, météo, absence de texte, panneau ou logo), faire valider ce brief, puis générer. Vérifier le résultat.
5. Si un panneau doit apparaître, l'ajouter après génération à partir du SVG validé. Ne jamais laisser l'IA dessiner un panneau.
6. Déclarer le média dans le bon `media.yaml` : `alt`, `kind`, dimensions, `rights`, `credit`, `sourceRefs` et, pour une image générée, `generator` (outil, prompt, date).
7. Vérifier que le fichier existe sous `public/media/` et que l'`alt` décrit l'information utile.

### 6. Enregistrer

1. Respecter les noms de fichiers : `<id>.yaml` pour une question, `<slug>.md` pour une leçon, `<slug>` pour un chapitre.
2. Renseigner `sourceRefs` sur chaque chapitre, leçon, question et preset. Pour un média, les ajouter lorsqu'ils documentent le visuel.
3. Vérifier les références croisées : `chapterId`, `unitId`, `lessonIds`, `coreQuestionIds`, `sectionChecks`, `mediaId`, `correctOptionId`.
4. Ne pas modifier un identifiant existant. Ne pas supprimer une question référencée par une leçon ou un snapshot.

### 7. Valider

1. Lancer `pnpm content:validate`. Lire les erreurs et les avertissements.
2. Si le nombre de chapitres, leçons ou questions change, mettre à jour le contrat de contenu dans `tests/unit/content/loader.test.ts` et les comptages de `README.md`, `docs/CONTENT.md`, `docs/TESTING.md` et `docs/ROADMAP.md`.
3. Lancer les tests ciblés du contenu puis `pnpm check` pour un lot. Pour un lot important ou une modification de parcours, lancer `pnpm check:full`.
4. Vérifier manuellement le rendu d'au moins une leçon et une question illustrée dans le navigateur lorsque l'interface est concernée.
5. Rapporter les résultats exacts : nombre de fichiers, tests, avertissements, médias ajoutés.

### 8. Livrer

1. Laisser le contenu en `draft` ou `in_review`. Ne pas publier.
2. Mettre à jour la documentation seulement si les conventions, les comptages ou le pipeline changent ; ne pas gonfler `docs/CONTENT.md` pour chaque leçon.
3. Committer localement par lot cohérent après validation. Ne pas pousser, fusionner, taguer ni publier sans demande explicite.
4. Indiquer clairement ce qui reste à relire humainement et ce qui est incertain.

## Definition of done

- [ ] Le plan et les sources sont tracés.
- [ ] Les fichiers respectent strictement les schémas.
- [ ] Les identifiants sont stables et les références croisées valides.
- [ ] Chaque leçon a 4 ou 5 questions cœur, une seule vérification de section et 2 à 4 questions finales.
- [ ] Aucun bloc « Piège d'examen » ni section « À retenir » ; les confusions utiles sont couvertes par des questions.
- [ ] Les questions ont des explications de règle et des distracteurs plausibles.
- [ ] Les tableaux ne contiennent que des valeurs courtes ; les schémas restent lisibles à 320 px.
- [ ] Les médias sont déclarés, originaux et accessibles.
- [ ] `pnpm content:validate` passe ; les avertissements sont expliqués.
- [ ] Le contrat de test et les comptages documentaires sont à jour si nécessaire.
- [ ] Le contenu est en `draft` ou `in_review`, sans `reviewedBy` ou `reviewedAt` inventés.
- [ ] Le rapport final donne les résultats exacts et les points à relire.

## S'arrêter et demander

- La règle est absente, ambiguë, contradictoire ou régionale.
- La page source est illisible ou l'OCR est douteux.
- Un média nécessaire n'a pas de droits clairs.
- Une image générée contient un panneau, du texte ou une situation dangereuse non validée.
- Un contenu publié doit être modifié de fond.
- La validation échoue ou un avertissement n'est pas compris.
- Le lot dépasse le périmètre validé.

## Ressources

- `references/contrat-contenu.md` : contraintes réelles, références croisées, tests à mettre à jour.
- `references/style-editorial.md` : référence commune (structure, rédaction, tableaux, originalité), partagée avec `reviser-contenu-permis-b`.
- `references/sources-et-verification.md` : hiérarchie des sources, incertitudes, droits.
- `references/media-pipeline.md` : SVG de panneaux, scènes photoréalistes, manifestes.
- `assets/templates/` : gabarits de chapitre, leçon, question et média.
