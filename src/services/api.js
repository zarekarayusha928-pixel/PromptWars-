// Unified Frontend API Client for Saheli REST Backend
// Graceful offline-first fallback with token interceptors

const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:4000/api';

const TOKEN_KEY = 'saheli_auth_token';
const REFRESH_TOKEN_KEY = 'saheli_refresh_token';

export const tokenStorage = {
  getAccessToken: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  setTokens: (accessToken, refreshToken) => {
    try {
      if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
      if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } catch (e) {
      console.warn('Failed to store tokens in localStorage:', e);
    }
  },
  clearTokens: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch (e) {
      console.warn('Failed to clear tokens from localStorage:', e);
    }
  }
};

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const token = tokenStorage.getAccessToken();
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers
    });

    const isJson = res.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      return {
        success: false,
        status: res.status,
        error: typeof data === 'object' && data.error ? data.error : 'Request failed',
        data
      };
    }

    return {
      success: true,
      status: res.status,
      data
    };
  } catch (err) {
    // Network failure (server offline or cross-origin failure)
    return {
      success: false,
      isOffline: true,
      error: 'Backend service is currently unreachable (running offline demo mode).'
    };
  }
}

export const api = {
  health: {
    check: () => request('/health')
  },
  auth: {
    login: async (email, password) => {
      const res = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (res.success && res.data?.accessToken) {
        tokenStorage.setTokens(res.data.accessToken, res.data.refreshToken);
      }
      return res;
    },
    signup: async (name, email, password) => {
      const res = await request('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
      });
      if (res.success && res.data?.accessToken) {
        tokenStorage.setTokens(res.data.accessToken, res.data.refreshToken);
      }
      return res;
    },
    me: () => request('/auth/me'),
    logout: async () => {
      tokenStorage.clearTokens();
      return request('/auth/logout', { method: 'POST' });
    }
  },
  profiles: {
    get: (id) => request(`/profiles/${id}`),
    update: (id, updates) =>
      request(`/profiles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      })
  },
  logs: {
    get: (profileId) => request(`/profiles/${profileId}/logs`),
    upsert: (profileId, date, logData) =>
      request(`/profiles/${profileId}/logs/${date}`, {
        method: 'PUT',
        body: JSON.stringify(logData)
      }),
    delete: (profileId, date) =>
      request(`/profiles/${profileId}/logs/${date}`, {
        method: 'DELETE'
      })
  },
  insights: {
    get: (profileId) => request(`/profiles/${profileId}/insights`),
    getCycleSummary: (profileId) => request(`/profiles/${profileId}/cycle-summary`)
  },
  brief: {
    getVisitBrief: (profileId) => request(`/profiles/${profileId}/visit-brief`),
    createShareLink: (profileId, expiresInHours = 24) =>
      request(`/profiles/${profileId}/share-link`, {
        method: 'POST',
        body: JSON.stringify({ expiresInHours })
      }),
    getSharedBrief: (token) => request(`/shared/brief/${token}`)
  },
  questions: {
    get: (profileId) => request(`/profiles/${profileId}/questions`),
    update: (profileId, questions) =>
      request(`/profiles/${profileId}/questions`, {
        method: 'PUT',
        body: JSON.stringify({ questions })
      })
  },
  safety: {
    getEvents: (profileId) => request(`/profiles/${profileId}/safety-events`),
    logEvent: (profileId, event) =>
      request(`/profiles/${profileId}/safety-events`, {
        method: 'POST',
        body: JSON.stringify(event)
      })
  },
  backup: {
    export: (profileId) => request(`/profiles/${profileId}/export`),
    import: (profileId, payload) =>
      request(`/profiles/${profileId}/import`, {
        method: 'POST',
        body: JSON.stringify(payload)
      }),
    wipeData: (profileId) =>
      request(`/profiles/${profileId}/data`, {
        method: 'DELETE'
      })
  }
};
