import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { PasswordEntry } from '../types';
import { 
  getPasswordEntries, 
  deletePasswordEntry, 
  createPasswordEntry, 
  updatePasswordEntry,
  getPasswordEntryNotes
} from '../services/passwordService';
import { Plus, Search, Eye, EyeOff, Edit, Trash2, Copy, Download, Upload } from 'lucide-react';
import PasswordForm from '../components/PasswordForm';
import { 
  exportPasswordsToCSV, 
  downloadCSV, 
  parsePasswordsFromCSV, 
  readFileAsText
} from '../utils/csvUtils';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [editingPassword, setEditingPassword] = useState<PasswordEntry | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    loadPasswordEntries();
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

  // Filter passwords based on search term
  const filteredPasswords = passwords.filter(password =>
    password.site?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    password.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          ))}
          {filteredPasswords.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No passwords found. {searchTerm ? 'Try adjusting your search.' : 'Add your first password to get started.'}
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
          tags={[]}
          onSubmit={handlePasswordSubmit}
          onClose={() => {
            setShowPasswordForm(false);
            setEditingPassword(null);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;