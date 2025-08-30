export interface User {
  id: string;
  name: string;
  isAdmin: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Tag {
  id: string;
  name: string;
  description?: string;
  color: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    passwordEntries: number;
  };
}

export interface PasswordEntry {
  id: string;
  site: string;
  username: string;
  password: string;
  hasNotes: boolean; // Changed from notes?: string to indicate if notes exist
  userId: string;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
}

export interface LoginRequest {
  name: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  // Optional fields for login failure tracking
  previousFailedAttempts?: number;
}

// Login lockout error response
export interface LoginLockoutError {
  error: string;
  lockedUntil: string;
  remainingSeconds: number;
  attempts: number;
}

// Login attempt error response
export interface LoginAttemptError {
  error: string;
  attempts: number;
  attemptsRemaining: number;
}

export interface CreateUserRequest {
  name: string;
  password: string;
  isAdmin?: boolean;
}

export interface UpdateUserRequest {
  name?: string;
  isAdmin?: boolean;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AdminUpdatePasswordRequest {
  newPassword: string;
}

export interface CreateTagRequest {
  name: string;
  description?: string;
  color: string;
}

export interface UpdateTagRequest {
  name?: string;
  description?: string;
  color?: string;
}

export interface CreatePasswordEntryRequest {
  site: string;
  username: string;
  password: string;
  notes?: string;
  tagIds?: string[];
}

export interface UpdatePasswordEntryRequest {
  site?: string;
  username?: string;
  password?: string;
  notes?: string;
  tagIds?: string[];
}

export interface SearchPasswordsParams {
  query?: string;
  tagIds?: string[];
  limit?: number;
  offset?: number;
}

export interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface PasswordEntriesResponse {
  entries: PasswordEntry[];
  pagination: PaginationInfo;
}

export interface PasswordEntryNotes {
  id: string;
  notes: string | null;
}

export interface ApiError {
  error: string;
  message?: string;
  details?: any;
}
