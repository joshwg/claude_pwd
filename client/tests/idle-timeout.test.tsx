import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import React from 'react';

// Mock the authService
vi.mock('../src/services/authService', () => ({
  login: vi.fn().mockImplementation(() => Promise.resolve({
    user: { id: '1', name: 'testuser', isAdmin: false },
    token: 'mock-token'
  })),
  verifyToken: vi.fn().mockImplementation(() => Promise.resolve({
    user: { id: '1', name: 'testuser', isAdmin: false }
  }))
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

// Test component to access auth context
const TestComponent: React.FC = () => {
  const { user, login, logout, logoutReason, clearLogoutReason } = useAuth();
  
  return (
    <div>
      <div data-testid="user-status">
        {user ? `Logged in as ${user.name}` : 'Not logged in'}
      </div>
      {logoutReason && (
        <div data-testid="logout-reason">
          {logoutReason}
          <button data-testid="clear-reason" onClick={clearLogoutReason}>
            Clear
          </button>
        </div>
      )}
      <button 
        data-testid="login-btn" 
        onClick={() => login({ name: 'testuser', password: 'password' })}
      >
        Login
      </button>
      <button 
        data-testid="logout-btn" 
        onClick={() => logout()}
      >
        Logout
      </button>
      <button 
        data-testid="logout-with-reason-btn" 
        onClick={() => logout('Test logout reason')}
      >
        Logout with reason
      </button>
    </div>
  );
};

describe('Idle Timeout and Logout Reason', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should show logout reason when user is logged out with reason', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Login first
    const loginBtn = screen.getByTestId('login-btn');
    fireEvent.click(loginBtn);

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in as testuser');
    });

    // Logout with reason
    const logoutWithReasonBtn = screen.getByTestId('logout-with-reason-btn');
    fireEvent.click(logoutWithReasonBtn);

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Not logged in');
      expect(screen.getByTestId('logout-reason')).toHaveTextContent('Test logout reason');
    });
  });

  it('should clear logout reason when clearLogoutReason is called', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Login first
    const loginBtn = screen.getByTestId('login-btn');
    fireEvent.click(loginBtn);

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in as testuser');
    });

    // Logout with reason
    const logoutWithReasonBtn = screen.getByTestId('logout-with-reason-btn');
    fireEvent.click(logoutWithReasonBtn);

    await waitFor(() => {
      expect(screen.getByTestId('logout-reason')).toHaveTextContent('Test logout reason');
    });

    // Clear the reason
    const clearReasonBtn = screen.getByTestId('clear-reason');
    fireEvent.click(clearReasonBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('logout-reason')).not.toBeInTheDocument();
    });
  });

  it('should automatically logout user after idle timeout', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Login first
    const loginBtn = screen.getByTestId('login-btn');
    fireEvent.click(loginBtn);

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in as testuser');
    });

    // Simulate idle timeout by advancing timers
    vi.advanceTimersByTime(30 * 60 * 1000); // 30 minutes

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Not logged in');
    });

    // Should show idle timeout message
    await waitFor(() => {
      expect(screen.getByTestId('logout-reason')).toHaveTextContent(
        'Your session has expired due to inactivity. Please log in again.'
      );
    });
  });
});
