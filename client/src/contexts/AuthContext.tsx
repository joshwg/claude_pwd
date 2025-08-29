import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthResponse, LoginRequest, RegisterRequest } from '../types';
import * as authAPI from '../services/authService';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const { user } = await authAPI.verifyToken();
          setUser(user);
        } catch (error) {
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [token]);

  const login = async (credentials: LoginRequest) => {
    try {
      const response: AuthResponse = await authAPI.login(credentials);
      setUser(response.user);
      setToken(response.token);
      localStorage.setItem('token', response.token);
      toast.success(`Welcome back, ${response.user.name}!`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Login failed');
      throw error;
    }
  };

  const register = async (userData: RegisterRequest) => {
    try {
      const response: AuthResponse = await authAPI.register(userData);
      setUser(response.user);
      setToken(response.token);
      localStorage.setItem('token', response.token);
      toast.success(`Welcome, ${response.user.name}!`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Registration failed');
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    toast.success('Logged out successfully');
  };

  const value: AuthContextType = {
    user,
    token,
    loading,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
