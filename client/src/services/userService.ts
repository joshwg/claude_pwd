import axios from 'axios';
import { 
  User, 
  CreateUserRequest, 
  UpdateUserRequest, 
  UpdatePasswordRequest, 
  AdminUpdatePasswordRequest 
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

export const getUsers = async (): Promise<User[]> => {
  const response = await api.get('/users');
  return response.data;
};

export const createUser = async (userData: CreateUserRequest): Promise<User> => {
  const response = await api.post('/users', userData);
  return response.data;
};

export const updateUser = async (id: string, userData: UpdateUserRequest): Promise<User> => {
  const response = await api.put(`/users/${id}`, userData);
  return response.data;
};

export const deleteUser = async (id: string): Promise<void> => {
  await api.delete(`/users/${id}`);
};

export const updateMyPassword = async (data: UpdatePasswordRequest): Promise<void> => {
  await api.put('/users/me/password', data);
};

export const updateUserPassword = async (id: string, data: AdminUpdatePasswordRequest): Promise<void> => {
  await api.put(`/users/${id}/password`, data);
};
