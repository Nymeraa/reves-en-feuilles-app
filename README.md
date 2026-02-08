# Rêves en Feuilles App

Application Next.js pour la gestion de stock et commandes.

## Prérequis

- Node.js (v20+ recommandé)
- npm / yarn / pnpm

## Installation

```bash
npm install
```

## Développement

Pour lancer le serveur de développement :

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:3000`.

## Build

Pour construire l'application pour la production :

```bash
npm run build
```

## Base de Données & Vercel

Cette application utilise Prisma avec une base de données PostgreSQL (Supabase).

### Configuration Vercel

Pour le déploiement sur Vercel, assurez-vous de configurer les variables d'environnement suivantes dans les paramètres du projet (Settings > Environment Variables) :

- `DB_DRIVER`: `sql`
- `DATABASE_URL`: URL du Transaction Pooler (port 6543)
- `DIRECT_URL`: URL de connexion directe (port 5432)
- `ALLOW_JSON_FALLBACK`: `false` (pour la production)

Voir le fichier `VERCEL_CHECKLIST.md` pour plus de détails.

## Healthcheck

L'état du système et de la base de données peut être vérifié via l'endpoint :

`GET /api/system/health`
