# Manuel de Sauvegarde et Restauration

Ce document détaille les fonctionnalités de sauvegarde (export) et de restauration (import) de l'application.

## 1. Exportation des données

Vous pouvez exporter vos données de deux manières depuis la page **Outils > Sauvegardes** :

### A. Export CSV (par entité)

Permet de télécharger un fichier CSV pour une entité spécifique (ex: Ingrédients, Recettes, Commandes).

- **Format** : CSV (UTF-8)
- **Délimiteur** : `,`
- **Nombres** : Format US (ex: `12.50`)
- **Dates** : ISO 8601 (ex: `2024-02-10T11:00:00.000Z`)

### B. Export Global

- **ZIP** : Contient tous les fichiers CSV de toutes les entités. Idéal pour l'archivage.
- **JSON** : Un seul fichier contenant toutes les données structurées. **C'est le format recommandé pour la restauration complète.**

## 2. Restauration des données

> [!CAUTION]
> La restauration est une opération destructive si vous utilisez le mode "Commit". Elle peut écraser ou supprimer vos données actuelles.

### Procédure

1. **Sélection du fichier** : Choisissez un fichier `.json` (recommandé) ou `.zip`.
2. **Mode Dry-Run (Simulation)** : Toujours activer ce mode en premier. Il permet de voir combien d'éléments seront créés ou mis à jour sans modifier la base de données.
3. **Option "Remplacer tout"** : Si cochée, les tables de votre organisation seront vidées avant l'import. À utiliser pour une restauration complète à partir d'un état connu.
4. **Confirmation** : Pour le mode "Commit", vous devez taper `RESTORE` pour confirmer l'action.

### Ordre de restauration (Automatique)

Le système restaure les données dans l'ordre suivant pour respecter les dépendances :

1. Fournisseurs
2. Ingrédients (incluant Packaging & Accessoires)
3. Recettes
4. Détails des Recettes
5. Packs
6. Détails des Packs
7. Commandes
8. Détails des Commandes
9. Mouvements de Stock

## 3. Sécurité et Limites

- **Multi-tenant** : Les exports et imports sont strictement limités à votre `organizationId`.
- **Secrets** : Aucun secret (mots de passe, clés API) n'est inclus dans les exports.
- **Transaction** : La restauration s'effectue dans une transaction unique. Si une erreur survient au milieu de l'import, aucun changement n'est appliqué (rollback).

## 4. Support Technique

En cas de transaction échouée ou d'erreurs de validation lors de l'import, consultez le rapport d'erreurs affiché dans l'interface ou contactez l'administrateur.
