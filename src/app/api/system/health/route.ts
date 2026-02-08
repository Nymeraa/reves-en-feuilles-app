import { NextResponse } from 'next/server';
import { activeDriver, db } from '@/lib/db';
import { isAvailable as isSqlAvailable } from '@/lib/db-sql';

export async function GET() {
  let dbStatus: 'connected' | 'error' = 'error';
  let dbError: string | null = null;
  let itemCount = 0;

  try {
    // Prefer a table that must exist after migration
    const items = await db.readAll('ingredients'); // or 'orders' / 'recipes'
    itemCount = Array.isArray(items) ? items.length : 0;
    dbStatus = 'connected';
  } catch (e: any) {
    dbStatus = 'error';
    dbError = e?.message ?? String(e);
  }

  // Prisma version if possible
  let prismaVersion = 'N/A';
  if (activeDriver === 'sql' || isSqlAvailable) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Prisma } = require('@prisma/client');
      prismaVersion = Prisma?.prismaVersion?.client ?? 'unknown';
    } catch {
      prismaVersion = 'not-loaded';
    }
  }

  const requestedDriver = process.env.DB_DRIVER ?? 'unset';
  const fallbackAllowed = process.env.ALLOW_JSON_FALLBACK ?? 'false';

  return NextResponse.json({
    status: dbStatus === 'connected' ? 'ok' : 'error',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: {
      requestedDriver,
      resolvedDriver: activeDriver,
      fallbackAllowed,
      fallbackActive: requestedDriver !== activeDriver,
      connected: dbStatus === 'connected',
      error: dbError,
      testReadCount: itemCount,
    },
    prisma: {
      available: isSqlAvailable,
      version: prismaVersion,
    },
  });
}
