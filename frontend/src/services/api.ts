const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000').trim();
const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

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

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${API_BASE_URL}${cleanEndpoint}`;
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
      if (err instanceof TypeError || err.name === 'TypeError' || String(err?.message || '').toLowerCase().includes('fetch')) {
        throw new Error(
          `Unable to reach the backend server at ${API_BASE_URL}. Please ensure the AdaptiveLearn backend is running and accessible.`
        );
      }
      throw err;
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
