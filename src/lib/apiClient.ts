import axios, { AxiosInstance } from 'axios';
import { ApiResponse } from '@/types';

class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string = '/api') {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor para adicionar token de autenticação
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // Métodos genéricos
  async get<T>(endpoint: string) {
    return this.client.get<ApiResponse<T>>(endpoint);
  }

  async post<T>(endpoint: string, data: any) {
    return this.client.post<ApiResponse<T>>(endpoint, data);
  }

  async put<T>(endpoint: string, data: any) {
    return this.client.put<ApiResponse<T>>(endpoint, data);
  }

  async delete<T>(endpoint: string) {
    return this.client.delete<ApiResponse<T>>(endpoint);
  }

  // Métodos para Ocorrências
  async getIncidents(companyId: string) {
    return this.get(`/incidents?companyId=${companyId}`);
  }

  async getIncidentById(incidentId: string) {
    return this.get(`/incidents/${incidentId}`);
  }

  async createIncident(data: any) {
    return this.post('/incidents', data);
  }

  async updateIncidentStatus(incidentId: string, status: string) {
    return this.put(`/incidents/${incidentId}/status`, { status });
  }

  // Métodos para Equipes
  async getTeams(companyId: string) {
    return this.get(`/teams?companyId=${companyId}`);
  }

  async getAvailableTeams(companyId: string) {
    return this.get(`/teams/available?companyId=${companyId}`);
  }

  // Métodos para Chat
  async getMessages(incidentId: string) {
    return this.get(`/messages?incidentId=${incidentId}`);
  }

  async sendMessage(incidentId: string, content: string) {
    return this.post('/messages', { incidentId, content });
  }
}

export const apiClient = new ApiClient();
