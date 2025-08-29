import axios from 'axios';
import { Tag, CreateTagRequest, UpdateTagRequest } from '../types';

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

export const getTags = async (): Promise<Tag[]> => {
  const response = await api.get('/tags');
  return response.data;
};

export const createTag = async (tagData: CreateTagRequest): Promise<Tag> => {
  const response = await api.post('/tags', tagData);
  return response.data;
};

export const updateTag = async (id: string, tagData: UpdateTagRequest): Promise<Tag> => {
  const response = await api.put(`/tags/${id}`, tagData);
  return response.data;
};

export const deleteTag = async (id: string): Promise<void> => {
  await api.delete(`/tags/${id}`);
};
