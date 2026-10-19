# Contribuer

Ce projet est d'abord un outil personnel d'apprentissage du permis B belge. Les contributions
doivent rester petites, vérifiables et conformes à [RULES.md](RULES.md).

## Environnement

Prérequis : Node.js 24+ et pnpm 10.17.

```bash
corepack enable
corepack prepare pnpm@10.17.0 --activate
pnpm install
cp .env.example .env
pnpm db:migrate
pnpm dev
```

Pour les tests navigateur : `pnpm exec playwright install chromium`.

## Boucle de travail

1. Partir d'une branche dédiée (`feat/...`, `fix/...`, `docs/...`), jamais de `main`.
2. Modifier le code ou le contenu en gardant le périmètre minimal.
3. Ajouter ou adapter les tests du comportement touché.
4. Lancer `pnpm check` ; lancer `pnpm build` et `pnpm test:e2e` si le changement peut les
   affecter.
5. Mettre à jour la documentation dans le même commit.
6. Commiter en Conventional Commits.

Le push, les PR, les tags et les releases ne se font que sur demande explicite.

## Contenu

Les chapitres, leçons, questions, médias et presets vivent sous `content/`. Avant d'ajouter du
contenu, lire [docs/CONTENT.md](docs/CONTENT.md) :

- nommage des fichiers aligné sur les identifiants ;
- références `sourceRefs` obligatoires ;
- publication conditionnée à `reviewedBy` et `reviewedAt` ;
- médias sous `public/media/` uniquement, déclarés dans `content/media.yaml` ;
- `data/` reste personnel, ignoré par Git et jamais servi.

Une question n'est publiable que si sa règle est vérifiée sur une source officielle belge ou sur
le manuel avec référence de page. L'OCR seul ne fait pas foi.

## Style

- TypeScript strict, pas de `any` non justifié.
- Pas de logique métier dans les composants.
- Textes d'interface en français, clairs et sans jargon inutile.
- Formatage et lint gérés par Prettier et ESLint : ne pas les contourner.

## Signaler un problème

Décrire le comportement observé, le comportement attendu, les étapes de reproduction et, si
possible, la règle belge concernée avec sa source. Ne jamais joindre un scan sous `data/` sans
vérifier qu'il peut être partagé.
