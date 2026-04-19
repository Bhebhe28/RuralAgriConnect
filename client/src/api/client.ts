import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL: BASE_URL });

// Attach auth token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle responses — auto logout on 401, queue writes when offline
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(err);
    }

    // If offline and it's a write operation, queue it for later
    if (!navigator.onLine && err.config?.method !== 'get') {
      const queue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
      queue.push({
        url:     err.config.url,
        method:  err.config.method,
        data:    err.config.data,
        headers: err.config.headers,
        queuedAt: new Date().toISOString(),
      });
      localStorage.setItem('offlineQueue', JSON.stringify(queue));
      console.log('📦 Request queued for sync when online');
      return Promise.resolve({ data: { queued: true, message: 'Saved offline — will sync when connected' } });
    }

    return Promise.reject(err);
  }
);

// When back online — flush the offline queue
window.addEventListener('online', async () => {
  const queue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
  if (queue.length === 0) return;

  console.log(`🔄 Back online — syncing ${queue.length} queued request(s)`);
  const remaining = [];

  for (const req of queue) {
    try {
      await api.request({ url: req.url, method: req.method, data: req.data });
      console.log(`✅ Synced: ${req.method} ${req.url}`);
    } catch {
      remaining.push(req); // keep failed ones for next attempt
    }
  }

  localStorage.setItem('offlineQueue', JSON.stringify(remaining));
  if (remaining.length === 0) console.log('✅ All offline actions synced');
});

export default api;
