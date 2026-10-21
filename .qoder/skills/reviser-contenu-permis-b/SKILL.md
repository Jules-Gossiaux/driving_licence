---
name: reviser-contenu-permis-b
description: "Réécrire un contenu pédagogique existant du projet Permis B belge avec deux objectifs : garantir l'originalité (aucune formulation reprise du manuel) et maximiser la clarté (supprimer tout texte qui n'aide pas à comprendre ou à décider). Utiliser quand une leçon est trop longue, redondante, proche du manuel ou difficile à suivre, ou pour repasser derrière un lot produit. La réécriture reconstruit la règle à partir des faits, puis vérifie que le contenu reste exact et couvert par les questions. Ne pas utiliser pour créer un chapitre ou un pool de questions neufs : utiliser produire-contenu-permis-b."
---

# Réécrire pour l'originalité et la clarté

## Vue d'ensemble

Ce skill a deux objectifs, dans cet ordre :

1. **Aucun plagiat** : la leçon est reconstruite à partir des faits, pas paraphrasée depuis le manuel
   ni depuis l'ancienne rédaction.
2. **Clarté maximale** : tout ce qui n'aide pas le candidat à comprendre ou à décider est supprimé.

L'exactitude des règles belges est un garde-fou, pas un troisième objectif : on ne simplifie jamais au
prix d'une valeur fausse, d'une exception oubliée ou d'une règle supprimée. Les changements de
structure (sections, vérifications, tableaux) ne sont que des conséquences de ces deux objectifs.

Le style commun est défini dans
`../produire-contenu-permis-b/references/style-editorial.md`. Le lire avant toute réécriture.

## Règles non négociables

- Lire `RULES.md`, `AGENTS.md`, [docs/CONTENT.md](../../../docs/CONTENT.md), le contrat de contenu et
  les schémas réels avant de modifier quoi que ce soit.
- Ne jamais travailler sur `main` ou `master`. Créer une branche dédiée si nécessaire.
- Ne jamais recopier le manuel ni un scan. Une réécriture reste `ai_assisted`.
- Vérifier chaque règle sur une source officielle belge. Une valeur, une exception ou un panneau non
  confirmé est supprimé ou signalé, jamais inventé.
- Supprimer tout texte décoratif : répétition, rappel, transition, anecdote, formule d'introduction.
- Ne jamais publier : produire `draft` ou `in_review`. Ne jamais renseigner `reviewedBy` ou
  `reviewedAt` sans relecture humaine réelle.
- Garder les identifiants, slugs et versions cohérents. Ne jamais renuméroter un identifiant.
- Valider réellement avant de déclarer un lot terminé. Ne pas annoncer un comptage sans l'avoir mesuré.

## Workflow

### 0. Cadrer

1. Lire les règles du dépôt, [docs/CONTENT.md](../../../docs/CONTENT.md), le style éditorial commun,
   `references/contrat-contenu.md` et les schémas réels.
2. Inspecter la leçon et ses dépendances : questions cœur, pool, `sectionChecks`, médias, sources,
   snapshots.
3. Définir le lot et vérifier la branche Git. Pour plus d'une leçon, présenter le diagnostic et le
   plan de réécriture avant de modifier.

### 1. Extraire les faits, pas les phrases

Construire une fiche par règle, sans recopier la source :

```text
Règle : ...
Valeur exacte : ...
Conditions : ...
Exception : ...
Conséquence pratique : ...
Source officielle : <id> — <article / page> — consultée le <date>
Incertitude : aucune | <à vérifier>
```

Vérifier les seuils, les négations, les acteurs compétents et la portée régionale. Une règle sans
source officielle ou sans valeur exacte n'est pas prête à être réécrite.

Voir `references/methode-reappropriation.md`.

### 2. Couper avant de rédiger

Lister ce qui disparaît :

- sections « À retenir » et blocs « Piège d'examen » ;
- une idée répétée dans `summary`, `keyPoints` et le corps ;
- exemples redondants, anecdotes, contexte historique, rappels de bon sens ;
- formules d'introduction (« dans cette leçon », « il est important de », « il convient de ») ;
- transitions et phrases de liaison sans information ;
- doublons entre sections, listes trop longues, détails qui ne changent aucune réponse.

Une section qui fonctionne et qui est couverte par une question reste intacte : simplifier ne veut
pas dire réécrire pour le plaisir.

### 3. Réécrire sans la source

Fermer le manuel et l'ancienne leçon. Expliquer la règle à voix haute, comme à un candidat, puis
rédiger depuis cette explication.

Règles de clarté :

- une idée par phrase, 12 à 20 mots en moyenne ; diviser toute phrase de plus de 25 mots ;
- voix active, présent, adresse directe avec « vous » ;
- 3 ou 4 sections, une décision par section ;
- chaque paragraphe tient en 1 à 3 phrases ;
- expliquer un terme technique à sa première apparition, ou le supprimer ;
- viser **200 à 350 mots** hors front matter ; au-delà de 400, justifier par une règle ou une
  exception réelle ;
- garder les valeurs exactes et le vocabulaire belge, sans franciser un terme officiel ;
- n'inventer un exemple que s'il aide à trancher une situation ; ne jamais reprendre celui du manuel.

Réécrire `summary` et `keyPoints` après le corps : ce sont des réflexes, pas un résumé du texte.

### 4. Contrôler l'originalité

Comparer la rédaction au texte source, uniquement pour détecter les ressemblances :

- séquences de six mots ou plus identiques ou quasi identiques ;
- même ordre de sections, même progression ;
- mêmes exemples, même mise en scène, même anecdote ;
- mêmes listes : nombre d'items, ordre, intitulés.

Toute coïncidence se reformule en repartant de la décision à prendre, jamais en remplaçant un mot par
un synonyme. Consigner la méthode et les ressemblances résiduelles dans le rapport.

### 5. Contrôler la clarté

Relire comme un débutant qui découvre la règle :

- [ ] Chaque phrase apporte une information utile.
- [ ] Aucune idée n'est répétée dans la leçon.
- [ ] Chaque section répond à une question concrète du candidat.
- [ ] Les phrases longues, les nominalisations et le jargon ont été retirés.
- [ ] Un lecteur peut reformuler la règle et la décision après une seule lecture.
- [ ] Les questions de la leçon sont répondables avec ce seul texte.
- [ ] Aucun bloc piège ni section de synthèse ne subsiste.

Supprimer encore tout paragraphe qui ne change ni la compréhension ni la réponse à une question.
Ne pas raccourcir au point de retirer une condition, une exception ou une valeur.

### 6. Garde-fous

1. Une seule vérification de section après la section la plus dense, avec 1 ou 2 questions.
2. Garder 2 à 4 questions pour le quiz final ; 4 ou 5 questions cœur au total.
3. Convertir chaque confusion retirée : question si elle est réelle et non testée, phrase de règle si
   c'est une nuance mineure, suppression si elle est déjà couverte.
4. Vérifier qu'aucune question ne teste une règle supprimée et qu'aucune règle centrale ne reste sans
   question.
5. Les tableaux ne contiennent que des valeurs courtes ; un tableau de phrases devient une liste ou
   des cartes.
6. Vérifier les médias, leurs `alt`, leurs dimensions et leur lisibilité à 320 px.

Le moteur repose les questions ratées en fin de leçon : ne pas créer de questions de consolidation.

### 7. Enregistrer

1. Mettre à jour `summary`, `keyPoints`, `sectionChecks`, `coreQuestionIds`, `version` et `status`.
2. Vérifier les références croisées : `chapterId`, `unitId`, `lessonIds`, `questionIds`, `mediaId`,
   `correctOptionId`, `sourceRefs`.
3. Ajouter les sources officielles utilisées dans `content/sources.yaml` si elles manquent.
4. Ne pas modifier un identifiant. Ne pas supprimer une question référencée par un snapshot ou un
   preset.

### 8. Valider et rapporter

1. Lancer `pnpm content:validate`, puis les tests de contenu et `pnpm check`.
2. Pour un lot qui change le parcours ou l'interface, lancer `pnpm build` et `pnpm test:e2e`.
3. Vérifier dans le navigateur une leçon réécrite, sur mobile et sur ordinateur.
4. Rapporter les métriques avant/après, les tests exacts et ce qui reste à relire humainement.

## Rapport de réécriture

Pour chaque leçon :

```text
Leçon <id> — <titre>
Avant : <mots> mots, <n> sections, <n> checks, <n> questions cœur
Originalité : <séquences détectées, structure ou exemples repris, méthode de reconstruction>
Clarté : <coupes, fusions, phrases longues supprimées>
Exactitude : <source officielle, page ou URL, date ; incertitudes>
Après : <mots> mots (-<n> %), <n> sections, <n> checks, <n> questions
Reste à relire : <points incertains>
```

## Definition of done

- [ ] Aucune séquence de six mots ni structure ni exemple repris de la source.
- [ ] Chaque phrase est utile ; aucune idée répétée.
- [ ] Le texte tient en 200 à 350 mots, ou le dépassement est justifié par une règle réelle.
- [ ] Aucun bloc « Piège d'examen » ni section « À retenir ».
- [ ] Chaque règle conservée est exacte et vérifiée sur une source officielle.
- [ ] Une seule vérification de section, 2 à 4 questions finales, 4 ou 5 questions cœur.
- [ ] Chaque règle utile reste couverte par une question.
- [ ] `pnpm content:validate` passe ; les avertissements sont expliqués.
- [ ] Le contenu est en `draft` ou `in_review`, sans relecture inventée.

## S'arrêter et demander

- Une règle centrale est absente, ambiguë, contradictoire ou régionale.
- La source est illisible ou l'ancienne rédaction la contredit.
- Une simplification retirerait une condition, une exception ou une règle testée.
- Un média est faux, sans droits clairs ou impossible à corriger sans génération.
- Un contenu publié doit être modifié de fond.
- Le lot dépasse le périmètre validé.

## Ressources

- `../produire-contenu-permis-b/references/style-editorial.md` : référence de style commune.
- `references/methode-reappropriation.md` : reconstruction sans source et contrôle de similitude.
- `references/audit-editorial.md` : grille de contrôle et seuils.
- `../produire-contenu-permis-b/references/contrat-contenu.md` : schémas et références croisées.
- `../produire-contenu-permis-b/references/sources-et-verification.md` : hiérarchie des sources.
- `../produire-contenu-permis-b/references/media-pipeline.md` : médias et SVG.
