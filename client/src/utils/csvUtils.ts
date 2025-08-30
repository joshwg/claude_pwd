import { PasswordEntry, Tag } from '../types';

// Password CSV utilities
export const exportPasswordsToCSV = (passwords: PasswordEntry[], passwordNotes?: Map<string, string | null>): string => {
  const headers = ['Site', 'Username', 'Password', 'Notes', 'Tags', 'Created At', 'Updated At'];
  
  const csvRows = [
    headers.join(','),
    ...passwords.map(password => [
      `"${password.site.replace(/"/g, '""')}"`,
      `"${password.username.replace(/"/g, '""')}"`,
      `"${password.password.replace(/"/g, '""')}"`,
      `"${passwordNotes?.get(password.id)?.replace(/"/g, '""') || ''}"`,
      `"${password.tags?.map(tag => tag.name).join(';') || ''}"`,
      `"${password.createdAt}"`,
      `"${password.updatedAt}"`
    ].join(','))
  ];
  
  return csvRows.join('\n');
};

export const downloadCSV = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export interface ParsedPassword {
  site: string;
  username: string;
  password: string;
  notes?: string;
  tags?: string[];
}

export const parsePasswordsFromCSV = (csvContent: string): ParsedPassword[] => {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  // Skip header row
  const dataLines = lines.slice(1);
  
  return dataLines.map(line => {
    const values = parseCSVLine(line);
    return {
      site: values[0] || '',
      username: values[1] || '',
      password: values[2] || '',
      notes: values[3] || undefined,
      tags: values[4] ? values[4].split(';').filter(tag => tag.trim()) : undefined
    };
  }).filter(password => password.site && password.username && password.password);
};

// Tag CSV utilities
export const exportTagsToCSV = (tags: Tag[]): string => {
  const headers = ['Name', 'Description', 'Color', 'Password Count', 'Created At', 'Updated At'];
  
  const csvRows = [
    headers.join(','),
    ...tags.map(tag => [
      `"${tag.name.replace(/"/g, '""')}"`,
      `"${tag.description?.replace(/"/g, '""') || ''}"`,
      `"${tag.color}"`,
      `"${tag._count?.passwordEntries || 0}"`,
      `"${tag.createdAt}"`,
      `"${tag.updatedAt}"`
    ].join(','))
  ];
  
  return csvRows.join('\n');
};

export interface ParsedTag {
  name: string;
  description?: string;
  color: string;
}

export const parseTagsFromCSV = (csvContent: string): ParsedTag[] => {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  // Skip header row
  const dataLines = lines.slice(1);
  
  return dataLines.map(line => {
    const values = parseCSVLine(line);
    return {
      name: values[0] || '',
      description: values[1] || undefined,
      color: values[2] || '#3B82F6' // Default blue color
    };
  }).filter(tag => tag.name);
};

// Helper function to parse CSV line with proper quote handling
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    
    if (char === '"' && (i === 0 || line[i - 1] === ',')) {
      inQuotes = true;
    } else if (char === '"' && inQuotes && (i === line.length - 1 || line[i + 1] === ',')) {
      inQuotes = false;
    } else if (char === '"' && inQuotes && line[i + 1] === '"') {
      current += '"';
      i++; // Skip next quote
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else if (char !== '"' || inQuotes) {
      current += char;
    }
    
    i++;
  }
  
  result.push(current);
  return result;
};

export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};
