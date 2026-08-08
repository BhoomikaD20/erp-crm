const API_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:4000/api';

interface ApiOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

async function request<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const token =
    localStorage.getItem('token');

  const isFormData =
    options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(options.headers || {}),
  };

  if (!isFormData) {
    headers['Content-Type'] =
      'application/json';
  }

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }

  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      method:
        options.method || 'GET',
      headers,
      body: isFormData
        ? (options.body as FormData)
        : options.body !== undefined
        ? JSON.stringify(options.body)
        : undefined,
    }
  );

  let data: any = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        `Request failed with status ${response.status}`
    );
  }

  return data as T;
}

export const api = {
  get<T>(endpoint: string) {
    return request<T>(endpoint);
  },

  post<T>(
    endpoint: string,
    body?: unknown
  ) {
    return request<T>(endpoint, {
      method: 'POST',
      body,
    });
  },

  put<T>(
    endpoint: string,
    body?: unknown
  ) {
    return request<T>(endpoint, {
      method: 'PUT',
      body,
    });
  },

  delete<T>(endpoint: string) {
    return request<T>(endpoint, {
      method: 'DELETE',
    });
  },
};