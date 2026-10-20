# Feuille de route

## État réel

### Livré

- Application Next.js locale (aucun backend, aucun compte).
- Modèle de contenu YAML/Markdown validé par Zod, avec sources, médias, statuts et relecture.
- Chapitre 1 de démonstration (2 leçons, 5 questions) et pilote du chapitre 2 (13 leçons,
  104 questions), tous en brouillon.
- Tableau de bord, liste des chapitres, leçon Markdown, progression de lecture.
- Unités de chapitre et parcours de micro-leçons : sections Markdown, vérifications intercalées,
  quiz final, reprise à l'étape enregistrée et déblocage linéaire des leçons.
- Défi d'unité (20 questions, sans seuil) et examen de chapitre (50 questions / 15 s / 41 sur 50),
  débloqués par la lecture des leçons et vérifiés côté serveur.
- Parcours visuel type Duolingo : chemin chapitre → unité → leçons, états verrouillé, courant et
  terminé, accès de révision aux leçons terminées, défi et examen intégrés comme jalons.
- Entraînement par chapitre avec correction immédiate (10 questions maximum) et entraînement dédié
  aux questions cœur d'une leçon.
- Questions à options illustrées par des SVG originaux.
- Révision des questions dont la dernière réponse est fausse.
- Examen blanc chronométré, serveur autoritatif, reprise d'une tentative en cours.
- Preset belge officiel (50 questions / 15 s / 41 sur 50), verrouillé tant que le pool publié est
  insuffisant ; preset de démonstration (5 questions, brouillons autorisés).
- Résultats détaillés avec explications, médias et sources.
- Persistance SQLite avec migrations versionnées et snapshots des questions.
- Tests : 135 tests Vitest (18 fichiers) et 5 parcours Playwright.
- Documentation d'architecture, de développement, de test, de contenu et de décisions.

### Limites connues

- Le preset officiel est **verrouillé** : aucune question publiée pour 50 requises (109 brouillons).
- Le contenu n'a pas été relu par un spécialiste et ne doit pas servir de seule préparation.
- Pas d'interface pour abandonner un examen commencé.
- Pas d'historique complet des tentatives au-delà des cinq dernières du tableau de bord.
- Pas d'export, d'import ni de sauvegarde automatique de la base.
- Pas de répétition espacée.
- Pas d'authentification ni de multi-profils.
- Un seul navigateur E2E (Chromium).
- Avertissements Turbopack attendus au build (lecture dynamique de fichiers).

## Prochaines étapes

### 1. Relire le pilote du chapitre 2, puis poursuivre

- relire les 13 leçons et 104 questions des pilotes 2.1 et 2.2, corriger puis publier ;
- inventorier et illustrer tous les panneaux du point 2.3 avant de rédiger les questions ;
- vérifier chaque règle sur les sources officielles belges, renseigner sources et médias ;
- atteindre au moins 50 questions publiées pour débloquer le preset officiel.

### 2. Renforcer l'outillage de contenu

- Aide à la saisie ou import contrôlé depuis les documents de `data/`.
- Statistiques par chapitre et par difficulté.
- Prévisualisation d'une question avant publication.
- Détection des questions jamais utilisées ou trop souvent échouées.

### 3. Compléter l'application

- Action d'abandon explicite d'un examen.
- Page d'historique complet des tentatives.
- Sauvegarde/export et import de la base locale.
- Réinitialisation guidée de la progression.
- Amélioration de l'accessibilité (navigation clavier, annonces du chronomètre).

### 4. Envisager la suite « produit »

- Répétition espacée, si les données d'usage montrent un besoin.
- Multi-profils puis synchronisation en ligne.
- Authentification et sauvegarde distante.
- Commercialisation : vérification des droits sur tous les contenus, conditions d'utilisation,
  politique de confidentialité, révision juridique. Aucun contenu du manuel ne peut être réutilisé
  sans droits.

## Explicitement hors périmètre (V1)

- Passer ou remplacer l'examen officiel.
- Application mobile native.
- Backend, comptes, paiement.
- Génération de contenu par IA au runtime.
- Traduction vers d'autres langues.
- Toute promesse de conformité réglementaire sans révision humaine et juridique.
