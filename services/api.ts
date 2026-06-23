import { API_BASE_URL, AUTH_TOKEN_KEY } from '../constants';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface ApiRequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  useFormData?: boolean;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly errors?: { field: string; message: string }[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, useFormData = false } = options;
  const token = localStorage.getItem(AUTH_TOKEN_KEY);

  const defaultHeaders: Record<string, string> = {};
  if (!useFormData) defaultHeaders['Content-Type'] = 'application/json';
  if (token) defaultHeaders['Authorization'] = `Bearer ${token}`;

  const config: RequestInit = {
    method,
    headers: { ...defaultHeaders, ...headers },
  };

  if (body !== undefined) {
    config.body = useFormData ? (body as BodyInit) : JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const data = await response.json().catch(() => ({ message: 'An unknown error occurred.' }));
    throw new ApiError(response.status, data.message ?? `Error ${response.status}`, data.errors);
  }

  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return response.json() as Promise<T>;
  }

  return {} as T;
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Something went wrong. Please try again.';
}
