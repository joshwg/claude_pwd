import { describe, it, expect } from 'vitest';
import { 
  createTagSchema, 
  updateTagSchema,
  createPasswordEntrySchema,
  updatePasswordEntrySchema,
  createUserSchema,
  updateUserSchema
} from '../src/utils/validation';

describe('Validation Schemas', () => {
  describe('Tag Validation', () => {
    describe('createTagSchema', () => {
      it('should validate valid tag data', () => {
        const validTag = {
          name: 'Work',
          description: 'Work-related passwords',
          color: '#3b82f6'
        };
        
        const result = createTagSchema.safeParse(validTag);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validTag);
        }
      });

      it('should validate tag with minimum valid data', () => {
        const minimalTag = {
          name: 'W',
          color: '#ff0000'
        };
        
        const result = createTagSchema.safeParse(minimalTag);
        expect(result.success).toBe(true);
      });

      it('should validate tag at maximum name length (40 chars)', () => {
        const longNameTag = {
          name: 'A'.repeat(40), // Exactly 40 characters
          color: '#ff0000'
        };
        
        const result = createTagSchema.safeParse(longNameTag);
        expect(result.success).toBe(true);
      });

      it('should validate tag at maximum description length (255 chars)', () => {
        const longDescTag = {
          name: 'Test',
          description: 'A'.repeat(255), // Exactly 255 characters
          color: '#ff0000'
        };
        
        const result = createTagSchema.safeParse(longDescTag);
        expect(result.success).toBe(true);
      });

      it('should reject empty name', () => {
        const invalidTag = {
          name: '',
          color: '#ff0000'
        };
        
        const result = createTagSchema.safeParse(invalidTag);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Name is required');
        }
      });

      it('should reject name exceeding 40 characters', () => {
        const invalidTag = {
          name: 'A'.repeat(41), // 41 characters - too long
          color: '#ff0000'
        };
        
        const result = createTagSchema.safeParse(invalidTag);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Name must be less than or equal to 40 characters');
        }
      });

      it('should reject description exceeding 255 characters', () => {
        const invalidTag = {
          name: 'Test',
          description: 'A'.repeat(256), // 256 characters - too long
          color: '#ff0000'
        };
        
        const result = createTagSchema.safeParse(invalidTag);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Description must be less than or equal to 255 characters');
        }
      });

      it('should reject invalid color format', () => {
        const invalidTag = {
          name: 'Test',
          color: 'invalid-color'
        };
        
        const result = createTagSchema.safeParse(invalidTag);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Color must be a valid hex color');
        }
      });

      it('should reject missing required fields', () => {
        const invalidTag = {};
        
        const result = createTagSchema.safeParse(invalidTag);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.length).toBeGreaterThan(0);
        }
      });
    });

    describe('updateTagSchema', () => {
      it('should validate partial updates', () => {
        const partialUpdate = {
          name: 'Updated Name'
        };
        
        const result = updateTagSchema.safeParse(partialUpdate);
        expect(result.success).toBe(true);
      });

      it('should validate empty update object', () => {
        const emptyUpdate = {};
        
        const result = updateTagSchema.safeParse(emptyUpdate);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Password Entry Validation', () => {
    describe('createPasswordEntrySchema', () => {
      it('should validate valid password entry', () => {
        const validEntry = {
          site: 'github.com',
          username: 'testuser',
          password: 'securepass123',
          notes: 'Development account',
          tagIds: ['tag1', 'tag2']
        };
        
        const result = createPasswordEntrySchema.safeParse(validEntry);
        expect(result.success).toBe(true);
      });

      it('should validate entry without optional fields', () => {
        const minimalEntry = {
          site: 'example.com',
          username: 'user'
        };
        
        const result = createPasswordEntrySchema.safeParse(minimalEntry);
        expect(result.success).toBe(true);
      });

      it('should validate at maximum field lengths', () => {
        const maxLengthEntry = {
          site: 'A'.repeat(256), // Max site length
          username: 'B'.repeat(128), // Max username length
          password: 'C'.repeat(128), // Max password length
          notes: 'D'.repeat(4096), // Max notes length
        };
        
        const result = createPasswordEntrySchema.safeParse(maxLengthEntry);
        expect(result.success).toBe(true);
      });

      it('should reject site exceeding 256 characters', () => {
        const invalidEntry = {
          site: 'A'.repeat(257), // Too long
          username: 'user'
        };
        
        const result = createPasswordEntrySchema.safeParse(invalidEntry);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Site must be less than or equal to 256 characters');
        }
      });

      it('should reject username exceeding 128 characters', () => {
        const invalidEntry = {
          site: 'example.com',
          username: 'A'.repeat(129) // Too long
        };
        
        const result = createPasswordEntrySchema.safeParse(invalidEntry);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Username must be less than or equal to 128 characters');
        }
      });

      it('should reject password exceeding 128 characters', () => {
        const invalidEntry = {
          site: 'example.com',
          username: 'user',
          password: 'A'.repeat(129) // Too long
        };
        
        const result = createPasswordEntrySchema.safeParse(invalidEntry);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Password must be less than or equal to 128 characters');
        }
      });

      it('should reject notes exceeding 4096 characters', () => {
        const invalidEntry = {
          site: 'example.com',
          username: 'user',
          notes: 'A'.repeat(4097) // Too long
        };
        
        const result = createPasswordEntrySchema.safeParse(invalidEntry);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Notes must be less than or equal to 4096 characters');
        }
      });

      it('should reject empty required fields', () => {
        const invalidEntry = {
          site: '',
          username: ''
        };
        
        const result = createPasswordEntrySchema.safeParse(invalidEntry);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.length).toBeGreaterThanOrEqual(2);
        }
      });
    });
  });

  describe('User Validation', () => {
    describe('createUserSchema', () => {
      it('should validate valid user data', () => {
        const validUser = {
          name: 'testuser',
          password: 'password123',
          isAdmin: false
        };
        
        const result = createUserSchema.safeParse(validUser);
        expect(result.success).toBe(true);
      });

      it('should validate user at maximum name length (100 chars)', () => {
        const longNameUser = {
          name: 'A'.repeat(100), // Exactly 100 characters
          password: 'password123'
        };
        
        const result = createUserSchema.safeParse(longNameUser);
        expect(result.success).toBe(true);
      });

      it('should default isAdmin to false when not provided', () => {
        const user = {
          name: 'testuser',
          password: 'password123'
        };
        
        const result = createUserSchema.safeParse(user);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.isAdmin).toBe(false);
        }
      });

      it('should reject name exceeding 100 characters', () => {
        const invalidUser = {
          name: 'A'.repeat(101), // Too long
          password: 'password123'
        };
        
        const result = createUserSchema.safeParse(invalidUser);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Name must be less than or equal to 100 characters');
        }
      });

      it('should reject password shorter than 6 characters', () => {
        const invalidUser = {
          name: 'testuser',
          password: '12345' // Too short
        };
        
        const result = createUserSchema.safeParse(invalidUser);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Password must be at least 6 characters');
        }
      });

      it('should reject empty name', () => {
        const invalidUser = {
          name: '',
          password: 'password123'
        };
        
        const result = createUserSchema.safeParse(invalidUser);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Name is required');
        }
      });
    });
  });
});
