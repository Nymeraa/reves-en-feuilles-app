# Checklist de Déploiement Vercel

## A) Import du Repo & Réglages Build

1. **Import** : Importer le repository GitHub `reves-en-feuilles-app`.
2. **Framework Preset** : `Next.js` (devrait être détecté automatiquement).
3. **Build Command** : `npm run build` (ou la commande par défaut si correcte).
   - _Note_ : Le script `postinstall` dans `package.json` lancera `prisma generate` automatiquement.
4. **Output Directory** : `Next.js default` (ou `.next`).

## B) Variables d'Environnement

Configurer ces variables pour **Production** et **Preview**.

| Nom                   | Valeur / Instruction                                                              | Notes                                                                                                                           |
| :-------------------- | :-------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------ |
| `DB_DRIVER`           | `sql`                                                                             | Force l'utilisation de PostgreSQL/Prisma.                                                                                       |
| `ALLOW_JSON_FALLBACK` | `false`                                                                           | **CRITIQUE**. Interdit le repli sur fichier JSON en cas d'erreur DB.                                                            |
| `DATABASE_URL`        | `postgres://[user]:[password]@[host]:6543/[db]?pgbouncer=true&connection_limit=1` | **Transaction Pooler**. Copier depuis Supabase > Settings > Database > Connection pools. Ajouter `?pgbouncer=true` si manquant. |
| `NEXT_PUBLIC_...`     | _(Si applicable)_                                                                 | Ajouter toute autre variable publique nécessaire.                                                                               |

> **Important** : la variable `DIRECT_URL` n'est **PAS** nécessaire en production sur Vercel (sauf si vous lancez des migrations depuis Vercel, ce qui est déconseillé). Utilisez `DATABASE_URL` (Pooler) pour l'application.

> **Important** : Ne jamais commiter de fichier `.env` contenant ces secrets. Ils doivent être définis uniquement dans l'interface Vercel.

## C) Vérification Post-Déploiement

Une fois le déploiement terminé (status "Ready"), effectuer les tests suivants :

1. **Healthcheck**
   - Accéder à `https://[votre-url-vercel]/api/system/health`
   - Vérifier la réponse JSON :
     ```json
     {
       "status": "ok",
       "database": {
         "connected": true,
         "resolvedDriver": "sql",
         "fallbackActive": false
       }
     }
     ```

2. **Smoke Tests UI**
   - Naviguer sur les pages principales (Recettes, Commandes, Stock).
   - Créer une commande de test (si possible en prod, ou supprimer ensuite).
   - Vérifier que les compteurs de stock changent ou que l'historique de mouvement est enregistré.
