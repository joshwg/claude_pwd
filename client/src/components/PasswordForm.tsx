import React, { useState, useEffect } from 'react';
import { Tag } from '../types';
import { X } from 'lucide-react';
import { validatePasswordEntry } from '../services/passwordService';
import { useDebounce } from '../hooks/useDebounce';
import { useIsMobile, useIsTouchDevice } from '../hooks/useDeviceDetection';
import PasswordInput from './PasswordInput';

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
  const isMobile = useIsMobile();
  const isTouchDevice = useIsTouchDevice();
  const [formData, setFormData] = useState({
    site: '',
    username: '',
    password: '',
    notes: '',
    tagIds: [] as string[]
  });
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [validation, setValidation] = useState<ValidationState>({
    isValidating: false,
    isValid: true,
    message: ''
  });

  const debouncedSite = useDebounce(formData.site, 500);
  const debouncedUsername = useDebounce(formData.username, 500);

  useEffect(() => {
    if (password) {
      const passwordTags = password.tags || [];
      setFormData({
        site: password.site || '',
        username: password.username || '',
        password: password.password || '',
        notes: password.notes || '',
        tagIds: passwordTags.map((tag: Tag) => tag.id)
      });
      setSelectedTags(passwordTags);
    } else {
      // Reset form when creating new password
      setSelectedTags([]);
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

  const handleTagSelect = (tag: Tag) => {
    if (!selectedTags.find(t => t.id === tag.id)) {
      const newSelectedTags = [...selectedTags, tag];
      setSelectedTags(newSelectedTags);
      setFormData(prev => ({
        ...prev,
        tagIds: newSelectedTags.map(t => t.id)
      }));
    }
  };

  const handleTagRemove = (tagId: string) => {
    const newSelectedTags = selectedTags.filter(t => t.id !== tagId);
    setSelectedTags(newSelectedTags);
    setFormData(prev => ({
      ...prev,
      tagIds: newSelectedTags.map(t => t.id)
    }));
  };

  const getAvailableTags = () => {
    return tags
      .filter(tag => !selectedTags.find(t => t.id === tag.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const getSortedSelectedTags = () => {
    return selectedTags.sort((a, b) => a.name.localeCompare(b.name));
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
  };

  // Drag and Drop Components for Tags
  const DraggableTag: React.FC<{ tag: Tag; onSelect: (tag: Tag) => void }> = ({ tag, onSelect }) => {
    return (
      <div
        draggable={!isMobile && !isTouchDevice}
        onDragStart={(e) => {
          if (!isMobile && !isTouchDevice) {
            e.dataTransfer.setData('application/json', JSON.stringify(tag));
          }
        }}
        onClick={() => onSelect(tag)}
        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-colors hover:opacity-75"
        style={{ 
          backgroundColor: `${tag.color}20`,
          color: tag.color,
          border: `1px solid ${tag.color}40`
        }}
      >
        {tag.name}
      </div>
    );
  };

  const SelectedTag: React.FC<{ tag: Tag; onRemove: (tagId: string) => void }> = ({ tag, onRemove }) => {
    return (
      <div
        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
        style={{ 
          backgroundColor: `${tag.color}20`,
          color: tag.color,
          border: `1px solid ${tag.color}40`
        }}
      >
        {tag.name}
        <button
          onClick={() => onRemove(tag.id)}
          className="ml-2 hover:bg-red-100 rounded-full p-1"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  };

  const DropZone: React.FC<{ onDrop: (tag: Tag) => void; children: React.ReactNode; className?: string }> = ({ 
    onDrop, 
    children, 
    className = "" 
  }) => {
    const [dragOver, setDragOver] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
      if (!isMobile && !isTouchDevice) {
        e.preventDefault();
        setDragOver(true);
      }
    };

    const handleDragLeave = (e: React.DragEvent) => {
      if (!isMobile && !isTouchDevice) {
        e.preventDefault();
        setDragOver(false);
      }
    };

    const handleDrop = (e: React.DragEvent) => {
      if (!isMobile && !isTouchDevice) {
        e.preventDefault();
        setDragOver(false);
        
        try {
          const tagData = e.dataTransfer.getData('application/json');
          const tag = JSON.parse(tagData);
          onDrop(tag);
        } catch (error) {
          console.error('Failed to parse dropped tag data:', error);
        }
      }
    };

    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`${className} ${dragOver ? 'ring-2 ring-blue-500 ring-opacity-50 bg-blue-50' : ''}`}
      >
        {children}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
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
              <PasswordInput
                id="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter password (optional)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                maxLength={128}
                autoComplete="new-password"
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
              rows={6}
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
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Tags
              </label>
              
              {/* Mobile/Touch devices: Use select interface */}
              {(isMobile || isTouchDevice) ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Available Tags</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      onChange={(e) => {
                        if (e.target.value) {
                          const tag = tags.find(t => t.id === e.target.value);
                          if (tag) {
                            handleTagSelect(tag);
                            e.target.value = ''; // Reset selection
                          }
                        }
                      }}
                      value=""
                    >
                      <option value="">Select a tag to add...</option>
                      {getAvailableTags().map(tag => (
                        <option key={tag.id} value={tag.id}>
                          {tag.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {selectedTags.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-2">Selected Tags</label>
                      <div className="flex flex-wrap gap-2 p-3 border border-gray-200 rounded-md bg-gray-50 min-h-[160px]">
                        {getSortedSelectedTags().map(tag => (
                          <SelectedTag
                            key={tag.id}
                            tag={tag}
                            onRemove={handleTagRemove}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Desktop: Use drag and drop interface */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Available Tags */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Available Tags</label>
                    <div className="min-h-[200px] p-3 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex flex-wrap gap-2">
                        {getAvailableTags().map(tag => (
                          <DraggableTag
                            key={tag.id}
                            tag={tag}
                            onSelect={handleTagSelect}
                          />
                        ))}
                        {getAvailableTags().length === 0 && (
                          <p className="text-gray-500 text-sm">
                            {tags.length === 0 ? 'No tags available' : 'All tags are selected'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Selected Tags */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Selected Tags</label>
                    <DropZone
                      onDrop={handleTagSelect}
                      className="min-h-[200px] p-3 border-2 border-dashed border-blue-200 rounded-lg bg-blue-50 transition-colors"
                    >
                      <div className="flex flex-wrap gap-2">
                        {getSortedSelectedTags().map(tag => (
                          <SelectedTag
                            key={tag.id}
                            tag={tag}
                            onRemove={handleTagRemove}
                          />
                        ))}
                        {selectedTags.length === 0 && (
                          <p className="text-gray-500 text-sm">
                            Drag tags here or click on available tags
                          </p>
                        )}
                      </div>
                    </DropZone>
                  </div>
                </div>
              )}
              
              {selectedTags.length > 0 && (
                <div className="mt-2 text-xs text-gray-600">
                  {selectedTags.length} tag{selectedTags.length !== 1 ? 's' : ''} selected
                </div>
              )}
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
