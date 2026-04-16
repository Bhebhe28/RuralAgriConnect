import api from './client';
import type { Advisory, WeatherAlert, User } from '../types';

// Auth
export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password }).then((r) => r.data);

export const register = (data: {
  name: string; email: string; phone?: string;
  password: string; role?: string; region?: string;
}) => api.post('/auth/register', data).then((r) => r.data);

// Advisories
export const getAdvisories = (params?: Partial<Pick<Advisory, 'crop' | 'region' | 'severity'>>) =>
  api.get('/advisories', { params }).then((r) => r.data as Advisory[]);

export const getAdvisory = (id: string) =>
  api.get(`/advisories/${id}`).then((r) => r.data as Advisory);

export const createAdvisory = (data: Omit<Advisory, 'id' | 'author_id' | 'author_name' | 'published_at' | 'updated_at'>) =>
  api.post('/advisories', data).then((r) => r.data);

export const updateAdvisory = (id: string, data: Partial<Advisory>) =>
  api.put(`/advisories/${id}`, data).then((r) => r.data);

export const deleteAdvisory = (id: string) =>
  api.delete(`/advisories/${id}`).then((r) => r.data);

// Weather
export const getWeatherAlerts = (region?: string) =>
  api.get('/weather/alerts', { params: region ? { region } : {} })
    .then((r) => (r.data as any[]).map(a => ({
      id:         a.alert_id ?? a.id,
      type:       a.alert_type ?? a.type ?? 'weather',
      message:    a.message,
      region:     a.region ?? (a.message?.match(/in (.+?)\./)?.[1] ?? ''),
      severity:   a.severity ?? (a.message?.toLowerCase().includes('heatwave') ? 'critical' : a.message?.toLowerCase().includes('heavy') ? 'warning' : 'info'),
      issued_at:  a.created_at ?? a.issued_at ?? '',
      expires_at: a.expires_at,
    })) as WeatherAlert[]);

export const getWeatherData = (region?: string) =>
  api.get('/weather', { params: region ? { region } : {} }).then((r) => r.data);

export const createWeatherAlert = (data: Omit<WeatherAlert, 'id' | 'issued_at'>) =>
  api.post('/weather', data).then((r) => r.data);

export const deleteWeatherAlert = (id: string) =>
  api.delete(`/weather/alerts/${id}`).then((r) => r.data);

// Users
export const getMe = () => api.get('/users/me').then((r) => r.data as User);
export const updateMe = (data: Partial<User>) => api.put('/users/me', data).then((r) => r.data);
export const getUsers = () => api.get('/users').then((r) => r.data as User[]);
export const deleteUser = (id: string) => api.delete(`/users/${id}`).then((r) => r.data);

// Notifications
export const getNotifications = () => api.get('/notifications').then((r) => r.data);
export const markRead = (id: string) => api.put(`/notifications/${id}/read`).then((r) => r.data);
export const markAllRead = () => api.put('/notifications/read-all').then((r) => r.data);

// Sync
export const pullSync = (since?: string) =>
  api.get('/sync/pull', { params: since ? { since } : {} }).then((r) => r.data);
