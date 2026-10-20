# Tests

## Stratégie

La pyramide est adaptée à un projet local sans backend :

- **domaine** : fonctions pures, aucun I/O, couverture fine des règles de notation, de temps, de
  sélection et des schémas ;
- **intégration** : repository SQLite en mémoire, migrations, enchaînement complet des cas d'usage ;
- **contrat de contenu** : le contenu réel de `content/` est chargé et validé ;
- **E2E** : parcours navigateur critiques sur une base et un build isolés.

Les tests utilisent des dépendances injectées : horloge contrôlée, générateur d'identifiants
séquentiel, générateur aléatoire déterministe (mulberry32). Aucun test ne dépend de l'heure réelle
ni de l'ordre d'un tirage aléatoire.

## Commandes

```bash
pnpm test                                        # tous les tests Vitest
pnpm test:watch                                  # mode watch
pnpm exec vitest run tests/unit                  # unitaires
pnpm exec vitest run tests/integration           # intégration
pnpm exec vitest run tests/unit/domain/scoring.test.ts
pnpm test:e2e                                    # Playwright
pnpm check                                       # format + lint + types + contenu + Vitest
pnpm check:full                                  # check + build + E2E
```

## Inventaire actuel

Vérifié lors de la dernière exécution : **15 fichiers, 119 tests Vitest** et **4 tests Playwright**.

### Unitaires

| Fichier                                           | Couverture                                                                                      |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `tests/unit/domain/scoring.test.ts`               | Pénalités normale/grave/temps écoulé, plancher à 0, incohérence de longueur                     |
| `tests/unit/domain/time.test.ts`                  | Ajout de temps, expiration, grâce, bornage, secondes restantes, durée                           |
| `tests/unit/domain/selection.test.ts`             | Mélange déterministe, immutabilité, sélection, pool insuffisant, count invalide                 |
| `tests/unit/domain/schemas.test.ts`               | Sources, dates UTC, droits des médias, publication, options, presets                            |
| `tests/unit/domain/catalog.test.ts`               | Éligibilité, avertissements, tri, doublons, références inconnues, images, unités, sectionChecks |
| `tests/unit/domain/sections.test.ts`              | Découpage `##`, introduction, blocs de code, slugs et doublons                                  |
| `tests/unit/domain/snapshot.test.ts`              | Média d'option conservé, média nul pour une réponse non illustrée                               |
| `tests/unit/content/loader.test.ts`               | Contenu réel : 2 chapitres, 9 leçons, 61 questions, avertissement de pool                       |
| `tests/unit/infrastructure/database-path.test.ts` | Chemins mémoire/relatifs, refus de `public/` et `data/`                                         |

### Intégration

| Fichier                                               | Couverture                                                                                                                        |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `tests/integration/migrations.test.ts`                | Application unique, checksum modifié, rollback sur SQL invalide, répertoire absent                                                |
| `tests/integration/repository.test.ts`                | Snapshots, conflits de réponse, clôture, unicité de l'examen actif, statistiques, progression, parcours de leçon, snapshot altéré |
| `tests/integration/application/exam-flow.test.ts`     | Démarrage/reprise, DTO publics, temps serveur, réponses invalides, temps écoulé, grâce, clôture, pool insuffisant                 |
| `tests/integration/application/practice-flow.test.ts` | Session publique, entraînement de leçon, correction, complétion, plafond de 10, révision, absence d'erreurs                       |
| `tests/integration/application/lesson-runs.test.ts`   | Ordre sections/questions, reprise sans recul, verrouillage, complétion et déblocage, corrections après réponse                    |
| `tests/integration/application/queries.test.ts`       | Résultat complet, tentative en cours, tableau de bord, révision, chapitres/leçons, unités et verrous                              |

### E2E

`tests/e2e/learning-flow.spec.ts`, exécuté en série :

1. **Leçon** : marquer lue puis non lue, continuer vers la suivante et vérifier le marquage
   automatique.
2. **Entraînement** : démarrer une session de 5 questions, répondre, lire la correction, terminer.
3. **Micro-leçon du chapitre 2** : vérifier le verrouillage de la deuxième leçon, suivre les
   sections et les vérifications de la première, terminer le parcours, constater le déblocage et
   l'ouverture de la leçon suivante.
4. **Examen** : vérifier le verrouillage du preset officiel, démarrer le preset démo, laisser la
   première question expirer, répondre aux suivantes, vérifier le résultat, la mention « Temps
   écoulé » et le lien vers la révision des erreurs.

L'examen E2E attend une expiration réelle de 15 s (plus la grâce de 2 s), d'où une durée totale
d'environ 30 s.

## Isolation des tests

- Les tests d'intégration ouvrent une base `:memory:` et appliquent les migrations réelles.
- `tests/helpers/fixtures.ts` fournit le contenu de test, l'horloge, le générateur aléatoire et
  `createTestDependencies()`.
- Les E2E utilisent une base neuve `var/e2e-<timestamp>.db`, le build `.next-e2e`, le port 3100 et
  un seul worker. Ils ne modifient jamais `var/app.db`.
- Playwright ne réutilise pas un serveur existant (`reuseExistingServer: false`).

## Vérifications manuelles avant livraison

En complément des tests automatisés :

1. `pnpm content:validate` ne signale aucune erreur ; lire les avertissements.
2. Tableau de bord : statistiques, reprise d'examen, presets verrouillés/disponibles.
3. Leçon : parcours de micro-sections, reprise après rechargement, verrouillage linéaire, sources
   affichées, rendu Markdown, entraînement de leçon ; leçon sans questions cœur en lecture simple.
4. Entraînement : correction immédiate, explication, médias, options illustrées, fin de session.
5. Examen : compte à rebours, passage automatique après expiration, résultat et détail.
6. Révision : une erreur récente apparaît ; une bonne réponse ultérieure la retire.
7. Rafraîchissement en cours d'examen : la tentative reprend sans réinitialiser le temps.
8. Affichage mobile : navigation, runner, résultats.

## Limites connues

- Un seul navigateur E2E (Chromium) ; pas de matrice Firefox/WebKit.
- Pas de tests de régression visuelle ni d'audit d'accessibilité automatisé.
- Pas de test multi-profils ni d'authentification : ces fonctionnalités n'existent pas.
- Pas de test de montée en charge : l'application est locale et mono-utilisateur.
- Le contenu réel se limite à 2 chapitres, 9 leçons et 61 questions, toutes en brouillon ; le
  chapitre 2 n'est couvert que par le pilote 2.1.
- L'abandon de tentative n'est pas exposé dans l'interface ; seul le repository le couvre.
- Les avertissements Turbopack du build sont attendus et ne sont pas traités comme des échecs.
