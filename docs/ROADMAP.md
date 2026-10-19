# Feuille de route

## État réel

### Livré

- Application Next.js locale (aucun backend, aucun compte).
- Modèle de contenu YAML/Markdown validé par Zod, avec sources, médias, statuts et relecture.
- Chapitre de démonstration : 1 chapitre, 2 leçons, 5 questions en brouillon.
- Tableau de bord, liste des chapitres, leçon Markdown, progression de lecture.
- Entraînement par chapitre avec correction immédiate (10 questions maximum).
- Révision des questions dont la dernière réponse est fausse.
- Examen blanc chronométré, serveur autoritatif, reprise d'une tentative en cours.
- Preset belge officiel (50 questions / 15 s / 41 sur 50), verrouillé tant que le pool publié est
  insuffisant ; preset de démonstration (5 questions, brouillons autorisés).
- Résultats détaillés avec explications, médias et sources.
- Persistance SQLite avec migrations versionnées et snapshots des questions.
- Tests : 91 tests Vitest (12 fichiers) et 3 parcours Playwright.
- Documentation d'architecture, de développement, de test, de contenu et de décisions.

### Limites connues

- Le preset officiel est **verrouillé** : 5 questions de démonstration contre 50 requises.
- Le contenu n'a pas été relu par un spécialiste et ne doit pas servir de seule préparation.
- Pas d'interface pour abandonner un examen commencé.
- Pas d'historique complet des tentatives au-delà des cinq dernières du tableau de bord.
- Pas d'export, d'import ni de sauvegarde automatique de la base.
- Pas de répétition espacée.
- Pas d'authentification ni de multi-profils.
- Un seul navigateur E2E (Chromium).
- Avertissements Turbopack attendus au build (lecture dynamique de fichiers).

## Prochaines étapes

### 1. Constituer la vraie banque de questions

Priorité absolue. Pour chaque chapitre du manuel :

- rédiger les leçons et les questions à partir des pages et des sources officielles belges ;
- vérifier chaque règle, notamment les panneaux, priorités, vitesses et masses ;
- renseigner les sources et les médias ;
- faire relire, puis publier avec `reviewedBy` / `reviewedAt` ;
- atteindre au moins 50 questions publiées pour débloquer le preset officiel.

### 2. Renforcer l'outillage de contenu

- Aide à la saisie ou import contrôlé depuis les documents de `data/`.
- Statistiques par chapitre et par difficulté.
- Prévisualisation d'une question avant publication.
- Détection des questions jamais utilisées ou trop souvent échouées.

### 3. Compléter les parcours

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
