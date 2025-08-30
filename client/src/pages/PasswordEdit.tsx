import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Tag, PasswordEntry } from '../types';
import { getTags } from '../services/tagService';
import { createPasswordEntry, updatePasswordEntry, validatePasswordEntry, getPasswordEntryNotes } from '../services/passwordService';
import { useDebounce } from '../hooks/useDebounce';
import PasswordInput from '../components/PasswordInput';
import { ArrowLeft, Save, X, Plus } from 'lucide-react';

interface LocationState {
  password?: PasswordEntry;
}

interface ValidationState {
  isValidating: boolean;
  isValid: boolean;
  message: string;
}

const PasswordEdit: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  
  const [formData, setFormData] = useState({
    site: '',
    username: '',
    password: '',
    notes: '',
    tagIds: [] as string[]
  });
  
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [draggedTag, setDraggedTag] = useState<Tag | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [validation, setValidation] = useState<ValidationState>({
    isValidating: false,
    isValid: true,
    message: ''
  });

  const debouncedSite = useDebounce(formData.site, 500);
  const debouncedUsername = useDebounce(formData.username, 500);

  useEffect(() => {
    const loadData = async () => {
      try {
        const tagsData = await getTags();
        
        if (state?.password) {
          const password = state.password;
          
          // Load notes if they exist
          let notes = '';
          if (password.hasNotes) {
            try {
              const notesData = await getPasswordEntryNotes(password.id);
              notes = notesData.notes || '';
            } catch (error) {
              console.error('Error loading notes:', error);
            }
          }
          
          setFormData({
            site: password.site || '',
            username: password.username || '',
            password: password.password || '',
            notes: notes,
            tagIds: password.tags?.map((tag: Tag) => tag.id) || []
          });
          
          const passwordTagIds = password.tags?.map((tag: Tag) => tag.id) || [];
          const passwordTags = tagsData.filter(tag => passwordTagIds.includes(tag.id));
          const available = tagsData.filter(tag => !passwordTagIds.includes(tag.id));
          
          setSelectedTags(passwordTags);
          setAvailableTags(available);
        } else {
          setAvailableTags(tagsData);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [state]);

  useEffect(() => {
    if (debouncedSite && debouncedUsername && debouncedSite.trim() !== '' && debouncedUsername.trim() !== '') {
      validateEntry(debouncedSite.trim(), debouncedUsername.trim());
    } else {
      setValidation({ isValidating: false, isValid: true, message: '' });
    }
  }, [debouncedSite, debouncedUsername, state?.password]);

  const validateEntry = async (site: string, username: string) => {
    setValidation(prev => ({ ...prev, isValidating: true }));

    try {
      const result = await validatePasswordEntry(site, username, state?.password?.id);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validation.isValid || validation.isValidating) {
      return;
    }

    try {
      const dataToSubmit = {
        ...formData,
        tagIds: selectedTags.map(tag => tag.id)
      };

      if (state?.password) {
        await updatePasswordEntry(state.password.id, dataToSubmit);
      } else {
        await createPasswordEntry(dataToSubmit);
      }
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving password:', error);
    }
  };

  const handleDragStart = (e: React.DragEvent, tag: Tag) => {
    setDraggedTag(tag);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (draggedTag && !selectedTags.find(tag => tag.id === draggedTag.id)) {
      setSelectedTags(prev => [...prev, draggedTag]);
      setAvailableTags(prev => prev.filter(tag => tag.id !== draggedTag.id));
    }
    setDraggedTag(null);
  };

  const removeTag = (tagToRemove: Tag) => {
    setSelectedTags(prev => prev.filter(tag => tag.id !== tagToRemove.id));
    setAvailableTags(prev => [...prev, tagToRemove].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const addTag = (tagToAdd: Tag) => {
    setSelectedTags(prev => [...prev, tagToAdd]);
    setAvailableTags(prev => prev.filter(tag => tag.id !== tagToAdd.id));
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                {state?.password ? 'Edit Password Entry' : 'Add New Password Entry'}
              </h1>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Password Details */}
            <div className="space-y-6">
              <h2 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                Password Details
              </h2>
              
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
            </div>

            {/* Right Column - Tag Management */}
            <div className="space-y-6">
              <h2 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                Tag Management
              </h2>
              
              {/* Selected Tags - Drop Zone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selected Tags ({selectedTags.length})
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`min-h-[120px] p-4 border-2 border-dashed rounded-lg transition-colors ${
                    isDragOver 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 bg-gray-50'
                  }`}
                >
                  {selectedTags.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Drag tags here or click to add</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedTags.map(tag => (
                        <div
                          key={tag.id}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-white border shadow-sm"
                        >
                          <div
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span>{tag.name}</span>
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-2 text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Available Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Tags ({availableTags.length})
                </label>
                <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
                  {availableTags.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      <p>All tags are already selected</p>
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {availableTags.map(tag => (
                        <div
                          key={tag.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, tag)}
                          onClick={() => addTag(tag)}
                          className="flex items-center p-2 rounded-md hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-200 transition-colors"
                        >
                          <div
                            className="w-3 h-3 rounded-full mr-3"
                            style={{ backgroundColor: tag.color }}
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">{tag.name}</div>
                            {tag.description && (
                              <div className="text-xs text-gray-500 truncate">{tag.description}</div>
                            )}
                          </div>
                          <Plus className="h-4 w-4 text-gray-400" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-8 border-t border-gray-200 mt-8">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!validation.isValid || validation.isValidating}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4 mr-2" />
              {state?.password ? 'Update' : 'Create'} Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordEdit;
