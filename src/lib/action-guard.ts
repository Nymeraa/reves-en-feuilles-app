import { headers } from 'next/headers';

/**
 * Guardrail to prevent Server Actions from being used for data mutation in production
 * or anywhere really, as we are migrating to API Routes for better JSON handling.
 *
 * Usage: Call this at the start of any Server Action.
 */
export async function ensureApiRouteOnly() {
  if (process.env.NODE_ENV === 'development') {
    // Optional level: Log warning? Throw error?
    // console.warn('[GUARDRAIL] This Server Action should be an API Route!');
  }
  // We don't want to break existing actions yet if we missed some,
  // so maybe just logging for now.
  // But ultimately we want to Block it.

  // For now, let's just leave this file as a place holder for future enforcement.
  // Or we can use it to log usage.
  console.log('[ACTION] Server Action called. Verify if this should be an API Route.');
}
