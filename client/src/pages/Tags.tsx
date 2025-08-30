import React, { useState, useEffect, useRef } from 'react';
import { 
  getTags, 
  createTag, 
  updateTag, 
  deleteTag 
} from '../services/tagService';
import { Tag } from '../types';
import { Plus, Edit, Trash2, Tag as TagIcon, Download, Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';
import TagForm from '../components/TagForm';
import { 
  exportTagsToCSV, 
  downloadCSV, 
  parseTagsFromCSV, 
  readFileAsText 
} from '../utils/csvUtils';

const Tags: React.FC = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [showTagForm, setShowTagForm] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      setLoading(true);
      const tagsData = await getTags();
      setTags(tagsData.sort((a: Tag, b: Tag) => a.name.localeCompare(b.name)));
    } catch (error) {
      toast.error('Failed to load tags');
    } finally {
      setLoading(false);
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
      
      let errorMessage = editingTag ? 'Failed to update tag' : 'Failed to create tag';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.details) {
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

  const handleDeleteTag = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tag? This will remove it from all associated passwords.')) return;
    
    try {
      await deleteTag(id);
      setTags(tags.filter(t => t.id !== id));
      toast.success('Tag deleted successfully');
    } catch (error) {
      toast.error('Failed to delete tag');
    }
  };

  const handleEditTag = (tag: Tag) => {
    setEditingTag(tag);
    setShowTagForm(true);
  };

  const handleAddTag = () => {
    setEditingTag(null);
    setShowTagForm(true);
  };

  const handleCloseForm = () => {
    setShowTagForm(false);
    setEditingTag(null);
  };

  const handleExportTags = () => {
    try {
      const csvContent = exportTagsToCSV(tags);
      downloadCSV(csvContent, `tags_export_${new Date().toISOString().split('T')[0]}.csv`);
      toast.success('Tags exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export tags');
    }
  };

  const handleImportTags = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const csvContent = await readFileAsText(file);
      const parsedTags = parseTagsFromCSV(csvContent);
      
      if (parsedTags.length === 0) {
        toast.error('No valid tags found in the CSV file');
        return;
      }

      let importedCount = 0;
      let failedCount = 0;

      for (const parsedTag of parsedTags) {
        try {
          await createTag(parsedTag);
          importedCount++;
        } catch (error) {
          console.error('Failed to import tag:', parsedTag.name, error);
          failedCount++;
        }
      }

      if (importedCount > 0) {
        toast.success(`Imported ${importedCount} tags successfully${failedCount > 0 ? ` (${failedCount} failed)` : ''}`);
        loadTags(); // Reload the list
      } else {
        toast.error('Failed to import any tags');
      }
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Failed to import tags from CSV file');
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <TagIcon className="h-8 w-8 mr-3 text-blue-600" />
              Tags
            </h1>
            <p className="text-gray-600 mt-2">
              Organize your passwords with custom tags
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleExportTags}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
            <button
              onClick={handleImportTags}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </button>
            <button
              onClick={handleAddTag}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Tag
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
      </div>

      {/* Tags Grid - 2 per row, wider cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {tags.map(tag => (
          <div key={tag.id} className="bg-white rounded-lg shadow border border-gray-200 p-8">
            <div className="flex items-start justify-between min-h-0">
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center mb-3">
                  <div
                    className="w-5 h-5 rounded-full mr-4 flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <h3 className="text-xl font-semibold text-gray-900 truncate">
                    {tag.name}
                  </h3>
                </div>
                {tag.description && (
                  <p className="text-base text-gray-600 mb-4 line-clamp-2">
                    {tag.description}
                  </p>
                )}
                {tag._count && (
                  <p className="text-sm text-gray-500">
                    {tag._count.passwordEntries} password{tag._count.passwordEntries !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-center space-y-3 flex-shrink-0">
                <button
                  onClick={() => handleEditTag(tag)}
                  className="p-3 text-gray-400 hover:text-blue-600"
                  title="Edit tag"
                >
                  <Edit className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDeleteTag(tag.id)}
                  className="p-3 text-gray-400 hover:text-red-600"
                  title="Delete tag"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {tags.length === 0 && (
        <div className="text-center py-12">
          <TagIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No tags</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new tag to organize your passwords.
          </p>
          <div className="mt-6">
            <button
              onClick={handleAddTag}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Tag
            </button>
          </div>
        </div>
      )}

      {/* Tag Form Modal */}
      {showTagForm && (
        <TagForm
          tag={editingTag || undefined}
          onSubmit={handleTagSubmit}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
};

export default Tags;
