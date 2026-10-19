# Instructions pour les agents

Les règles de travail de ce dépôt sont définies dans [RULES.md](RULES.md). Elles sont la référence
unique : ne pas les dupliquer ici.

Points non négociables :

- Ne jamais travailler directement sur `main` / `master` : utiliser une branche dédiée.
- Les actions Git locales (branche, commit, stash) sont autonomes ; push, merge, PR, tags, releases,
  force-push, `reset --hard` et suppressions de branches sont interdits sans demande explicite.
- Ne jamais commiter `.env`, `data/`, `var/`, `.next*`, `test-results/` ou un artefact de build.
- Le contenu doit rester exact au regard du code de la route **belge** et des droits d'usage.
- Avant de déclarer une tâche terminée : exécuter les validations réelles et rapporter les résultats
  exacts.

Documentation utile : [README.md](README.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md),
[docs/CONTENT.md](docs/CONTENT.md), [docs/TESTING.md](docs/TESTING.md),
[docs/DECISIONS.md](docs/DECISIONS.md).
