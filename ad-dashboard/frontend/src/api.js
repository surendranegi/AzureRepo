const BASE = process.env.REACT_APP_API_URL || '';

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.error || `HTTP ${res.status}`), { status: res.status });
  }
  return res.json();
}

export const api = {
  me:          ()          => apiFetch('/users/me'),
  scripts:     (category)  => apiFetch(`/scripts${category && category !== 'all' ? `?category=${category}` : ''}`),
  script:      (id)        => apiFetch(`/scripts/${id}`),
  runScript:   (id, body)  => apiFetch(`/scripts/${id}/run`, { method: 'POST', body: JSON.stringify(body) }),
  uploadScript:(formData)  => fetch(`${BASE}/api/scripts/upload`, { method: 'POST', credentials: 'include', body: formData }).then(r => r.json()),
  deleteScript:(id)        => apiFetch(`/scripts/${id}`, { method: 'DELETE' }),
  history:     (params='') => apiFetch(`/history${params}`),
  historyItem: (id)        => apiFetch(`/history/${id}`),
  users:       ()          => apiFetch('/users'),
  addUser:     (body)      => apiFetch('/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUser:  (id, body)  => apiFetch(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  removeUser:  (id)        => apiFetch(`/users/${id}`, { method: 'DELETE' })
};
