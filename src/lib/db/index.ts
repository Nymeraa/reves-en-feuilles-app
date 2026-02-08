import { jsonDb } from '../db-json';
import { sqlDb, isAvailable as isSqlAvailable } from '../db-sql';
import { DbInterface, EntityType } from './types';

// Factory
const DRIVER = process.env.DB_DRIVER || 'json';
const ALLOW_FALLBACK = process.env.ALLOW_JSON_FALLBACK === 'true';

let implementation: DbInterface;

if (DRIVER === 'sql') {
  if (isSqlAvailable) {
    implementation = sqlDb;
    console.log('[DB] Driver: SQL (Prisma)');
  } else {
    if (ALLOW_FALLBACK) {
      console.warn(
        '[DB] SQL requested but unavailable. Falling back to JSON (ALLOW_JSON_FALLBACK=true).'
      );
      implementation = jsonDb;
    } else {
      const msg =
        '[DB] FATAL: DB_DRIVER=sql but Prisma Client is unavailable. Set ALLOW_JSON_FALLBACK=true to allow degraded mode.';
      console.error(msg);
      throw new Error(msg);
    }
  }
} else {
  implementation = jsonDb;
  console.log('[DB] Driver: JSON');
}

export const db: DbInterface = implementation;
export const activeDriver = implementation === sqlDb ? 'sql' : 'json';
