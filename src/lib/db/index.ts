// import { jsonDb } from '../db-json'; // Lazy loaded now
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
      // Lazy load JSON DB to avoid filesystem side-effects if not used
      const { jsonDb } = require('../db-json');
      implementation = jsonDb;
    } else {
      const msg =
        '[DB] FATAL: DB_DRIVER=sql but Prisma Client is unavailable. Set ALLOW_JSON_FALLBACK=true to allow degraded mode.';
      console.error(msg);
      throw new Error(msg);
    }
  }
} else {
  // Check Vercel environment
  if (process.env.VERCEL) {
    throw new Error(
      '[DB] FATAL: JSON driver is NOT allowed on Vercel environment. You must use DB_DRIVER=sql. Check your Vercel Environment Variables.'
    );
  }
  const { jsonDb } = require('../db-json');
  implementation = jsonDb;
  console.log('[DB] Driver: JSON');
}

export const db: DbInterface = implementation;
export const activeDriver = implementation === sqlDb ? 'sql' : 'json';
