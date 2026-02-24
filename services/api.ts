import { API_BASE_URL, AUTH_TOKEN_KEY } from '../constants';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface ApiRequestOptions {
  method?: HttpMethod;
  body?: any;
  headers?: Record<string, string>;
  useFormData?: boolean; // Flag to indicate FormData usage
}

export async function apiRequest<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, useFormData = false } = options;
  const token = localStorage.getItem(AUTH_TOKEN_KEY);

  const defaultHeaders: Record<string, string> = {};
  if (!useFormData) {
    defaultHeaders['Content-Type'] = 'application/json';
  }
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers: {
      ...defaultHeaders,
      ...headers,
    },
  };

  if (body) {
    if (useFormData) {
      config.body = body; // Directly use FormData object
    } else {
      config.body = JSON.stringify(body); // Stringify JSON body
    }
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
    throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
  }

  // Handle cases where the response might not have a body (e.g., 204 No Content)
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.indexOf('application/json') !== -1) {
    return response.json();
  } else {
    // For non-JSON responses, you might want to return text or blob
    // For now, returning a generic success object if there's no JSON
    return Promise.resolve({} as T);
  }
}
