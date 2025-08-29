import React, { useState } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import toast from 'react-hot-toast';

const Login: React.FC = () => {
  const [credentials, setCredentials] = useState({ name: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentials.name || !credentials.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await login(credentials);
    } catch (error) {
      // Error handled in AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white shadow-lg rounded-lg p-8">
        <div className="text-center mb-8">
          <Lock className="mx-auto h-12 w-12 text-primary-600" />
          <h2 className="mt-4 text-3xl font-bold text-gray-900">Sign in</h2>
          <p className="mt-2 text-sm text-gray-600">
            Welcome back to your password manager
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="form-label">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                id="name"
                type="text"
                required
                className="form-input pl-10"
                placeholder="Enter your username"
                value={credentials.name}
                onChange={(e) => setCredentials({ ...credentials, name: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                className="form-input pl-10 pr-10"
                placeholder="Enter your password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              />
              <button
                type="button"
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/auth/register" className="font-medium text-primary-600 hover:text-primary-500">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

const Register: React.FC = () => {
  const [userData, setUserData] = useState({ name: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData.name || !userData.password || !userData.confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (userData.password !== userData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (userData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await register({ name: userData.name, password: userData.password });
    } catch (error) {
      // Error handled in AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white shadow-lg rounded-lg p-8">
        <div className="text-center mb-8">
          <Lock className="mx-auto h-12 w-12 text-primary-600" />
          <h2 className="mt-4 text-3xl font-bold text-gray-900">Sign up</h2>
          <p className="mt-2 text-sm text-gray-600">
            Create your password manager account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="form-label">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                id="name"
                type="text"
                required
                className="form-input pl-10"
                placeholder="Choose a username"
                value={userData.name}
                onChange={(e) => setUserData({ ...userData, name: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                className="form-input pl-10 pr-10"
                placeholder="Choose a password"
                value={userData.password}
                onChange={(e) => setUserData({ ...userData, password: e.target.value })}
              />
              <button
                type="button"
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="form-label">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                className="form-input pl-10 pr-10"
                placeholder="Confirm your password"
                value={userData.confirmPassword}
                onChange={(e) => setUserData({ ...userData, confirmPassword: e.target.value })}
              />
              <button
                type="button"
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/auth/login" className="font-medium text-primary-600 hover:text-primary-500">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route 
            path="/" 
            element={<Navigate to="/auth/login" replace />} 
          />
        </Routes>
      </div>
    </div>
  );
};

export default AuthLayout;
