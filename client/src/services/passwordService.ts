import axios from 'axios';
import { 
  PasswordEntry, 
  CreatePasswordEntryRequest, 
  UpdatePasswordEntryRequest, 
  SearchPasswordsParams 
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

export const getPasswordEntries = async (params?: SearchPasswordsParams): Promise<PasswordEntry[]> => {
  const response = await api.get('/passwords', { params });
  return response.data;
};

export const getPasswordEntry = async (id: string): Promise<PasswordEntry> => {
  const response = await api.get(`/passwords/${id}`);
  return response.data;
};

export const createPasswordEntry = async (data: CreatePasswordEntryRequest): Promise<PasswordEntry> => {
  const response = await api.post('/passwords', data);
  return response.data;
};

export const updatePasswordEntry = async (id: string, data: UpdatePasswordEntryRequest): Promise<PasswordEntry> => {
  const response = await api.put(`/passwords/${id}`, data);
  return response.data;
};

export const deletePasswordEntry = async (id: string): Promise<void> => {
  await api.delete(`/passwords/${id}`);
};

export const validatePasswordEntry = async (site: string, username: string, excludeId?: string): Promise<{ available: boolean; message: string }> => {
  const response = await api.post('/passwords/validate-entry', { site, username, excludeId });
  return response.data;
};
