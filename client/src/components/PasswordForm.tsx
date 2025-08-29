import React, { useState, useEffect } from 'react';
import { Tag } from '../types';
import { X } from 'lucide-react';

interface PasswordFormProps {
  password?: any;
  tags: Tag[];
  onSubmit: (data: any) => void;
  onClose: () => void;
}

const PasswordForm: React.FC<PasswordFormProps> = ({ password, tags, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    site: '',
    username: '',
    password: '',
    notes: '',
    tagIds: [] as string[]
  });

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
              value={formData.site}
              onChange={(e) => setFormData(prev => ({ ...prev, site: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Gmail, Facebook, GitHub"
            />
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username/Email *
            </label>
            <input
              type="text"
              id="username"
              required
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="your.email@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                id="password"
                required
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={generatePassword}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Generate
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Additional notes (optional)"
            />
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
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
