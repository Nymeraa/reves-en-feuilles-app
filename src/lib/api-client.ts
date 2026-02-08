// Optional: we can import the router type, but often we pass the refresh function directly
import { useRouter } from 'next/navigation';

export interface ApiError {
  error: string;
  details?: any;
}

export interface ApiFetchOptions extends RequestInit {
  onSuccess?: () => void;
}

/**
 * A wrapper around fetch for calling our API routes.
 * - Enforces /api prefix
 * - Enforces Content-Type: application/json for non-GET
 * - Standardizes error handling
 * - Supports onSuccess callback for e.g. router.refresh()
 */
export async function apiFetch<T>(endpoint: string, options: ApiFetchOptions = {}): Promise<T> {
  const { headers, onSuccess, ...rest } = options;

  // Enforce /api prefix
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = path.startsWith('/api') ? path : `/api${path}`;

  // Default headers
  const defaultHeaders: HeadersInit = {
    Accept: 'application/json',
  };

  // Auto-set Content-Type for mutation methods if not FormData
  if (options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method.toUpperCase())) {
    if (!(options.body instanceof FormData)) {
      (defaultHeaders as any)['Content-Type'] = 'application/json';
    }
  }

  const response = await fetch(url, {
    headers: {
      ...defaultHeaders,
      ...headers,
    },
    ...rest,
  });

  let data: any;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    // Handle empty or non-JSON responses (e.g. 204 No Content)
    data = await response.text().then((text) => (text ? JSON.parse(text) : {}));
  }

  if (!response.ok) {
    const errorMsg =
      data.error || data.message || `API Request Failed: ${response.status} ${response.statusText}`;
    console.error(`[API] Error calling ${url}:`, errorMsg, data);
    throw new Error(errorMsg);
  }

  if (onSuccess) {
    onSuccess();
  }

  return data as T;
}
