import axios from 'axios';
import { AuthResponse, User, PDF, Note, Conversation, Message } from '@/types';

// Configure axios defaults
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';


const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

// Test API connection
export const testConnection = async () => {
  try {
    const response = await api.get('/api/test');
    return response.data;
  } catch (error) {
    console.error('Connection test failed:', error);
    throw error;
  }
};

// Auth API
export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/api/user/login', { email });
    return response.data;
  },

  register: async (email: string, password: string, name: string): Promise<AuthResponse> => {
    const response = await api.post('/api/user/register', { name, email });
    return response.data;
  },
};

// Users API
export const usersApi = {
  getProfile: async (): Promise<User> => {
    const response = await api.get('/api/users/profile');
    return response.data;
  },
};

// PDFs API
export const pdfsApi = {
  upload: async (file: File): Promise<PDF> => {
    const formData = new FormData();
    formData.append('pdf', file);
    const response = await api.post('/api/pdf/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  list: async (): Promise<PDF[]> => {
    const response = await api.get('/api/pdf/getpdfs');
    return response.data;
  },

  get: async (id: string): Promise<PDF> => {
    const response = await api.get(`/api/pdf/pdfs/${id}/details`);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/pdf/pdfs/${id}`);
  },
};

// AI API
export const aiApi = {
  chat: async (pdfId: string, message: string, conversationId?: string): Promise<{ response: string; conversationId: string }> => {
    const response = await api.post('/api/ai/chat', { 
      pdfId, 
      message, 
      conversationId 
    });
    return response.data;
  },

  getConversationHistory: async (pdfId: string, page: number = 1, limit: number = 20): Promise<{
    messages: Array<{
      role: 'user' | 'assistant';
      content: string;
      timestamp: string;
      conversationId: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      hasMore: boolean;
      totalConversations: number;
    };
  }> => {
    const response = await api.get(`/api/ai/conversation/${pdfId}?page=${page}&limit=${limit}`);
    return response.data;
  },

  analyzeImage: async (imageData: string): Promise<{ analysis: string }> => {
    const response = await api.post('/api/ai/analyze-image', { imageData });
    return response.data;
  },

  generateNotes: async (pdfId: string): Promise<{ 
    noteId: string; 
    title: string; 
    content: string; 
    message: string; 
  }> => {
    const response = await api.post('/api/ai/generate-notes', { pdfId });
    return response.data;
  },
};

// Notes API
export const notesApi = {
  create: async (title: string, content: string, pdfId?: string): Promise<Note> => {
    const response = await api.post('/api/notes', { title, content, pdfId });
    return response.data;
  },

  list: async (pdfId?: string): Promise<Note[]> => {
    const url = pdfId ? `/api/notes?pdfId=${pdfId}` : '/api/notes';
    const response = await api.get(url);
    return response.data;
  },

  get: async (id: string): Promise<Note> => {
    const response = await api.get(`/api/notes/${id}`);
    return response.data;
  },

  update: async (id: string, title: string, content: string): Promise<Note> => {
    const response = await api.put(`/api/notes/${id}`, { title, content });
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/notes/${id}`);
  },

  download: async (id: string): Promise<void> => {
    const response = await api.get(`/api/notes/${id}/download`, {
      responseType: 'blob',
    });
    
    const blob = new Blob([response.data], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `note-${id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};

// Utility functions
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default api;
