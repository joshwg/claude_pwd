import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { User, AuthResponse, LoginRequest } from '../types';
import * as authAPI from '../services/authService';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  logoutReason: string | null;
  loginError: string | null;
  loginLockout: { 
    isLocked: boolean; 
    remainingSeconds: number; 
    attempts: number; 
  } | null;
  previousFailedAttempts: number | null;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: (reason?: string) => void;
  clearLogoutReason: () => void;
  clearLoginError: () => void;
  clearPreviousFailedAttempts: () => void;
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
  const [logoutReason, setLogoutReason] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLockout, setLoginLockout] = useState<{ 
    isLocked: boolean; 
    remainingSeconds: number; 
    attempts: number; 
  } | null>(null);
  const [previousFailedAttempts, setPreviousFailedAttempts] = useState<number | null>(null);

  const timeoutRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const lockoutTimerRef = useRef<number | null>(null);

  // 30 minutes in milliseconds
  const IDLE_TIMEOUT = 30 * 60 * 1000;

  const resetIdleTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (user) {
      timeoutRef.current = setTimeout(() => {
        logout('Your session has expired due to inactivity. Please log in again.');
      }, IDLE_TIMEOUT);
    }
  }, [user]);

  const handleUserActivity = useCallback(() => {
    if (user) {
      resetIdleTimer();
    }
  }, [user, resetIdleTimer]);

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

  // Set up activity listeners when user is logged in
  useEffect(() => {
    if (user) {
      resetIdleTimer();

      // Listen for user activity
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      
      events.forEach(event => {
        document.addEventListener(event, handleUserActivity, true);
      });

      return () => {
        events.forEach(event => {
          document.removeEventListener(event, handleUserActivity, true);
        });
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [user, handleUserActivity, resetIdleTimer]);

  const login = async (credentials: LoginRequest) => {
    try {
      // Clear previous errors
      setLoginError(null);
      setLoginLockout(null);
      
      const response: AuthResponse = await authAPI.login(credentials);
      setUser(response.user);
      setToken(response.token);
      localStorage.setItem('token', response.token);
      setLogoutReason(null); // Clear any previous logout reason
      
      // Set previous failed attempts if they exist (3+ failures)
      if (response.previousFailedAttempts) {
        setPreviousFailedAttempts(response.previousFailedAttempts);
      }
      
      toast.success(`Welcome back, ${response.user.name}!`);
    } catch (error: any) {
      if (error.response?.status === 423) {
        // Account locked
        const lockoutData = error.response.data;
        setLoginLockout({
          isLocked: true,
          remainingSeconds: lockoutData.remainingSeconds,
          attempts: lockoutData.attempts
        });
        setLoginError(lockoutData.error);
        
        // Start countdown timer
        if (lockoutTimerRef.current) {
          clearInterval(lockoutTimerRef.current);
        }
        
        lockoutTimerRef.current = setInterval(() => {
          setLoginLockout(prev => {
            if (!prev || prev.remainingSeconds <= 1) {
              clearInterval(lockoutTimerRef.current!);
              setLoginLockout(null);
              setLoginError(null);
              return null;
            }
            return {
              ...prev,
              remainingSeconds: prev.remainingSeconds - 1
            };
          });
        }, 1000);
        
        toast.error(lockoutData.error);
      } else {
        // Regular login error
        const errorMessage = error.response?.data?.error || 'Login failed';
        const attemptsData = error.response?.data;
        
        if (attemptsData?.attempts && attemptsData?.attemptsRemaining !== undefined) {
          setLoginError(`${errorMessage}. ${attemptsData.attemptsRemaining} attempts remaining before lockout.`);
        } else {
          setLoginError(errorMessage);
        }
        
        toast.error(errorMessage);
      }
      throw error;
    }
  };

  const logout = (reason?: string) => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (reason) {
      setLogoutReason(reason);
      toast.error(reason);
    } else {
      toast.success('Logged out successfully');
    }
  };

  const clearLogoutReason = () => {
    setLogoutReason(null);
  };

  const clearLoginError = () => {
    setLoginError(null);
    if (lockoutTimerRef.current) {
      clearInterval(lockoutTimerRef.current);
    }
    setLoginLockout(null);
  };

  const clearPreviousFailedAttempts = () => {
    setPreviousFailedAttempts(null);
  };

  const value: AuthContextType = {
    user,
    token,
    loading,
    logoutReason,
    loginError,
    loginLockout,
    previousFailedAttempts,
    login,
    logout,
    clearLogoutReason,
    clearLoginError,
    clearPreviousFailedAttempts,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
