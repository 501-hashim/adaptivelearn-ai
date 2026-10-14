/**
 * Dynamically resolves the backend API base URL.
 * Handles Render cloud deployments, custom user overrides, and local development.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // 1. Manual user/admin override in browser storage
    const manualUrl = localStorage.getItem('adaptivelearn_api_base_url');
    if (manualUrl && manualUrl.trim()) {
      return manualUrl.trim().replace(/\/+$/, '');
    }

    // 2. Global window override (if injected via script or HTML)
    const win = window as any;
    if (win.__API_BASE_URL__ && String(win.__API_BASE_URL__).trim()) {
      return String(win.__API_BASE_URL__).trim().replace(/\/+$/, '');
    }
  }

  // 3. Build-time environment variable
  const envUrl = (
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
    ''
  ).trim();

  // If a valid non-localhost URL is provided via env, use it
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.replace(/\/+$/, '');
  }

  // 4. Runtime domain detection in the browser
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    // Running on Render (e.g., adaptivelearn-frontend.onrender.com)
    if (hostname.endsWith('.onrender.com')) {
      if (hostname.includes('-frontend')) {
        const backendHost = hostname.replace('-frontend', '-backend');
        return `https://${backendHost}`;
      }
      return 'https://adaptivelearn-backend.onrender.com';
    }

    // Running on any other deployed non-localhost host (Vercel, Netlify, custom domain)
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      if (envUrl) {
        return envUrl.replace(/\/+$/, '');
      }
      return 'https://adaptivelearn-backend.onrender.com';
    }
  }

  // 5. Default local development URL
  return (envUrl || 'http://localhost:8000').replace(/\/+$/, '');
}

export function setApiBaseUrl(newUrl: string): void {
  if (typeof window !== 'undefined') {
    if (newUrl) {
      localStorage.setItem('adaptivelearn_api_base_url', newUrl.trim().replace(/\/+$/, ''));
    } else {
      localStorage.removeItem('adaptivelearn_api_base_url');
    }
  }
}

class ApiClient {
  private getHeaders(token?: string | null): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    const activeToken = token || localStorage.getItem('adaptivelearn_token');
    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }
    return headers;
  }

  async request<T>(endpoint: string, options: RequestInit = {}, retries = 1): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}${cleanEndpoint}`;
    const headers = this.getHeaders();

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });
    } catch (err: any) {
      // If Render free instance is cold-starting or waking up, retry once
      if (retries > 0 && (err instanceof TypeError || String(err?.message || '').toLowerCase().includes('fetch'))) {
        await new Promise((res) => setTimeout(res, 2500));
        return this.request<T>(endpoint, options, retries - 1);
      }

      if (err instanceof TypeError || err.name === 'TypeError' || String(err?.message || '').toLowerCase().includes('fetch')) {
        throw new Error(
          `Unable to reach the backend server at ${baseUrl}. If this is a free cloud instance (like Render), it may be waking up from sleep. Please wait a moment and try again.`
        );
      }
      throw err;
    }

    // Cold start 502/503/504 retry
    if ((response.status === 502 || response.status === 503 || response.status === 504) && retries > 0) {
      await new Promise((res) => setTimeout(res, 3000));
      return this.request<T>(endpoint, options, retries - 1);
    }

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('adaptivelearn_token');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  // Auth API
  async register(data: any) {
    return this.request<{ access_token: string; student: any }>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: any) {
    return this.request<{ access_token: string; student: any }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMe() {
    return this.request<any>('/api/v1/auth/me');
  }

  // Curriculum API
  async getSubjects() {
    return this.request<any[]>('/api/v1/subjects');
  }

  async getChapters(subjectId: string) {
    return this.request<any[]>(`/api/v1/subjects/${subjectId}/chapters`);
  }

  async getConcepts(chapterId: string) {
    return this.request<any[]>(`/api/v1/chapters/${chapterId}/concepts`);
  }

  // Quizzes API
  async createQuiz(payload: {
    subject_id: string;
    chapter_id?: string | null;
    mode: string;
    question_count: number;
    difficulty_preference: string;
  }) {
    return this.request<any>('/api/v1/quizzes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getQuiz(quizId: string) {
    return this.request<any>(`/api/v1/quizzes/${quizId}`);
  }

  async saveResponse(quizId: string, payload: {
    question_id: string;
    selected_option?: string | null;
    marked_for_review?: boolean;
    response_time_seconds?: number;
  }) {
    return this.request<any>(`/api/v1/quizzes/${quizId}/responses`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async submitQuiz(quizId: string, payload: {
    responses: Array<{ question_id: string; selected_option?: string | null }>;
    total_time_seconds: number;
  }) {
    return this.request<any>(`/api/v1/quizzes/${quizId}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getQuizResults(quizId: string) {
    return this.request<any>(`/api/v1/quizzes/${quizId}/results`);
  }

  async getQuizHistory(page = 1, limit = 10) {
    return this.request<any[]>(`/api/v1/quizzes/history?page=${page}&limit=${limit}`);
  }

  // Student Analytics API
  async getDashboard() {
    return this.request<any>('/api/v1/students/me/dashboard');
  }

  async getMastery() {
    return this.request<any[]>('/api/v1/students/me/mastery');
  }

  async getRecommendations() {
    return this.request<any[]>('/api/v1/students/me/recommendations');
  }
}

export const api = new ApiClient();
