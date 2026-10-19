# Développement

## Prérequis

- **Node.js 24 ou plus récent** : le projet utilise `node:sqlite`, absent des versions antérieures.
- **pnpm 10.17** via Corepack.
- Git.
- Pour les E2E : Chromium installé par Playwright.

```bash
corepack enable
corepack prepare pnpm@10.17.0 --activate
pnpm install
cp .env.example .env
pnpm db:migrate
pnpm dev
```

L'application écoute sur <http://localhost:3000>.

## Configuration

`.env.example` est versionné ; `.env` est ignoré.

| Variable                  | Valeur par défaut | Rôle                                                       |
| ------------------------- | ----------------- | ---------------------------------------------------------- |
| `DATABASE_PATH`           | `./var/app.db`    | Fichier SQLite local. Interdit dans `public/` et `data/`.  |
| `NEXT_TELEMETRY_DISABLED` | `1`               | Désactive la télémétrie Next.js.                           |
| `NEXT_DIST_DIR`           | `.next`           | Utilisé par les E2E pour isoler le build dans `.next-e2e`. |

Aucun secret n'est nécessaire. Ne jamais ajouter de clé privée ou de token au dépôt.

## Commandes

| Commande                | Rôle                                |
| ----------------------- | ----------------------------------- |
| `pnpm dev`              | Serveur de développement            |
| `pnpm build`            | Build de production                 |
| `pnpm start`            | Serveur de production local         |
| `pnpm lint`             | ESLint                              |
| `pnpm typecheck`        | TypeScript strict, sans émission    |
| `pnpm format`           | Prettier en écriture                |
| `pnpm format:check`     | Prettier en vérification            |
| `pnpm test`             | Vitest (unitaires + intégration)    |
| `pnpm test:watch`       | Vitest en mode watch                |
| `pnpm test:e2e`         | Playwright                          |
| `pnpm content:validate` | Validation de `content/`            |
| `pnpm db:migrate`       | Application des migrations SQLite   |
| `pnpm check`            | Format, lint, types, contenu, tests |
| `pnpm check:full`       | `check` + build + E2E               |

Tests ciblés :

```bash
pnpm exec vitest run tests/unit/domain/scoring.test.ts
pnpm exec vitest run tests/integration/application/exam-flow.test.ts
pnpm exec vitest run tests/unit
```

## Base de données

La base est ouverte par `src/infrastructure/db/open.ts`. Au premier accès :

- le répertoire du fichier est créé ;
- les clés étrangères, `busy_timeout` et WAL sont activés ;
- les migrations de `migrations/` sont appliquées ;
- le profil local `local` est créé s'il n'existe pas.

`pnpm db:migrate` applique les migrations sans lancer l'application. Le runner enregistre chaque
fichier dans `schema_migrations` avec un checksum SHA-256. **Ne jamais modifier une migration déjà
appliquée** : le runner refuse le démarrage et il faut créer une nouvelle migration.

Pour ajouter une migration :

1. Créer `migrations/NNNN_description.sql` avec le numéro suivant.
2. Écrire du SQL idempotent lorsque c'est possible et tenir compte des données existantes.
3. Ajouter un test dans `tests/integration/migrations.test.ts` si le comportement du runner change.
4. Lancer `pnpm db:migrate` puis `pnpm check`.

Réinitialiser volontairement la base locale (destructif) : arrêter le serveur, sauvegarder
`var/app.db` et ses éventuels `-wal`/`-shm`, puis les supprimer et relancer `pnpm db:migrate`.
Cette opération efface la progression et les tentatives.

## Contenu

`content/` est lu à chaque requête via le loader. Après une modification de contenu :

```bash
pnpm content:validate
```

En cas d'erreur, l'application refuse de démarrer. Les détails et modèles de fichiers sont dans
[docs/CONTENT.md](CONTENT.md).

## Tests E2E

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

`playwright.config.ts` isole les tests :

- port **3100** ;
- base fraîche `var/e2e-<timestamp>.db` ;
- build dans `.next-e2e` grâce à `NEXT_DIST_DIR` ;
- un seul worker, pas de parallélisme ;
- serveur démarré par Playwright, jamais réutilisé.

Ces tests ne touchent donc ni `var/app.db`, ni le verrou `.next` du serveur de développement. Les
fichiers `var/e2e-*.db` peuvent être supprimés lorsqu'ils ne servent plus.

## Dépannage

### `node:sqlite` introuvable

La version de Node est trop ancienne. Vérifier `node --version` (24+ requis).

### « Another next dev server is already running »

Un ancien processus `next dev` verrouille `.next`. Identifier le processus avant toute action :

```bash
netstat -ano | findstr :3000
tasklist | findstr node
```

Puis arrêter le PID identifié :

```bash
taskkill //PID <pid> //F
```

Sous Git Bash, le double slash est nécessaire. Ne jamais tuer un processus sans avoir vérifié de
quoi il s'agit.

### Port 3100 occupé pendant les E2E

Un serveur E2E précédent est probablement resté actif. Identifier le processus sur le port 3100
avec `netstat -ano | findstr :3100`, puis l'arrêter.

### Chromium manquant

```bash
pnpm exec playwright install chromium
```

### « La base SQLite doit rester hors de public/ et data/ »

`DATABASE_PATH` pointe vers un répertoire interdit. Revenir à `./var/app.db` ou choisir un autre
répertoire local ignoré par Git.

### Migration modifiée après application

Restaurer le contenu d'origine de la migration ou repartir d'une base neuve, puis créer une
nouvelle migration pour le changement souhaité. Ne jamais contourner le checksum.

### Erreur de validation du contenu

`pnpm content:validate` indique le fichier et le champ fautif. Causes fréquentes : nom de fichier
différent de l'identifiant, référence source inconnue, média absent de `public/`, image externe,
`reviewedBy`/`reviewedAt` manquants pour un contenu publié.

### Avertissements Turbopack au build

`pnpm build` affiche des avertissements de traçage de fichiers dynamiques, notamment pour
`src/infrastructure/content/loader.ts` (lecture de `content/`), `src/infrastructure/db/migrations.ts`
et `src/infrastructure/db/open.ts`. Ils sont attendus : ces modules lisent des fichiers locaux au
runtime, ce que Turbopack ne peut pas résoudre statiquement. Le build réussit. Ne pas « corriger »
ces avertissements en remplaçant les lectures par des imports statiques sans décision documentée.

### Le build et le dev se bloquent mutuellement

Le dev utilise `.next`, les E2E utilisent `.next-e2e`. Ne pas lancer `pnpm build` en même temps
qu'un `pnpm dev` actif, et ne pas réutiliser `.next-e2e` pour le développement.
