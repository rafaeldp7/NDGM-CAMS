/**
 * API client for NDGM RFID Server
 * Base URL and token are stored in localStorage.
 */
const API_KEYS = { BASE: 'ndgm_api_base', TOKEN: 'ndgm_token', USER: 'ndgm_user' };

function getApiBase() {
  return localStorage.getItem(API_KEYS.BASE) || 'http://localhost:3000';
}

function setApiBase(url) {
  const base = url.replace(/\/$/, '');
  localStorage.setItem(API_KEYS.BASE, base);
  return base;
}

function getToken() {
  return localStorage.getItem(API_KEYS.TOKEN);
}

function setToken(token, user) {
  if (token) localStorage.setItem(API_KEYS.TOKEN, token);
  else localStorage.removeItem(API_KEYS.TOKEN);
  if (user != null) localStorage.setItem(API_KEYS.USER, JSON.stringify(user));
  else localStorage.removeItem(API_KEYS.USER);
}

function getStoredUser() {
  try {
    const s = localStorage.getItem(API_KEYS.USER);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

function clearAuth() {
  localStorage.removeItem(API_KEYS.TOKEN);
  localStorage.removeItem(API_KEYS.USER);
}

async function request(method, path, body, options = {}) {
  const base = getApiBase();
  const url = path.startsWith('http') ? path : base + (path.startsWith('/') ? path : '/' + path);
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const res = await fetch(url, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
    signal: options.signal,
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const err = new Error(data?.error || res.statusText || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

const api = {
  getBase: getApiBase,
  setBase: setApiBase,
  getToken,
  setToken,
  getStoredUser,
  clearAuth,

  get: (path, opts) => request('GET', path, null, opts),
  post: (path, body, opts) => request('POST', path, body, opts),
  patch: (path, body, opts) => request('PATCH', path, body, opts),
  delete: (path, opts) => request('DELETE', path, null, opts),

  // Auth
  async login(idNumber, password) {
    const data = await this.post('/api/auth/login', { idNumber, password });
    setToken(data.token, data.user);
    return data;
  },
  logout() {
    clearAuth();
  },
  async register(name, idNumber, role) {
    return this.post('/api/auth/register', { name, idNumber, role });
  },

  // Scan (no auth required)
  async scan(userIdNumber, rfidScannerId) {
    return this.post('/api/logs/scan', { userIdNumber, rfidScannerId });
  },

  // Logs (auth required)
  async getLogs(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.get('/api/logs' + (q ? '?' + q : ''));
  },

  // Users (auth required)
  async getUsers() {
    return this.get('/api/users');
  },
};

// Expose for inline script
window.NDGM_API = api;
