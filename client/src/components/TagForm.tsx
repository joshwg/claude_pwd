import React, { useState, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Tag } from '../types';
import { X, Palette } from 'lucide-react';
import { validateTagName } from '../services/tagService';
import { useDebounce } from '../hooks/useDebounce';

interface TagFormProps {
  tag?: Tag;
  onSubmit: (data: any) => void;
  onClose: () => void;
}

const TAG_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#f43f5e', // rose
  '#6b7280', // gray
];

const TagForm: React.FC<TagFormProps> = ({ tag, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: TAG_COLORS[0]
  });

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [nameValidation, setNameValidation] = useState<{ isValid: boolean; message: string; isValidating: boolean }>({
    isValid: true,
    message: '',
    isValidating: false
  });

  const [descriptionValidation, setDescriptionValidation] = useState<{ isValid: boolean; message: string }>({
    isValid: true,
    message: ''
  });

  const [colorValidation, setColorValidation] = useState<{ isValid: boolean; message: string }>({
    isValid: true,
    message: ''
  });

  const debouncedName = useDebounce(formData.name, 500);

  // Validation functions
  const validateName = (name: string) => {
    if (!name.trim()) {
      return { isValid: false, message: 'Name is required' };
    }
    if (name.length > 40) {
      return { isValid: false, message: 'Name must be 40 characters or less' };
    }
    return { isValid: true, message: '' };
  };

  const validateDescription = (description: string) => {
    if (description.length > 255) {
      return { isValid: false, message: 'Description must be 255 characters or less' };
    }
    return { isValid: true, message: '' };
  };

  const validateColor = (color: string) => {
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!hexColorRegex.test(color)) {
      return { isValid: false, message: 'Color must be a valid hex color' };
    }
    return { isValid: true, message: '' };
  };

  // Real-time validation for description
  useEffect(() => {
    const result = validateDescription(formData.description);
    setDescriptionValidation(result);
  }, [formData.description]);

  // Real-time validation for color
  useEffect(() => {
    const result = validateColor(formData.color);
    setColorValidation(result);
  }, [formData.color]);

  // Validate name when debounced name changes
  useEffect(() => {
    const validateNameAsync = async () => {
      // First check local validation
      const localValidation = validateName(debouncedName);
      if (!localValidation.isValid) {
        setNameValidation({ 
          isValid: false, 
          message: localValidation.message, 
          isValidating: false 
        });
        return;
      }

      if (!debouncedName.trim()) {
        setNameValidation({ isValid: true, message: '', isValidating: false });
        return;
      }

      setNameValidation(prev => ({ ...prev, isValidating: true }));
      
      try {
        const result = await validateTagName(debouncedName, tag?.id);
        setNameValidation({
          isValid: result.isValid,
          message: result.message,
          isValidating: false
        });
      } catch (error) {
        setNameValidation({
          isValid: false,
          message: 'Validation failed',
          isValidating: false
        });
      }
    };

    if (debouncedName !== formData.name) return; // Only validate if debounced value matches current
    validateNameAsync();
  }, [debouncedName, tag?.id, formData.name]);

  useEffect(() => {
    if (tag) {
      setFormData({
        name: tag.name || '',
        description: tag.description || '',
        color: tag.color || TAG_COLORS[0]
      });
    }
  }, [tag]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check all validations before submitting
    if (!nameValidation.isValid || 
        !descriptionValidation.isValid || 
        !colorValidation.isValid || 
        nameValidation.isValidating ||
        !formData.name.trim()) {
      return;
    }
    
    onSubmit(formData);
  };

  // Calculate if form is valid for submit button
  const isFormValid = nameValidation.isValid && 
                     descriptionValidation.isValid && 
                     colorValidation.isValid && 
                     !nameValidation.isValidating && 
                     formData.name.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {tag ? 'Edit Tag' : 'Add New Tag'}
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
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Tag Name *
              <span className="text-sm text-gray-500 ml-1">
                ({formData.name.length}/40)
              </span>
            </label>
            <div className="relative">
              <input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, name: e.target.value }));
                  // Immediate local validation for length/required
                  const localValidation = validateName(e.target.value);
                  if (!localValidation.isValid) {
                    setNameValidation(prev => ({ 
                      ...prev, 
                      isValid: false, 
                      message: localValidation.message 
                    }));
                  }
                }}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  nameValidation.isValidating
                    ? 'border-gray-300'
                    : !nameValidation.isValid && formData.name.trim()
                    ? 'border-red-300 bg-red-50'
                    : nameValidation.isValid && formData.name.trim()
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-300'
                }`}
                placeholder="e.g., Work, Personal, Social"
                maxLength={40}
              />
              {nameValidation.isValidating && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>
            {nameValidation.message && formData.name.trim() && (
              <p className={`mt-1 text-sm ${nameValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                {nameValidation.message}
              </p>
            )}
            {!formData.name.trim() && (
              <p className="mt-1 text-sm text-gray-500">
                Enter a unique name for your tag (1-40 characters)
              </p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
              <span className="text-sm text-gray-500 ml-1">
                ({formData.description.length}/255)
              </span>
            </label>
            <textarea
              id="description"
              rows={6}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                !descriptionValidation.isValid
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300'
              }`}
              placeholder="Optional description for this tag (max 255 characters)"
              maxLength={255}
            />
            {!descriptionValidation.isValid && (
              <p className="mt-1 text-sm text-red-600">
                {descriptionValidation.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            
            {/* Preset Colors */}
            <div className="mb-3">
              <span className="text-sm text-gray-500 mb-2 block">Preset Colors:</span>
              <div className="grid grid-cols-6 gap-2">
                {TAG_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                    className={`w-8 h-8 rounded-full border-2 ${
                      formData.color === color ? 'border-gray-800' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            {/* Color Picker Toggle */}
            <div className="mb-3">
              <button
                type="button"
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Palette className="h-4 w-4" />
                <span>{showColorPicker ? 'Hide' : 'Show'} Color Wheel</span>
              </button>
            </div>

            {/* Color Picker */}
            {showColorPicker && (
              <div className="mb-3">
                <HexColorPicker
                  color={formData.color}
                  onChange={(color) => setFormData(prev => ({ ...prev, color }))}
                  style={{ width: '100%', height: '200px' }}
                />
              </div>
            )}

            {/* Selected Color Display */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Selected:</span>
              <div 
                className="w-4 h-4 rounded-full border border-gray-300"
                style={{ backgroundColor: formData.color }}
              />
              <span className="text-sm font-mono">{formData.color}</span>
            </div>
            {!colorValidation.isValid && (
              <p className="mt-1 text-sm text-red-600">
                {colorValidation.message}
              </p>
            )}
          </div>

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
              disabled={!isFormValid}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {tag ? 'Update' : 'Create'} Tag
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TagForm;
