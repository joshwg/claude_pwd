import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../src/index';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'mysql://claudedb:T1LL3b65QowzaSqeyvH71Y5Wk2Yh@localhost:3306/claude_pwd_test'
    }
  }
});

describe('CSV Import/Export API', () => {
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create test user
    const hashedPassword = await bcrypt.hash('testpass123', 10);
    const testUser = await prisma.user.create({
      data: {
        name: 'CSVTestUser',
        password: hashedPassword,
        isAdmin: false
      }
    });
    testUserId = testUser.id;

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        name: 'CSVTestUser',
        password: 'testpass123'
      });
    
    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.passwordEntryTag.deleteMany();
    await prisma.passwordEntry.deleteMany();
    await prisma.tag.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await prisma.passwordEntryTag.deleteMany();
    await prisma.passwordEntry.deleteMany();
    await prisma.tag.deleteMany();
  });

  describe('Password Entry Creation with Tags', () => {
    it('should create password entry with existing tags', async () => {
      // First create a tag
      const tagResponse = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Work',
          description: 'Work-related',
          color: '#3b82f6'
        })
        .expect(201);

      const tagId = tagResponse.body.id;

      // Create password entry with tag
      const passwordResponse = await request(app)
        .post('/api/passwords')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          site: 'Gmail',
          username: 'test@gmail.com',
          password: 'password123',
          notes: 'Test notes',
          tagIds: [tagId]
        })
        .expect(201);

      expect(passwordResponse.body.tags).toHaveLength(1);
      expect(passwordResponse.body.tags[0].name).toBe('Work');
    });

    it('should create password entry with multiple tags', async () => {
      // Create multiple tags
      const tag1Response = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Work',
          color: '#3b82f6'
        })
        .expect(201);

      const tag2Response = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Important',
          color: '#ef4444'
        })
        .expect(201);

      // Create password entry with multiple tags
      const passwordResponse = await request(app)
        .post('/api/passwords')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          site: 'GitHub',
          username: 'testuser',
          password: 'gitpass123',
          tagIds: [tag1Response.body.id, tag2Response.body.id]
        })
        .expect(201);

      expect(passwordResponse.body.tags).toHaveLength(2);
      const tagNames = passwordResponse.body.tags.map((tag: any) => tag.name);
      expect(tagNames).toContain('Work');
      expect(tagNames).toContain('Important');
    });

    it('should update password entry and replace tags', async () => {
      // Create tags
      const tag1 = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Work', color: '#3b82f6' })
        .expect(201);

      const tag2 = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Personal', color: '#ef4444' })
        .expect(201);

      // Create password entry with first tag
      const passwordResponse = await request(app)
        .post('/api/passwords')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          site: 'Gmail',
          username: 'test@gmail.com',
          password: 'password123',
          tagIds: [tag1.body.id]
        })
        .expect(201);

      const passwordId = passwordResponse.body.id;

      // Update password entry to use second tag instead
      const updateResponse = await request(app)
        .put(`/api/passwords/${passwordId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          site: 'Gmail',
          username: 'test@gmail.com',
          password: 'newpassword123',
          tagIds: [tag2.body.id]
        })
        .expect(200);

      expect(updateResponse.body.tags).toHaveLength(1);
      expect(updateResponse.body.tags[0].name).toBe('Personal');
    });
  });

  describe('Bulk Import Scenarios', () => {
    it('should handle password import with non-existent tags (create them)', async () => {
      // This test simulates what happens when CSV import encounters unknown tags
      // Create password entry that references a non-existent tag
      // This should trigger tag creation in the import logic

      // First, let's create a tag directly (simulating tag creation during import)
      const tagResponse = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'ImportedTag',
          color: '#3B82F6' // Default color for auto-created tags
        })
        .expect(201);

      // Then create password with that tag
      const passwordResponse = await request(app)
        .post('/api/passwords')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          site: 'ImportedSite',
          username: 'imported@example.com',
          password: 'importedpass123',
          tagIds: [tagResponse.body.id]
        })
        .expect(201);

      expect(passwordResponse.body.tags).toHaveLength(1);
      expect(passwordResponse.body.tags[0].name).toBe('ImportedTag');
    });

    it('should overwrite existing password entry on import', async () => {
      // Create initial password entry
      const initialResponse = await request(app)
        .post('/api/passwords')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          site: 'Gmail',
          username: 'test@gmail.com',
          password: 'oldpassword',
          notes: 'Old notes'
        })
        .expect(201);

      const passwordId = initialResponse.body.id;

      // Simulate overwrite by updating the same site/username combination
      const overwriteResponse = await request(app)
        .put(`/api/passwords/${passwordId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          site: 'Gmail',
          username: 'test@gmail.com',
          password: 'newpassword',
          notes: 'New notes from import'
        })
        .expect(200);

      expect(overwriteResponse.body.password).toBe('newpassword');
      
      // Verify notes were updated
      const notesResponse = await request(app)
        .get(`/api/passwords/${passwordId}/notes`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(notesResponse.body.notes).toBe('New notes from import');
    });

    it('should overwrite existing tag on import', async () => {
      // Create initial tag
      const initialTag = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Work',
          description: 'Old description',
          color: '#3b82f6'
        })
        .expect(201);

      const tagId = initialTag.body.id;

      // Simulate overwrite by updating the tag
      const overwriteResponse = await request(app)
        .put(`/api/tags/${tagId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Work',
          description: 'New description from import',
          color: '#ef4444'
        })
        .expect(200);

      expect(overwriteResponse.body.description).toBe('New description from import');
      expect(overwriteResponse.body.color).toBe('#ef4444');
    });

    it('should create tag without description when not provided', async () => {
      // Simulate creating a tag from CSV import where only name is provided
      const tagResponse = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'MinimalTag',
          color: '#3B82F6' // Default color
        })
        .expect(201);

      expect(tagResponse.body.name).toBe('MinimalTag');
      expect(tagResponse.body.description).toBeNull();
      expect(tagResponse.body.color).toBe('#3B82F6');
    });
  });

  describe('Tag Name Validation During Import', () => {
    it('should validate tag name during bulk creation', async () => {
      // Test creating tag with invalid name (too long)
      const response = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'A'.repeat(41), // Exceeds 40 character limit
          color: '#3b82f6'
        })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details[0].message).toBe('Name must be less than or equal to 40 characters');
    });

    it('should validate tag description during bulk creation', async () => {
      // Test creating tag with invalid description (too long)
      const response = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'ValidName',
          description: 'A'.repeat(256), // Exceeds 255 character limit
          color: '#3b82f6'
        })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details[0].message).toBe('Description must be less than or equal to 255 characters');
    });

    it('should validate tag color format during bulk creation', async () => {
      // Test creating tag with invalid color
      const response = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'ValidName',
          color: 'invalid-color'
        })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details[0].message).toBe('Color must be a valid hex color');
    });
  });

  describe('Password Entry Export with Tags', () => {
    it('should return password entries with associated tags', async () => {
      // Create tags
      const workTag = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Work', color: '#3b82f6' })
        .expect(201);

      const personalTag = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Personal', color: '#ef4444' })
        .expect(201);

      // Create password entry with tags
      await request(app)
        .post('/api/passwords')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          site: 'Gmail',
          username: 'test@gmail.com',
          password: 'password123',
          tagIds: [workTag.body.id, personalTag.body.id]
        })
        .expect(201);

      // Get all password entries
      const response = await request(app)
        .get('/api/passwords')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.entries).toHaveLength(1);
      expect(response.body.entries[0].tags).toHaveLength(2);
      
      const tagNames = response.body.entries[0].tags.map((tag: any) => tag.name);
      expect(tagNames).toContain('Work');
      expect(tagNames).toContain('Personal');
    });
  });

  describe('Tag Export with Usage Count', () => {
    it('should return tags with password entry counts', async () => {
      // Create tag
      const tagResponse = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Work',
          description: 'Work-related',
          color: '#3b82f6'
        })
        .expect(201);

      const tagId = tagResponse.body.id;

      // Create password entries with this tag
      await request(app)
        .post('/api/passwords')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          site: 'Gmail',
          username: 'test1@gmail.com',
          password: 'password123',
          tagIds: [tagId]
        })
        .expect(201);

      await request(app)
        .post('/api/passwords')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          site: 'GitHub',
          username: 'testuser',
          password: 'gitpass123',
          tagIds: [tagId]
        })
        .expect(201);

      // Get all tags
      const response = await request(app)
        .get('/api/tags')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Work');
      expect(response.body[0]._count.passwordEntries).toBe(2);
    });
  });
});
