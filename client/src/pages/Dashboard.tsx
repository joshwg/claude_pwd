import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useAuth } from '../contexts/AuthContext';
import { PasswordEntry, Tag } from '../types';
import { 
  getPasswordEntries, 
  deletePasswordEntry, 
  createPasswordEntry, 
  updatePasswordEntry,
  getPasswordEntryNotes
} from '../services/passwordService';
import { getTags } from '../services/tagService';
import { Plus, Search, Eye, EyeOff, Edit, Trash2, Copy, Download, Upload, X } from 'lucide-react';
import PasswordForm from '../components/PasswordForm';
import { 
  exportPasswordsToCSV, 
  downloadCSV, 
  parsePasswordsFromCSV, 
  readFileAsText
} from '../utils/csvUtils';

const Dashboard: React.FC = () => {
  const { user, previousFailedAttempts, clearPreviousFailedAttempts } = useAuth();
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [editingPassword, setEditingPassword] = useState<PasswordEntry | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingTags, setLoadingTags] = useState(false);
  const [loadedNotes, setLoadedNotes] = useState<Map<string, string | null>>(new Map());
  const [loadingNotes, setLoadingNotes] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPasswordEntries = async () => {
    try {
      setLoading(true);
      const response = await getPasswordEntries();
      console.log('Loaded password entries:', response);
      setPasswords(response.entries || []);
    } catch (error) {
      console.error('Failed to load password entries:', error);
      toast.error('Failed to load password entries');
      setPasswords([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTags = async () => {
    try {
      setLoadingTags(true);
      const tagsData = await getTags();
      setTags(tagsData);
    } catch (error) {
      console.error('Failed to load tags:', error);
      toast.error('Failed to load tags');
      setTags([]);
    } finally {
      setLoadingTags(false);
    }
  };

  useEffect(() => {
    loadPasswordEntries();
    loadTags();
  }, []);

  const togglePasswordVisibility = (passwordId: string) => {
    setVisiblePasswords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(passwordId)) {
        newSet.delete(passwordId);
      } else {
        newSet.add(passwordId);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${type} copied to clipboard`);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const loadPasswordNotes = async (passwordId: string) => {
    if (loadingNotes.has(passwordId) || loadedNotes.has(passwordId)) return;
    
    try {
      setLoadingNotes(prev => new Set(prev).add(passwordId));
      const notesData = await getPasswordEntryNotes(passwordId);
      setLoadedNotes(prev => new Map(prev).set(passwordId, notesData.notes));
    } catch (error) {
      console.error('Failed to load notes:', error);
      toast.error('Failed to load notes');
    } finally {
      setLoadingNotes(prev => {
        const newSet = new Set(prev);
        newSet.delete(passwordId);
        return newSet;
      });
    }
  };

  const handleEditPassword = async (password: PasswordEntry) => {
    setEditingPassword(password);
    
    // Fetch notes if the password has notes and they're not already loaded
    if (password.hasNotes && !loadedNotes.has(password.id)) {
      await loadPasswordNotes(password.id);
    }
    
    setShowPasswordForm(true);
  };

  const hidePasswordNotes = (passwordId: string) => {
    setLoadedNotes(prev => {
      const newMap = new Map(prev);
      newMap.delete(passwordId);
      return newMap;
    });
  };

  const handleExportPasswords = async () => {
    try {
      // Load all notes for complete export
      const notesToLoad = passwords.filter(p => p.hasNotes && !loadedNotes.has(p.id));
      if (notesToLoad.length > 0) {
        const notePromises = notesToLoad.map(async (password) => {
          try {
            const notesData = await getPasswordEntryNotes(password.id);
            return { id: password.id, notes: notesData.notes };
          } catch {
            return { id: password.id, notes: null };
          }
        });
        
        const notes = await Promise.all(notePromises);
        const notesMap = new Map(loadedNotes);
        notes.forEach(note => notesMap.set(note.id, note.notes));
        setLoadedNotes(notesMap);
        
        const csvContent = exportPasswordsToCSV(passwords, notesMap);
        downloadCSV(csvContent, `passwords_export_${new Date().toISOString().split('T')[0]}.csv`);
      } else {
        const csvContent = exportPasswordsToCSV(passwords, loadedNotes);
        downloadCSV(csvContent, `passwords_export_${new Date().toISOString().split('T')[0]}.csv`);
      }
      
      toast.success('Passwords exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export passwords');
    }
  };

  const handleImportPasswords = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const csvContent = await readFileAsText(file);
      const parsedPasswords = parsePasswordsFromCSV(csvContent);
      
      if (parsedPasswords.length === 0) {
        toast.error('No valid passwords found in the CSV file');
        return;
      }

      let importedCount = 0;
      let failedCount = 0;

      for (const parsedPassword of parsedPasswords) {
        try {
          await createPasswordEntry({
            site: parsedPassword.site,
            username: parsedPassword.username,
            password: parsedPassword.password,
            notes: parsedPassword.notes,
            // Note: For now, we skip tag assignment during import as it requires tag lookup
            // tagIds: parsedPassword.tags
          });
          importedCount++;
        } catch (error) {
          console.error('Failed to import password:', parsedPassword.site, error);
          failedCount++;
        }
      }

      if (importedCount > 0) {
        toast.success(`Imported ${importedCount} passwords successfully${failedCount > 0 ? ` (${failedCount} failed)` : ''}`);
        loadPasswordEntries(); // Reload the list
      } else {
        toast.error('Failed to import any passwords');
      }
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Failed to import passwords from CSV file');
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeletePassword = async (id: string) => {
    if (!confirm('Are you sure you want to delete this password?')) return;
    
    try {
      await deletePasswordEntry(id);
      toast.success('Password deleted successfully');
      loadPasswordEntries(); // Reload from server
    } catch (error) {
      toast.error('Failed to delete password');
    }
  };

  const handlePasswordSubmit = async (data: any) => {
    try {
      if (editingPassword) {
        await updatePasswordEntry(editingPassword.id, data);
        toast.success('Password updated successfully');
      } else {
        await createPasswordEntry(data);
        toast.success('Password created successfully');
      }
      setShowPasswordForm(false);
      setEditingPassword(null);
      loadPasswordEntries(); // Reload from server to get updated list
    } catch (error: any) {
      console.error('Password operation error:', error);
      
      // Extract error message from response
      let errorMessage = editingPassword ? 'Failed to update password' : 'Failed to create password';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.details) {
        // Handle validation errors
        const details = error.response.data.details;
        if (Array.isArray(details) && details.length > 0) {
          errorMessage = details.map(d => d.message).join(', ');
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    }
  };

  // Tag drag and drop handlers
  const handleTagSelect = (tag: Tag) => {
    if (!selectedTags.find(t => t.id === tag.id)) {
      setSelectedTags(prev => [...prev, tag]);
    }
  };

  const handleTagRemove = (tagId: string) => {
    setSelectedTags(prev => prev.filter(t => t.id !== tagId));
  };

  const getAvailableTags = () => {
    return tags
      .filter(tag => !selectedTags.find(t => t.id === tag.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const getSortedSelectedTags = () => {
    return selectedTags.sort((a, b) => a.name.localeCompare(b.name));
  };

  // Filter passwords based on search term and selected tags
  const filteredPasswords = passwords.filter(password => {
    const matchesSearch = password.site?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      password.username?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // If no tags are selected, only filter by search term
    if (selectedTags.length === 0) {
      return matchesSearch;
    }
    
    // Check if password has all selected tags
    const passwordTagIds = password.tags?.map(tag => tag.id) || [];
    const hasAllSelectedTags = selectedTags.every(selectedTag => 
      passwordTagIds.includes(selectedTag.id)
    );
    
    return matchesSearch && hasAllSelectedTags;
  });

  // Drag and Drop Components
  const DraggableTag: React.FC<{ tag: Tag; onSelect: (tag: Tag) => void }> = ({ tag, onSelect }) => {
    return (
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('application/json', JSON.stringify(tag));
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
      e.preventDefault();
      setDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      
      try {
        const tagData = e.dataTransfer.getData('application/json');
        const tag = JSON.parse(tagData);
        onDrop(tag);
      } catch (error) {
        console.error('Failed to parse dropped tag data:', error);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Password Manager</h1>
          <p className="text-gray-600 mt-2">Welcome back, {user?.name}!</p>
          
          {/* Failed Login Attempts Notification */}
          {previousFailedAttempts && previousFailedAttempts > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-yellow-800">
                      You had {previousFailedAttempts} failed login attempt{previousFailedAttempts > 1 ? 's' : ''} before successfully logging in.
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <button
                    type="button"
                    className="bg-yellow-50 rounded-md p-1.5 text-yellow-400 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-yellow-50 focus:ring-yellow-600"
                    onClick={clearPreviousFailedAttempts}
                  >
                    <span className="sr-only">Dismiss</span>
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-wrap gap-4 justify-between">
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setShowPasswordForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Password
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExportPasswords}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </button>
              <button
                onClick={handleImportPasswords}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileImport}
                className="hidden"
              />
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search passwords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Tag Search Section */}
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Filter by Tags</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Available Tags */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Available Tags</h3>
              <div className="min-h-[240px] p-4 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                {loadingTags ? (
                  <div className="flex items-center justify-center h-20">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
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
                )}
              </div>
            </div>

            {/* Selected Tags */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Selected Tags</h3>
              <DropZone
                onDrop={handleTagSelect}
                className="min-h-[240px] p-4 border-2 border-dashed border-blue-200 rounded-lg bg-blue-50 transition-colors"
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
                      Drag tags here or click on available tags to filter passwords
                    </p>
                  )}
                </div>
              </DropZone>
            </div>
          </div>
          
          {selectedTags.length > 0 && (
            <div className="mt-4 text-sm text-gray-600">
              Showing passwords with all {selectedTags.length} selected tag{selectedTags.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Password List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Passwords ({filteredPasswords.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-200">
            {filteredPasswords.map((password: PasswordEntry) => (
              <div key={password.id} className="p-6">
                {/* Mobile Layout */}
                <div className="sm:hidden">
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {password.site}
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-500">Username:</span>
                        <span className="text-sm font-medium">{password.username}</span>
                        <button
                          onClick={() => copyToClipboard(password.username, 'Username')}
                          className="p-1 text-gray-400 hover:text-blue-600"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-500">Password:</span>
                        <span className="text-sm font-medium font-mono">
                          {visiblePasswords.has(password.id) ? password.password : '••••••••'}
                        </span>
                        <button
                          onClick={() => togglePasswordVisibility(password.id)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                        >
                          {visiblePasswords.has(password.id) ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => copyToClipboard(password.password, 'Password')}
                          className="p-1 text-gray-400 hover:text-blue-600"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                      {password.hasNotes && (
                        <div className="flex items-start space-x-4">
                          <span className="text-sm text-gray-500">Notes:</span>
                          {loadedNotes.has(password.id) ? (
                            <div className="flex-1 flex items-start space-x-2">
                              <span className="text-sm flex-1">{loadedNotes.get(password.id) || 'No notes'}</span>
                              <button
                                onClick={() => hidePasswordNotes(password.id)}
                                className="text-sm text-gray-400 hover:text-gray-600"
                              >
                                Hide
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => loadPasswordNotes(password.id)}
                              disabled={loadingNotes.has(password.id)}
                              className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                            >
                              {loadingNotes.has(password.id) ? 'Loading...' : 'Show Notes'}
                            </button>
                          )}
                        </div>
                      )}
                      {password.tags && password.tags.length > 0 && (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">Tags:</span>
                          <div className="flex flex-wrap gap-1">
                            {password.tags.map(tag => (
                              <span
                                key={tag.id}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                                style={{ 
                                  backgroundColor: `${tag.color}20`,
                                  color: tag.color
                                }}
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Mobile Action Buttons */}
                  <div className="flex items-center justify-end space-x-3 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => handleEditPassword(password)}
                      className="flex items-center space-x-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDeletePassword(password.id)}
                      className="flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                {/* Desktop Layout */}
                <div className="hidden sm:block">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {password.site}
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-gray-500">Username:</span>
                          <span className="text-sm font-medium">{password.username}</span>
                          <button
                            onClick={() => copyToClipboard(password.username, 'Username')}
                            className="p-1 text-gray-400 hover:text-blue-600"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-gray-500">Password:</span>
                          <span className="text-sm font-medium font-mono">
                            {visiblePasswords.has(password.id) ? password.password : '••••••••'}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(password.id)}
                            className="p-1 text-gray-400 hover:text-blue-600"
                          >
                            {visiblePasswords.has(password.id) ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => copyToClipboard(password.password, 'Password')}
                            className="p-1 text-gray-400 hover:text-blue-600"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                        {password.hasNotes && (
                          <div className="flex items-start space-x-4">
                            <span className="text-sm text-gray-500">Notes:</span>
                            {loadedNotes.has(password.id) ? (
                              <div className="flex-1 flex items-start space-x-2">
                                <span className="text-sm flex-1">{loadedNotes.get(password.id) || 'No notes'}</span>
                                <button
                                  onClick={() => hidePasswordNotes(password.id)}
                                  className="text-sm text-gray-400 hover:text-gray-600"
                                >
                                  Hide
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => loadPasswordNotes(password.id)}
                                disabled={loadingNotes.has(password.id)}
                                className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                              >
                                {loadingNotes.has(password.id) ? 'Loading...' : 'Show Notes'}
                              </button>
                            )}
                          </div>
                        )}
                        {password.tags && password.tags.length > 0 && (
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500">Tags:</span>
                            <div className="flex flex-wrap gap-1">
                              {password.tags.map(tag => (
                                <span
                                  key={tag.id}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                                  style={{ 
                                    backgroundColor: `${tag.color}20`,
                                    color: tag.color
                                  }}
                                >
                                  {tag.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleEditPassword(password)}
                        className="p-2 text-gray-400 hover:text-blue-600"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePassword(password.id)}
                        className="p-2 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filteredPasswords.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                No passwords found. {searchTerm || selectedTags.length > 0 ? 'Try adjusting your search or tag filters.' : 'Add your first password to get started.'}
              </div>
            )}
          </div>
        </div>

        {/* Password Form Modal */}
        {showPasswordForm && (
          <PasswordForm
            password={editingPassword ? {
              ...editingPassword,
              notes: loadedNotes.get(editingPassword.id) || undefined
            } : null}
            tags={tags}
            onSubmit={handlePasswordSubmit}
            onClose={() => {
              setShowPasswordForm(false);
              setEditingPassword(null);
            }}
          />
        )}
      </div>
    </DndProvider>
  );
};

export default Dashboard;
