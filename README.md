# Permis B — Belgique francophone

Application locale pour préparer l'examen théorique du permis B en Belgique francophone :
leçons structurées, entraînement avec correction immédiate, examen blanc chronométré et
révision des dernières erreurs.

## État actuel

- Parcours fonctionnels : tableau de bord, unités et micro-leçons avec déblocage linéaire, défi
  d'unité, examen de chapitre avec seuil, entraînement par chapitre ou par leçon, examen blanc,
  résultats détaillés, révision des erreurs.
- Contenu de démonstration : **2 chapitres, 9 leçons, 61 questions en brouillon**, dont un pilote
  complet du chapitre 2.1 (7 micro-leçons, 56 questions). Certaines questions utilisent des
  options illustrées. Ces contenus ne constituent pas encore une banque fiable pour l'examen.
- Le preset officiel (`belgique-b-fr`, 50 questions / 15 s / 41 sur 50) reste **verrouillé**
  tant que la banque ne contient pas 50 questions publiées et validées. Le preset démo permet
  de tester le format avec les brouillons du chapitre 1.
- Données locales uniquement : aucun compte, aucun backend, aucune télémétrie applicative.

## Démarrage rapide

Prérequis : **Node.js 24+** (pour `node:sqlite`), **pnpm 10.17** via Corepack.

```bash
cp .env.example .env
pnpm install
pnpm db:migrate
pnpm dev
```

Ouvrir <http://localhost:3000>.

Pour les tests end-to-end :

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

## Commandes

| Commande                | Rôle                                                   |
| ----------------------- | ------------------------------------------------------ |
| `pnpm dev`              | Serveur de développement                               |
| `pnpm build`            | Build de production                                    |
| `pnpm start`            | Serveur de production                                  |
| `pnpm lint`             | ESLint                                                 |
| `pnpm typecheck`        | TypeScript strict                                      |
| `pnpm format`           | Prettier (écriture)                                    |
| `pnpm format:check`     | Prettier (vérification)                                |
| `pnpm test`             | Tests unitaires et d'intégration (Vitest)              |
| `pnpm test:e2e`         | Parcours navigateur (Playwright, base et build isolés) |
| `pnpm content:validate` | Validation du contenu et de la banque de questions     |
| `pnpm db:migrate`       | Application des migrations SQLite                      |
| `pnpm check`            | Format, lint, types, contenu et tests                  |
| `pnpm check:full`       | `check` + build + E2E                                  |

## Documentation

- [RULES.md](RULES.md) — règles de travail et contraintes du projet.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — structure, flux de données, modèle SQLite.
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) — environnement, scripts, dépannage.
- [docs/TESTING.md](docs/TESTING.md) — stratégie et couverture réelle des tests.
- [docs/CONTENT.md](docs/CONTENT.md) — création, validation et publication du contenu.
- [docs/DECISIONS.md](docs/DECISIONS.md) — décisions d'architecture et de produit.
- [docs/ROADMAP.md](docs/ROADMAP.md) — état réel, suites prévues, hors périmètre.
- [CHANGELOG.md](CHANGELOG.md) — journal des changements.

## Droits, données et limites

- Les scans et PDF sous `data/` sont **ignorés par Git**, ne sont jamais servis par
  l'application et restent réservés à un usage personnel. Toute commercialisation exige des
  droits ou un contenu original.
- `content/` est versionné. Une publication exige une relecture explicite (`reviewedBy`,
  `reviewedAt`) ; les statuts sont `draft`, `in_review`, `published`.
- La progression et les tentatives sont stockées dans SQLite, par défaut `var/app.db`
  (ignoré par Git). Le chemin est configurable par `DATABASE_PATH` et ne peut pas pointer
  dans `public/` ou `data/`.
- L'application ne remplace pas l'examen officiel et ne garantit pas la conformité du contenu
  de démonstration.
