// API Types
export interface User {
  _id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface PDF {
  _id: string;
  filename: string;
  originalName: string;
  size: number;
  uploadDate: string;
  userId: string;
  extractedText?: string;
  images?: string[];
}

export interface Note {
  _id: string;
  user: string;
  pdf: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  _id: string;
  userId: string;
  pdfId: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiError {
  error: string;
  message?: string;
}
