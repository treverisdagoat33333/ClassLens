const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function getToken() {
  return localStorage.getItem('classlens_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    localStorage.removeItem('classlens_token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export const api = {
  login: (email, password) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  getDevices: () => request('/api/devices'),
  getDevice: (id) => request(`/api/devices/${id}`),
  deleteDevice: (id) => request(`/api/devices/${id}`, { method: 'DELETE' }),
  getActivity: (deviceId, limit = 200) => request(`/api/activity/${deviceId}?limit=${limit}`),
  getAlerts: (limit = 100) => request(`/api/activity?limit=${limit}`),
  getScreenshots: (deviceId, limit = 50) => request(`/api/screenshots/${deviceId}?limit=${limit}`),
  getBlocklist: () => request('/api/blocklist/admin'),
  addBlocklistEntry: (pattern, reason) =>
    request('/api/blocklist/admin', { method: 'POST', body: JSON.stringify({ pattern, reason }) }),
  removeBlocklistEntry: (id) => request(`/api/blocklist/admin/${id}`, { method: 'DELETE' }),
  screenshotUrl: (filename) => `${BASE_URL}/api/screenshots/file/${filename}`,
  sendCommand: (deviceId, type, url = '') =>
    request(`/api/devices/${deviceId}/command`, { method: 'POST', body: JSON.stringify({ type, url }) }),
};

export async function fetchImageBlob(filename) {
  if (filename && filename.startsWith('data:image')) {
    return filename;
  }
  const token = getToken();
  const res = await fetch(`${BASE_URL}/api/screenshots/file/${filename}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load image');
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export { getToken, BASE_URL };
