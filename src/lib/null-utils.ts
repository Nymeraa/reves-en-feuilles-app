/**
 * Recursively converts null values to undefined in an object.
 * This is useful for Zod schemas where optional fields are expected to be undefined,
 * but the frontend might send null.
 */
export function nullToUndefinedDeep(obj: any): any {
  if (obj === null) return undefined;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(nullToUndefinedDeep);

  const newObj: any = {};
  for (const key in obj) {
    newObj[key] = nullToUndefinedDeep(obj[key]);
  }
  return newObj;
}
