# Sources et vérification

## Hiérarchie

1. **Droit fédéral et sources officielles belges** : Code de la route, arrêtés royaux, SPF Mobilité
   et Transports, Moniteur belge. Ils priment sur tout le reste.
2. **Sources régionales officielles** : la Région organise la formation et l'examen (Bruxelles,
   Wallonie, Flandre). Elles font autorité pour le format de l'examen, les catégories, les
   attestations et les particularités régionales.
3. **Manuel Feu Vert** : support pédagogique et référence de page. Il aide à structurer et à
   repérer les notions, mais ne remplace pas une vérification officielle.
4. **Sources secondaires** (instituts de sécurité routière, communes, associations) : utiles pour
   trouver une source primaire, jamais suffisantes seules.

Une règle sans source officielle identifiable reste en brouillon et doit être signalée. Ne jamais
combler un trou avec une règle française, flamande ou inventée.

## Fédéral, régional et local

Le permis B est une compétence fédérale pour le droit de conduire, mais la formation, l'examen et
certaines règles de circulation relèvent des Régions. Avant de rédiger :

- identifier la Région visée par le contenu (le preset actuel est « Belgique francophone », ce qui
  ne suffit pas pour toutes les règles) ;
- vérifier si la règle est fédérale, régionale ou communale ;
- si elle varie, écrire les différences et la date de consultation plutôt que choisir une version
  silencieusement.

Exemples de sujets à traiter avec prudence : limitations de vitesse en agglomération, zones 30,
zones de basses émissions, stationnement, taxes, formation et examens. Les règles de priorité, de
signalisation et de sanctions pénales se lisent d'abord au niveau fédéral.

## Registre de vérification

Avant de rédiger, tenir un registre de travail (conversation ou notes, pas nécessairement versionné)
avec une ligne par fait :

| Règle | Valeur exacte | Portée | Source | Page / URL | Consulté le | Confiance |
| ----- | ------------- | ------ | ------ | ---------- | ----------- | --------- |

« Confiance » vaut `haute` seulement si la source officielle est explicite. `moyenne` si seule une
source secondaire confirme, `faible` si le passage est ambigu : dans ce dernier cas, ne pas publier.

Les faits à vérifier en priorité : seuils numériques, unités (kg, t, m, km/h), durées, majorités,
acteurs compétents (« qui décide ? »), exceptions, conditions de temps et de lieu, et termes
négatifs (`sauf`, `ne … pas`, `uniquement`).

## OCR et scans

L'OCR est une aide de lecture, jamais une preuve. Les erreurs les plus fréquentes sur les documents
de conduite sont :

- les nombres et unités : `750 kg` / `7 500 kg`, `3,5 t` / `35 t`, `41/50` / `4/50` ;
- les négations et restrictions perdues : `ne doit pas`, `sauf`, `uniquement`, `à moins de` ;
- les tableaux dont les colonnes se mélangent ;
- les accents et les majuscules dans les noms propres.

Toujours relire la phrase complète sur l'image de la page. Pour un seuil ou une exception, chercher
une seconde confirmation officielle. En cas de contradiction entre l'OCR et la page, la page gagne ;
en cas de doute persistant, s'arrêter.

## Conflits

- **Manuel contre source officielle** : la source officielle gagne. Corriger le contenu et noter la
  divergence dans la conversation ou la revue, pas dans le corps de la leçon.
- **Deux sources officielles divergentes** : vérifier la date, la Région et le champ d'application.
  Si la divergence demeure, conserver les deux versions clairement identifiées ou demander un
  arbitrage. Ne pas choisir au hasard.
- **Source ancienne contre source récente** : utiliser la plus récente pour la règle actuelle, mais
  ne pas réécrire l'histoire si la question porte sur une situation datée.

## Ajouter une source

Toute source citée doit être déclarée dans `content/sources.yaml` :

```yaml
- id: official-exemple
  title: "Titre officiel de la page"
  kind: official # manual | official | other
  publisher: "Organisme"
  url: https://exemple.be/page # HTTPS obligatoire
  accessedAt: 2026-10-20T00:00:00Z # ISO 8601 UTC avec Z
  rights: external_reference # original | personal_use | licensed | public_domain | external_reference
  note: "Ce que cette source établit précisément."
```

Règles :

- identifiant kebab-case stable, jamais réutilisé ;
- au moins un `localPath` sous `data/` ou une `url` HTTPS ;
- un document local ne doit jamais être sous `public/` ni contenir `..` ;
- `note` précise la portée vérifiée, pas un résumé vague ;
- ne pas supprimer une source encore référencée par un contenu ou un média.

Dans les contenus, référencer l'identifiant avec la page ou le localisateur :

```yaml
sourceRefs:
  - documentId: feu-vert-chap2-1
    page: 10
  - documentId: official-exam-brussels
```

Chaque chapitre, leçon, question et preset doit avoir au moins une `sourceRef`. Pour un média, les
références sont facultatives mais recommandées dès qu'elles documentent le visuel.

## Droits d'usage

- Le manuel et les scans sont en `personal_use`, stockés sous `data/`, ignorés par Git et jamais
  servis. Ils ne doivent jamais être copiés dans `public/`.
- Reformuler les faits avec ses propres mots. Une citation courte et nécessaire reste une exception
  à éviter dans ce projet : préférer une reformulation et une référence.
- Les faits ne sont pas protégés, leur formulation l'est. Ne pas recopier la structure, les
  exemples ou les tournures du manuel.
- Ne pas importer un panneau, une photo ou un logo trouvé en ligne. Dessiner un SVG original ou
  générer une scène originale, puis déclarer les droits.
- Avant toute diffusion publique ou commercialisation, faire valider les droits sur les contenus
  dérivés du manuel. Le dépôt public ne vaut pas autorisation de rediffuser le manuel.

## Date et fraîcheur

Une règle belge peut changer. Indiquer la date de consultation dans `sources.yaml` et, pour un
contenu sensible, la période de validité dans la note de source. Lors d'une révision, revérifier la
source officielle avant de conserver une valeur chiffrée.
