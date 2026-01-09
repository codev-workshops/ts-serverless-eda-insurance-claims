import { Claim, ClaimRequest, DashboardStats, UIConfig, AuthResponse } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error(error.message || 'An error occurred');
  }

  return response.json();
}

export const claimsApi = {
  getAll: (allClaims = false): Promise<Claim[]> =>
    fetchApi(`/claims?allClaims=${allClaims}`),

  getById: (id: string): Promise<Claim> =>
    fetchApi(`/claims/${id}`),

  create: (claim: ClaimRequest): Promise<Claim> =>
    fetchApi('/claims', {
      method: 'POST',
      body: JSON.stringify(claim),
    }),

  update: (id: string, claim: ClaimRequest): Promise<Claim> =>
    fetchApi(`/claims/${id}`, {
      method: 'PUT',
      body: JSON.stringify(claim),
    }),

  updateStatus: (id: string, status: string): Promise<Claim> =>
    fetchApi(`/claims/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  delete: (id: string): Promise<void> =>
    fetchApi(`/claims/${id}`, {
      method: 'DELETE',
    }),

  getStats: (allStats = false): Promise<DashboardStats> =>
    fetchApi(`/claims/stats?allStats=${allStats}`),
};

export const configApi = {
  getByPageId: (pageId: string): Promise<UIConfig> =>
    fetchApi(`/config/${pageId}`),

  getAll: (): Promise<UIConfig[]> =>
    fetchApi('/config'),

  update: (config: { pageId: string; labels?: Record<string, string>; staticContent?: Record<string, string> }): Promise<UIConfig> =>
    fetchApi('/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    }),

  delete: (pageId: string): Promise<void> =>
    fetchApi(`/config/${pageId}`, {
      method: 'DELETE',
    }),
};

export const authApi = {
  getUser: (): Promise<AuthResponse> =>
    fetchApi('/auth/user'),

  logout: (): Promise<{ message: string }> =>
    fetchApi('/auth/logout'),
};

interface UserResponse {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role: string;
  createdAt: string;
  lastLoginAt?: string;
}

export const usersApi = {
  getAll: (): Promise<UserResponse[]> =>
    fetchApi('/users'),

  getCurrentUser: (): Promise<UserResponse> =>
    fetchApi('/users/me'),

  updateRole: (userId: string, role: string): Promise<UserResponse> =>
    fetchApi(`/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
};
