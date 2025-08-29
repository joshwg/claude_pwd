import React, { useState, useEffect } from 'react';
import { Tag } from '../types';
import { X } from 'lucide-react';
import { validatePasswordEntry } from '../services/passwordService';
import { useDebounce } from '../hooks/useDebounce';

interface PasswordFormProps {
  password?: any;
  tags: Tag[];
  onSubmit: (data: any) => void;
  onClose: () => void;
}

interface ValidationState {
  isValidating: boolean;
  isValid: boolean;
  message: string;
}

const PasswordForm: React.FC<PasswordFormProps> = ({ password, tags, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    site: '',
    username: '',
    password: '',
    notes: '',
    tagIds: [] as string[]
  });
  const [validation, setValidation] = useState<ValidationState>({
    isValidating: false,
    isValid: true,
    message: ''
  });

  const debouncedSite = useDebounce(formData.site, 500);
  const debouncedUsername = useDebounce(formData.username, 500);

  useEffect(() => {
    if (password) {
      setFormData({
        site: password.site || '',
        username: password.username || '',
        password: password.password || '',
        notes: password.notes || '',
        tagIds: password.tags?.map((tag: Tag) => tag.id) || []
      });
    }
  }, [password]);

  useEffect(() => {
    if (debouncedSite && debouncedUsername && debouncedSite.trim() !== '' && debouncedUsername.trim() !== '') {
      validateEntry(debouncedSite.trim(), debouncedUsername.trim());
    } else {
      setValidation({ isValidating: false, isValid: true, message: '' });
    }
  }, [debouncedSite, debouncedUsername, password]);

  const validateEntry = async (site: string, username: string) => {
    setValidation(prev => ({ ...prev, isValidating: true }));

    try {
      const result = await validatePasswordEntry(site, username, password?.id);
      setValidation({
        isValidating: false,
        isValid: result.available,
        message: result.available ? 'Site and username combination is available' : result.message
      });
    } catch (error) {
      setValidation({
        isValidating: false,
        isValid: false,
        message: 'Failed to validate entry'
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleTagToggle = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter(id => id !== tagId)
        : [...prev.tagIds, tagId]
    }));
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {password ? 'Edit Password' : 'Add New Password'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="site" className="block text-sm font-medium text-gray-700 mb-1">
              Site/Service *
            </label>
            <input
              type="text"
              id="site"
              required
              maxLength={256}
              value={formData.site}
              onChange={(e) => setFormData(prev => ({ ...prev, site: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Gmail, Facebook, GitHub"
            />
            <div className="text-xs text-gray-500 mt-1">
              {formData.site.length}/256 characters
            </div>
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username/Email *
            </label>
            <div className="relative">
              <input
                type="text"
                id="username"
                required
                maxLength={128}
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  formData.site && formData.username && !validation.isValid 
                    ? 'border-red-300 bg-red-50' 
                    : formData.site && formData.username && validation.isValid && !validation.isValidating
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-300'
                }`}
                placeholder="your.email@example.com"
              />
              {validation.isValidating && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                </div>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {formData.username.length}/128 characters
            </div>
            {formData.site && formData.username && validation.message && (
              <p className={`text-xs mt-1 ${
                validation.isValid ? 'text-green-600' : 'text-red-600'
              }`}>
                {validation.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password <span className="text-xs text-gray-500">(optional)</span>
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                id="password"
                maxLength={128}
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                placeholder="Enter password (optional)"
              />
              <button
                type="button"
                onClick={generatePassword}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Generate
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {formData.password.length}/128 characters
              {formData.password.length > 0 && formData.password.length < 12 && (
                <span className="text-yellow-600 ml-2">⚠️ Consider using 12+ characters for better security</span>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              rows={3}
              maxLength={4096}
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Additional notes (optional)"
            />
            <div className="text-xs text-gray-500 mt-1">
              {formData.notes.length}/4096 characters
            </div>
          </div>

          {tags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="space-y-2">
                {tags.map(tag => (
                  <label key={tag.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.tagIds.includes(tag.id)}
                      onChange={() => handleTagToggle(tag.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="ml-2 flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-sm">{tag.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!validation.isValid || validation.isValidating}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {password ? 'Update' : 'Create'} Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordForm;
