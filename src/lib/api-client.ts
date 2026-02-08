export interface ApiError {
  error: string;
  details?: any;
}

/**
 * A wrapper around fetch for calling our API routes.
 * - Automatically prepends /api if not present (optional, but good for consistency)
 * - Sets Content-Type: application/json
 * - Throws an error if the response is not ok
 * - Returns the typed JSON response
 */
export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const { headers, ...rest } = options;

  const url = endpoint.startsWith('/api')
    ? endpoint
    : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    ...rest,
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data.error || 'API Request Failed';
    console.error(`[API] Error calling ${url}:`, errorMsg, data);
    throw new Error(errorMsg);
  }

  return data as T;
}
