const API_URL = import.meta.env.VITE_API_URL;

// Sends a request to the RepRadar API and returns the parsed JSON.
// Throws an Error carrying the API's message if the request fails.
export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || 'Something went wrong');
    error.status = response.status;
    error.details = data.errors;
    throw error;
  }

  return data;
}
