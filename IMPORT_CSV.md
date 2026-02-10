# Documentation Import CSV - Rêves en Feuilles

Ce module permet d'importer massivement des données dans l'application via des fichiers CSV. Il est conçu pour être Robuste, Multi-tenant et adapté aux formats français.

## Capacité du Module

Le module supporte les entités suivantes :

- **Ingrédients** (`ingredients`)
- **Packaging** (`packaging`)
- **Accessoires** (`accessories`)
- **Fournisseurs** (`suppliers`)
- **Recettes** (`recipes`)
- **Packs** (`packs`)
- **Commandes** (`orders`)

## Format du Fichier CSV

### Détection Automatique

Le système détecte automatiquement le séparateur utilisé (`,` ou `;`) et gère l'encodage UTF-8.

### Nombres et Décimaux (Format FR)

Le système supporte les décimaux au format français (virgule).
Exemple : `12,34` sera converti en `12.34`.

Pour les **Ingrédients**, le prix unitaire est automatiquement converti de €/kg en €/g (division par 1000).

### En-têtes (Mapping)

Le système supporte les noms de colonnes en français ou leurs équivalents internes.

| Entité       | Colonnes Supportées (Exemples FR)                                         |
| ------------ | ------------------------------------------------------------------------- |
| Ingrédients  | `Nom`, `Catégorie`, `Stock Initial`, `Prix Unitaire`, `Fournisseur`       |
| Packaging    | `Nom`, `Type`, `Dimensions`, `Capacité`, `Stock Initial`, `Prix Unitaire` |
| Fournisseurs | `Nom`, `Email`, `Téléphone`, `Site Web`, `Délai`                          |
| Commandes    | `Numéro Commande`, `Nom Client`, `Statut`, `Total`, `Date`, `Source`      |

## Modes d'Importation

1.  **Mode Simulation (Dry Run)** : Valide le fichier et affiche les erreurs potentielles sans modifier la base de données.
2.  **Mise à jour (Upsert)** : Si un élément avec le même nom existe déjà, il est mis à jour. Sinon, il est créé.
3.  **Strict** : Si activé (par défaut), toute erreur de validation sur une ligne empêche l'import de cette ligne mais pas des autres.

## Utilisation API (curl)

```bash
curl -X POST http://localhost:3000/api/import/ingredients \
  -H "Content-Type: application/json" \
  -d '{
    "orgId": "org-1",
    "csvText": "Nom;Catégorie;Prix Unitaire\nVanille;Ingrédient;15,50",
    "dryRun": false,
    "upsert": true
  }'
```

## Limites Techniques

- **Volume** : Maximum 5000 lignes par import pour éviter les timeouts Vercel.
- **Sécurité** : Toutes les mutations sont exécutées dans une transaction Prisma par batch.
- **Audit** : Chaque import génère un log d'audit `IMPORT_CSV` avec le résumé des actions.
