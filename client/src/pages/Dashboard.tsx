import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getPasswordEntries, 
  createPasswordEntry, 
  updatePasswordEntry, 
  deletePasswordEntry 
} from '../services/passwordService';
import { 
  getTags, 
  createTag, 
  updateTag, 
  deleteTag 
} from '../services/tagService';
import { PasswordEntry, Tag } from '../types';
import { Plus, Search, Eye, EyeOff, Edit, Trash2, Copy } from 'lucide-react';
import { toast } from 'react-hot-toast';
import PasswordForm from '../components/PasswordForm';
import TagForm from '../components/TagForm';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [filteredPasswords, setFilteredPasswords] = useState<PasswordEntry[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showTagForm, setShowTagForm] = useState(false);
  const [editingPassword, setEditingPassword] = useState<PasswordEntry | null>(null);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterPasswords();
  }, [passwords, selectedTags, searchTerm]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [passwordsData, tagsData] = await Promise.all([
        getPasswordEntries(),
        getTags()
      ]);
      setPasswords(passwordsData.sort((a: PasswordEntry, b: PasswordEntry) => a.site.localeCompare(b.site)));
      setTags(tagsData.sort((a: Tag, b: Tag) => a.name.localeCompare(b.name)));
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filterPasswords = () => {
    let filtered = passwords;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.site.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by selected tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(p => 
        p.tags?.some(tag => selectedTags.includes(tag.id))
      );
    }

    setFilteredPasswords(filtered);
  };

  const handleTagDrop = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter(id => id !== tagId));
    } else {
      setSelectedTags([...selectedTags, tagId]);
    }
  };

  const togglePasswordVisibility = (passwordId: string) => {
    const newVisible = new Set(visiblePasswords);
    if (newVisible.has(passwordId)) {
      newVisible.delete(passwordId);
    } else {
      newVisible.add(passwordId);
    }
    setVisiblePasswords(newVisible);
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${type} copied to clipboard`);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleDeletePassword = async (id: string) => {
    if (!confirm('Are you sure you want to delete this password?')) return;
    
    try {
      await deletePasswordEntry(id);
      setPasswords(passwords.filter(p => p.id !== id));
      toast.success('Password deleted successfully');
    } catch (error) {
      toast.error('Failed to delete password');
    }
  };

  const handleDeleteTag = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tag?')) return;
    
    try {
      await deleteTag(id);
      setTags(tags.filter(t => t.id !== id));
      toast.success('Tag deleted successfully');
    } catch (error) {
      toast.error('Failed to delete tag');
    }
  };

  const handlePasswordSubmit = async (data: any) => {
    try {
      if (editingPassword) {
        const updated = await updatePasswordEntry(editingPassword.id, data);
        setPasswords(passwords.map(p => p.id === editingPassword.id ? updated : p));
        toast.success('Password updated successfully');
      } else {
        const created = await createPasswordEntry(data);
        setPasswords([...passwords, created].sort((a, b) => a.site.localeCompare(b.site)));
        toast.success('Password created successfully');
      }
      setShowPasswordForm(false);
      setEditingPassword(null);
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

  const handleTagSubmit = async (data: any) => {
    try {
      if (editingTag) {
        const updated = await updateTag(editingTag.id, data);
        setTags(tags.map(t => t.id === editingTag.id ? updated : t));
        toast.success('Tag updated successfully');
      } else {
        const created = await createTag(data);
        setTags([...tags, created].sort((a, b) => a.name.localeCompare(b.name)));
        toast.success('Tag created successfully');
      }
      setShowTagForm(false);
      setEditingTag(null);
    } catch (error: any) {
      console.error('Tag operation error:', error);
      
      // Extract error message from response
      let errorMessage = editingTag ? 'Failed to update tag' : 'Failed to create tag';
      
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Password Manager</h1>
        <p className="text-gray-600 mt-2">Welcome back, {user?.name}!</p>
      </div>

      {/* Controls */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => setShowPasswordForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Password
          </button>
          <button
            onClick={() => setShowTagForm(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Tag
          </button>
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Tags Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Tags</h2>
            <div className="space-y-2">
              {tags.map(tag => (
                <div
                  key={tag.id}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                    selectedTags.includes(tag.id)
                      ? 'bg-blue-100 border-2 border-blue-300'
                      : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                  }`}
                  onClick={() => handleTagDrop(tag.id)}
                >
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="text-sm font-medium">{tag.name}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTag(tag);
                        setShowTagForm(true);
                      }}
                      className="p-1 text-gray-400 hover:text-blue-600"
                    >
                      <Edit className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTag(tag.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="mt-4 text-sm text-blue-600 hover:text-blue-800"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Password List */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Passwords ({filteredPasswords.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {filteredPasswords.map(password => (
                <div key={password.id} className="p-6">
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
                        {password.notes && (
                          <div className="flex items-start space-x-4">
                            <span className="text-sm text-gray-500">Notes:</span>
                            <span className="text-sm">{password.notes}</span>
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
                        onClick={() => {
                          setEditingPassword(password);
                          setShowPasswordForm(true);
                        }}
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
              ))}
              {filteredPasswords.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  No passwords found. {searchTerm || selectedTags.length > 0 ? 'Try adjusting your filters.' : 'Add your first password to get started.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Password Form Modal */}
      {showPasswordForm && (
        <PasswordForm
          password={editingPassword}
          tags={tags}
          onSubmit={handlePasswordSubmit}
          onClose={() => {
            setShowPasswordForm(false);
            setEditingPassword(null);
          }}
        />
      )}

      {/* Tag Form Modal */}
      {showTagForm && (
        <TagForm
          tag={editingTag || undefined}
          onSubmit={handleTagSubmit}
          onClose={() => {
            setShowTagForm(false);
            setEditingTag(null);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
