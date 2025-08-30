import { describe, it, expect } from 'vitest';
import {
  exportPasswordsToCSV,
  parsePasswordsFromCSV,
  exportTagsToCSV,
  parseTagsFromCSV,
  ParsedPassword,
  ParsedTag
} from '../src/utils/csvUtils';
import { PasswordEntry, Tag } from '../src/types';

describe('CSV Utils', () => {
  const mockTags: Tag[] = [
    {
      id: '1',
      name: 'Work',
      description: 'Work-related passwords',
      color: '#3b82f6',
      userId: 'user1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      _count: { passwordEntries: 5 }
    },
    {
      id: '2',
      name: 'Personal',
      description: 'Personal accounts',
      color: '#ef4444',
      userId: 'user1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      _count: { passwordEntries: 3 }
    }
  ];

  const mockPasswords: PasswordEntry[] = [
    {
      id: 'pass1',
      site: 'Gmail',
      username: 'test@gmail.com',
      password: 'password123',
      hasNotes: true,
      userId: 'user1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      tags: [mockTags[0], mockTags[1]]
    },
    {
      id: 'pass2',
      site: 'GitHub',
      username: 'testuser',
      password: 'gitpass456',
      hasNotes: false,
      userId: 'user1',
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
      tags: [mockTags[0]]
    },
    {
      id: 'pass3',
      site: 'Facebook',
      username: 'user@facebook.com',
      password: 'fbpass789',
      hasNotes: false,
      userId: 'user1',
      createdAt: '2024-01-03T00:00:00Z',
      updatedAt: '2024-01-03T00:00:00Z',
      tags: []
    }
  ];

  describe('Password CSV Export', () => {
    it('should export passwords to CSV format with tags', () => {
      const notesMap = new Map([
        ['pass1', 'Important Gmail account notes'],
        ['pass2', null],
        ['pass3', null]
      ]);

      const csv = exportPasswordsToCSV(mockPasswords, notesMap);
      const lines = csv.split('\n');

      // Check header
      expect(lines[0]).toBe('Site,Username,Password,Notes,Tags,Created At,Updated At');

      // Check first row with multiple tags
      expect(lines[1]).toContain('"Gmail"');
      expect(lines[1]).toContain('"test@gmail.com"');
      expect(lines[1]).toContain('"password123"');
      expect(lines[1]).toContain('"Important Gmail account notes"');
      expect(lines[1]).toContain('"Work;Personal"');

      // Check second row with single tag
      expect(lines[2]).toContain('"GitHub"');
      expect(lines[2]).toContain('"testuser"');
      expect(lines[2]).toContain('"Work"');

      // Check third row with no tags
      expect(lines[3]).toContain('"Facebook"');
      expect(lines[3]).toContain('""'); // Empty tags field
    });

    it('should handle passwords without notes map', () => {
      const csv = exportPasswordsToCSV(mockPasswords);
      const lines = csv.split('\n');

      expect(lines.length).toBe(4); // Header + 3 passwords
      expect(lines[0]).toBe('Site,Username,Password,Notes,Tags,Created At,Updated At');
    });

    it('should escape CSV special characters', () => {
      const specialPassword: PasswordEntry = {
        id: 'special',
        site: 'Site "with quotes"',
        username: 'user,with,commas',
        password: 'pass"word',
        hasNotes: false,
        userId: 'user1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        tags: []
      };

      const csv = exportPasswordsToCSV([specialPassword]);
      
      expect(csv).toContain('"Site ""with quotes"""');
      expect(csv).toContain('"user,with,commas"');
      expect(csv).toContain('"pass""word"');
    });
  });

  describe('Password CSV Import', () => {
    it('should parse basic CSV format', () => {
      const csvContent = `Site,Username,Password,Notes,Tags,Created At,Updated At
"Gmail","test@gmail.com","password123","Test notes","Work;Personal","2024-01-01T00:00:00Z","2024-01-01T00:00:00Z"
"GitHub","testuser","gitpass456","","Work","2024-01-02T00:00:00Z","2024-01-02T00:00:00Z"
"Facebook","user@fb.com","fbpass789","","","2024-01-03T00:00:00Z","2024-01-03T00:00:00Z"`;

      const passwords = parsePasswordsFromCSV(csvContent);

      expect(passwords).toHaveLength(3);
      
      expect(passwords[0]).toEqual({
        site: 'Gmail',
        username: 'test@gmail.com',
        password: 'password123',
        notes: 'Test notes',
        tags: ['Work', 'Personal']
      });

      expect(passwords[1]).toEqual({
        site: 'GitHub',
        username: 'testuser',
        password: 'gitpass456',
        notes: undefined,
        tags: ['Work']
      });

      expect(passwords[2]).toEqual({
        site: 'Facebook',
        username: 'user@fb.com',
        password: 'fbpass789',
        notes: undefined,
        tags: undefined
      });
    });

    it('should handle CSV with quoted fields containing special characters', () => {
      const csvContent = `Site,Username,Password,Notes,Tags,Created At,Updated At
"Site ""with quotes""","user,with,commas","pass""word","Notes with, commas","Tag;With;Semicolons","2024-01-01T00:00:00Z","2024-01-01T00:00:00Z"`;

      const passwords = parsePasswordsFromCSV(csvContent);

      expect(passwords).toHaveLength(1);
      expect(passwords[0]).toEqual({
        site: 'Site "with quotes"',
        username: 'user,with,commas',
        password: 'pass"word',
        notes: 'Notes with, commas',
        tags: ['Tag', 'With', 'Semicolons']
      });
    });

    it('should filter out invalid entries', () => {
      const csvContent = `Site,Username,Password,Notes,Tags,Created At,Updated At
"Gmail","test@gmail.com","password123","","","",""
"","testuser","gitpass456","","","",""
"GitHub","","gitpass456","","","",""
"Facebook","user@fb.com","","","","",""
"Valid","valid@user.com","validpass","","","",""`;

      const passwords = parsePasswordsFromCSV(csvContent);

      expect(passwords).toHaveLength(2); // Only Gmail and Valid entries
      expect(passwords[0].site).toBe('Gmail');
      expect(passwords[1].site).toBe('Valid');
    });

    it('should handle empty CSV', () => {
      const passwords = parsePasswordsFromCSV('');
      expect(passwords).toHaveLength(0);
    });

    it('should handle CSV with only headers', () => {
      const csvContent = 'Site,Username,Password,Notes,Tags,Created At,Updated At';
      const passwords = parsePasswordsFromCSV(csvContent);
      expect(passwords).toHaveLength(0);
    });
  });

  describe('Tag CSV Export', () => {
    it('should export tags to CSV format', () => {
      const csv = exportTagsToCSV(mockTags);
      const lines = csv.split('\n');

      // Check header
      expect(lines[0]).toBe('Name,Description,Color,Password Count,Created At,Updated At');

      // Check first tag
      expect(lines[1]).toContain('"Work"');
      expect(lines[1]).toContain('"Work-related passwords"');
      expect(lines[1]).toContain('"#3b82f6"');
      expect(lines[1]).toContain('"5"');

      // Check second tag
      expect(lines[2]).toContain('"Personal"');
      expect(lines[2]).toContain('"Personal accounts"');
      expect(lines[2]).toContain('"#ef4444"');
      expect(lines[2]).toContain('"3"');
    });

    it('should handle tags without description', () => {
      const tagWithoutDesc: Tag = {
        id: '3',
        name: 'NoDesc',
        color: '#22c55e',
        userId: 'user1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        _count: { passwordEntries: 0 }
      };

      const csv = exportTagsToCSV([tagWithoutDesc]);
      const lines = csv.split('\n');

      expect(lines[1]).toContain('""'); // Empty description field
    });

    it('should handle tags without count', () => {
      const tagWithoutCount: Tag = {
        id: '3',
        name: 'NoCount',
        description: 'Test desc',
        color: '#22c55e',
        userId: 'user1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const csv = exportTagsToCSV([tagWithoutCount]);
      const lines = csv.split('\n');

      expect(lines[1]).toContain('"0"'); // Default count
    });
  });

  describe('Tag CSV Import', () => {
    it('should parse basic tag CSV format', () => {
      const csvContent = `Name,Description,Color,Password Count,Created At,Updated At
"Work","Work-related passwords","#3b82f6","5","2024-01-01T00:00:00Z","2024-01-01T00:00:00Z"
"Personal","Personal accounts","#ef4444","3","2024-01-01T00:00:00Z","2024-01-01T00:00:00Z"
"NoDesc","","#22c55e","0","2024-01-01T00:00:00Z","2024-01-01T00:00:00Z"`;

      const tags = parseTagsFromCSV(csvContent);

      expect(tags).toHaveLength(3);
      
      expect(tags[0]).toEqual({
        name: 'Work',
        description: 'Work-related passwords',
        color: '#3b82f6'
      });

      expect(tags[1]).toEqual({
        name: 'Personal',
        description: 'Personal accounts',
        color: '#ef4444'
      });

      expect(tags[2]).toEqual({
        name: 'NoDesc',
        description: undefined,
        color: '#22c55e'
      });
    });

    it('should use default color for missing color', () => {
      const csvContent = `Name,Description,Color,Password Count,Created At,Updated At
"TestTag","Test description","","0","2024-01-01T00:00:00Z","2024-01-01T00:00:00Z"`;

      const tags = parseTagsFromCSV(csvContent);

      expect(tags).toHaveLength(1);
      expect(tags[0]).toEqual({
        name: 'TestTag',
        description: 'Test description',
        color: '#3B82F6' // Default blue
      });
    });

    it('should filter out tags without name', () => {
      const csvContent = `Name,Description,Color,Password Count,Created At,Updated At
"","Test description","#3b82f6","0","2024-01-01T00:00:00Z","2024-01-01T00:00:00Z"
"ValidTag","Valid description","#ef4444","1","2024-01-01T00:00:00Z","2024-01-01T00:00:00Z"`;

      const tags = parseTagsFromCSV(csvContent);

      expect(tags).toHaveLength(1);
      expect(tags[0].name).toBe('ValidTag');
    });

    it('should handle empty tag CSV', () => {
      const tags = parseTagsFromCSV('');
      expect(tags).toHaveLength(0);
    });

    it('should handle CSV with only headers', () => {
      const csvContent = 'Name,Description,Color,Password Count,Created At,Updated At';
      const tags = parseTagsFromCSV(csvContent);
      expect(tags).toHaveLength(0);
    });

    it('should handle special characters in tag names and descriptions', () => {
      const csvContent = `Name,Description,Color,Password Count,Created At,Updated At
"Tag ""with quotes""","Description with, commas and ""quotes""","#3b82f6","0","2024-01-01T00:00:00Z","2024-01-01T00:00:00Z"`;

      const tags = parseTagsFromCSV(csvContent);

      expect(tags).toHaveLength(1);
      expect(tags[0]).toEqual({
        name: 'Tag "with quotes"',
        description: 'Description with, commas and "quotes"',
        color: '#3b82f6'
      });
    });
  });

  describe('CSV Line Parsing', () => {
    it('should correctly parse complex CSV lines with nested quotes', () => {
      const csvContent = `Field1,Field2,Field3
"Value with ""nested"" quotes","Value, with, commas","Simple value"`;

      const passwords = parsePasswordsFromCSV(csvContent);
      // This tests the internal parseCSVLine function through parsePasswordsFromCSV
      // The actual values would depend on how the parser maps fields to password properties
    });
  });
});
