import axios from 'axios';
import { 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  User 
} from '../types';

const API_BASE_URL = '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const login = async (credentials: LoginRequest): Promise<AuthResponse> => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

export const register = async (userData: RegisterRequest): Promise<AuthResponse> => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

export const verifyToken = async (): Promise<{ user: User }> => {
  const response = await api.get('/auth/verify');
  return response.data;
};
