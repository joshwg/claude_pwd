import React, { useState, useEffect } from 'react';
import { User as UserType } from '../types';
import { getUsers, createUser, updateUser, deleteUser, updateUserPassword, validateUsername } from '../services/userService';
import { Users, Plus, Edit, Trash2, Shield, User, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useDebounce } from '../hooks/useDebounce';
import PasswordInput from '../components/PasswordInput';

interface UserFormData {
  name: string;
  password: string;
  isAdmin: boolean;
}

interface ValidationState {
  username: {
    isValidating: boolean;
    isValid: boolean;
    message: string;
  };
  password: {
    isValid: boolean;
    message: string;
  };
}

const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetUser, setResetUser] = useState<{ id: string; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    password: '',
    isAdmin: false
  });
  const [validation, setValidation] = useState<ValidationState>({
    username: {
      isValidating: false,
      isValid: true,
      message: ''
    },
    password: {
      isValid: true,
      message: ''
    }
  });

  const debouncedUsername = useDebounce(formData.name, 500);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (debouncedUsername && debouncedUsername.trim() !== '') {
      validateUsernameDebounced(debouncedUsername.trim());
    } else {
      setValidation(prev => ({
        ...prev,
        username: { isValidating: false, isValid: true, message: '' }
      }));
    }
  }, [debouncedUsername, editingUser]);

  useEffect(() => {
    // Validate password whenever it changes or when switching between create/edit modes
    validatePassword(formData.password);
  }, [formData.password, editingUser]);

  const validateUsernameDebounced = async (username: string) => {
    setValidation(prev => ({
      ...prev,
      username: { ...prev.username, isValidating: true }
    }));

    try {
      const result = await validateUsername(username, editingUser?.id);
      setValidation(prev => ({
        ...prev,
        username: {
          isValidating: false,
          isValid: result.available,
          message: result.available ? 'Username is available' : result.message
        }
      }));
    } catch (error) {
      setValidation(prev => ({
        ...prev,
        username: {
          isValidating: false,
          isValid: false,
          message: 'Failed to validate username'
        }
      }));
    }
  };

  const validatePassword = (password: string) => {
    if (!password && !editingUser) {
      setValidation(prev => ({
        ...prev,
        password: {
          isValid: false,
          message: 'Password is required'
        }
      }));
      return;
    }

    if (password && password.length < 6) {
      setValidation(prev => ({
        ...prev,
        password: {
          isValid: false,
          message: 'Password must be at least 6 characters long'
        }
      }));
      return;
    }

    setValidation(prev => ({
      ...prev,
      password: {
        isValid: true,
        message: password ? 'Password is valid' : ''
      }
    }));
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await getUsers();
      setUsers(data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to load users';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingUser) {
        // Update existing user
        const updated = await updateUser(editingUser.id, {
          name: formData.name,
          isAdmin: formData.isAdmin
        });
        setUsers(users.map(u => u.id === editingUser.id ? updated : u));
        toast.success('User updated successfully');
      } else {
        // Create new user
        const created = await createUser(formData);
        setUsers([...users, created].sort((a, b) => a.name.localeCompare(b.name)));
        toast.success('User created successfully');
      }
      
      resetForm();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Operation failed');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete user "${name}"?`)) return;
    
    try {
      await deleteUser(id);
      setUsers(users.filter(u => u.id !== id));
      toast.success('User deleted successfully');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to delete user';
      toast.error(errorMessage);
    }
  };

  const handleResetPassword = (id: string, name: string) => {
    setResetUser({ id, name });
    setNewPassword('');
    setShowPasswordReset(true);
  };

  const submitPasswordReset = async () => {
    if (!resetUser || !newPassword) return;

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    try {
      await updateUserPassword(resetUser.id, { newPassword });
      toast.success('Password updated successfully');
      setShowPasswordReset(false);
      setResetUser(null);
      setNewPassword('');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to update password';
      toast.error(errorMessage);
    }
  };

  const cancelPasswordReset = () => {
    setShowPasswordReset(false);
    setResetUser(null);
    setNewPassword('');
  };

  const resetForm = () => {
    setFormData({ name: '', password: '', isAdmin: false });
    setEditingUser(null);
    setShowForm(false);
    setValidation({
      username: {
        isValidating: false,
        isValid: true,
        message: ''
      },
      password: {
        isValid: true,
        message: ''
      }
    });
  };

  const startEdit = (user: UserType) => {
    setFormData({
      name: user.name,
      password: '', // Don't prefill password for security
      isAdmin: user.isAdmin
    });
    setEditingUser(user);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600 mt-2">Manage user accounts and permissions</p>
      </div>

      {/* Controls */}
      <div className="mb-8">
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New User
        </button>
      </div>

      {/* User Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h3>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formData.name && !validation.username.isValid 
                        ? 'border-red-300 bg-red-50' 
                        : formData.name && validation.username.isValid && !validation.username.isValidating
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-300'
                    }`}
                    placeholder="Username"
                  />
                  {validation.username.isValidating && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    </div>
                  )}
                </div>
                {formData.name && validation.username.message && (
                  <p className={`text-xs mt-1 ${
                    validation.username.isValid ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {validation.username.message}
                  </p>
                )}
              </div>

              {!editingUser && (
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <PasswordInput
                    id="password"
                    required={!editingUser}
                    value={formData.password}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData(prev => ({ ...prev, password: value }));
                      validatePassword(value);
                    }}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      !validation.password.isValid && formData.password
                        ? 'border-red-300 bg-red-50'
                        : validation.password.isValid && formData.password && validation.password.message
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-300'
                    }`}
                    placeholder="Password"
                    minLength={6}
                    autoComplete="new-password"
                  />
                  {!validation.password.isValid && formData.password && (
                    <p className="mt-1 text-sm text-red-600">
                      {validation.password.message}
                    </p>
                  )}
                  {validation.password.isValid && formData.password && validation.password.message && (
                    <p className="mt-1 text-sm text-green-600">
                      {validation.password.message}
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isAdmin"
                  checked={formData.isAdmin}
                  onChange={(e) => setFormData(prev => ({ ...prev, isAdmin: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isAdmin" className="ml-2 text-sm text-gray-700">
                  Is Administrator
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    !validation.username.isValid || 
                    validation.username.isValidating ||
                    (!editingUser && !validation.password.isValid)
                  }
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordReset && resetUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Reset Password for "{resetUser.name}"
              </h3>
              <button
                onClick={cancelPasswordReset}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  New Password *
                </label>
                <PasswordInput
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter new password (minimum 6 characters)"
                  required
                />
                {newPassword && newPassword.length < 6 && (
                  <p className="mt-1 text-sm text-red-600">
                    Password must be at least 6 characters long
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={cancelPasswordReset}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitPasswordReset}
                  disabled={!newPassword || newPassword.length < 6}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Users ({users.length})
          </h2>
        </div>

        <ul className="divide-y divide-gray-200">
          {users.map(user => (
            <li key={user.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {user.isAdmin ? (
                      <Shield className="h-8 w-8 text-blue-600" />
                    ) : (
                      <User className="h-8 w-8 text-gray-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{user.name}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>
                        {user.isAdmin ? 'Administrator' : 'Standard User'}
                      </span>
                      <span>
                        Member since {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => startEdit(user)}
                    className="p-2 text-gray-400 hover:text-blue-600"
                    title="Edit user"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleResetPassword(user.id, user.name)}
                    className="p-2 text-gray-400 hover:text-yellow-600"
                    title="Reset password"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(user.id, user.name)}
                    className="p-2 text-gray-400 hover:text-red-600"
                    title="Delete user"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {users.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No users found.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
