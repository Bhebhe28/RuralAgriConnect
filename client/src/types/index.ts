export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'farmer' | 'admin';
  region?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Advisory {
  id: string;
  title: string;
  content: string;
  crop: string;
  region: string;
  severity: 'info' | 'warning' | 'critical';
  author_id: string;
  author_name: string;
  published_at: string;
  updated_at: string;
  prevention_tips?: string[];
}

export interface WeatherAlert {
  id: string;
  type: string;
  message: string;
  region: string;
  severity: 'info' | 'warning' | 'critical';
  issued_at: string;
  expires_at?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: number;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
}
