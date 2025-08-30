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

describe('API Endpoints', () => {
  let authToken: string;
  let testUserId: string;
  let testTagId: string;

  beforeAll(async () => {
    // Create test user
    const hashedPassword = await bcrypt.hash('testpass123', 10);
    const testUser = await prisma.user.create({
      data: {
        name: 'TestUser',
        password: hashedPassword,
        isAdmin: true
      }
    });
    testUserId = testUser.id;

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        name: 'TestUser',
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
    // Clean up tags and passwords between tests
    await prisma.passwordEntryTag.deleteMany();
    await prisma.passwordEntry.deleteMany();
    await prisma.tag.deleteMany();
  });

  describe('Tags API', () => {
    describe('POST /api/tags', () => {
      it('should create a valid tag', async () => {
        const validTag = {
          name: 'Work',
          description: 'Work-related passwords',
          color: '#3b82f6'
        };

        const response = await request(app)
          .post('/api/tags')
          .set('Authorization', `Bearer ${authToken}`)
          .send(validTag)
          .expect(201);

        expect(response.body).toMatchObject({
          name: 'Work',
          description: 'Work-related passwords',
          color: '#3b82f6'
        });
        expect(response.body.id).toBeDefined();
        testTagId = response.body.id;
      });

      it('should create tag with minimal valid data', async () => {
        const minimalTag = {
          name: 'Personal',
          color: '#ff0000'
        };

        const response = await request(app)
          .post('/api/tags')
          .set('Authorization', `Bearer ${authToken}`)
          .send(minimalTag)
          .expect(201);

        expect(response.body.name).toBe('Personal');
        expect(response.body.color).toBe('#ff0000');
        expect(response.body.description).toBeNull();
      });

      it('should create tag at maximum name length (40 chars)', async () => {
        const longNameTag = {
          name: 'A'.repeat(40),
          color: '#00ff00'
        };

        const response = await request(app)
          .post('/api/tags')
          .set('Authorization', `Bearer ${authToken}`)
          .send(longNameTag)
          .expect(201);

        expect(response.body.name).toBe('A'.repeat(40));
      });

      it('should reject tag name exceeding 40 characters', async () => {
        const invalidTag = {
          name: 'A'.repeat(41), // Too long
          color: '#ff0000'
        };

        const response = await request(app)
          .post('/api/tags')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidTag)
          .expect(400);

        expect(response.body.error).toBe('Validation failed');
        expect(response.body.details[0].message).toBe('Name must be less than or equal to 40 characters');
      });

      it('should reject empty tag name', async () => {
        const invalidTag = {
          name: '',
          color: '#ff0000'
        };

        const response = await request(app)
          .post('/api/tags')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidTag)
          .expect(400);

        expect(response.body.error).toBe('Validation failed');
        expect(response.body.details[0].message).toBe('Name is required');
      });

      it('should reject invalid color format', async () => {
        const invalidTag = {
          name: 'Test',
          color: 'not-a-hex-color'
        };

        const response = await request(app)
          .post('/api/tags')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidTag)
          .expect(400);

        expect(response.body.error).toBe('Validation failed');
        expect(response.body.details[0].message).toBe('Color must be a valid hex color');
      });

      it('should reject description exceeding 255 characters', async () => {
        const invalidTag = {
          name: 'Test',
          description: 'A'.repeat(256), // Too long
          color: '#ff0000'
        };

        const response = await request(app)
          .post('/api/tags')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidTag)
          .expect(400);

        expect(response.body.error).toBe('Validation failed');
        expect(response.body.details[0].message).toBe('Description must be less than or equal to 255 characters');
      });

      it('should reject duplicate tag names (case insensitive)', async () => {
        // Create first tag
        await request(app)
          .post('/api/tags')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Work',
            color: '#ff0000'
          })
          .expect(201);

        // Try to create duplicate
        const response = await request(app)
          .post('/api/tags')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'WORK', // Different case
            color: '#00ff00'
          })
          .expect(400);

        expect(response.body.error).toBe('Tag with this name already exists');
      });

      it('should reject request without auth token', async () => {
        const validTag = {
          name: 'Test',
          color: '#ff0000'
        };

        await request(app)
          .post('/api/tags')
          .send(validTag)
          .expect(401);
      });
    });

    describe('POST /api/tags/validate-name', () => {
      beforeEach(async () => {
        // Create a test tag for validation tests
        await request(app)
          .post('/api/tags')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'ExistingTag',
            color: '#ff0000'
          });
      });

      it('should validate available tag name', async () => {
        const response = await request(app)
          .post('/api/tags/validate-name')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'NewTag' })
          .expect(200);

        expect(response.body.isValid).toBe(true);
        expect(response.body.message).toBe('Tag name is available');
      });

      it('should reject existing tag name (case insensitive)', async () => {
        const response = await request(app)
          .post('/api/tags/validate-name')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'existingtag' }) // Different case
          .expect(200);

        expect(response.body.isValid).toBe(false);
        expect(response.body.message).toBe('Tag name already exists');
      });

      it('should reject empty name', async () => {
        await request(app)
          .post('/api/tags/validate-name')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: '' })
          .expect(400);
      });
    });
  });

  describe('Password Entries API', () => {
    beforeEach(async () => {
      // Create a test tag for password entry tests
      const tagResponse = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'TestTag',
          color: '#ff0000'
        });
      testTagId = tagResponse.body.id;
    });

    describe('POST /api/passwords', () => {
      it('should create valid password entry', async () => {
        const validEntry = {
          site: 'github.com',
          username: 'testuser',
          password: 'securepass123',
          notes: 'Development account',
          tagIds: [testTagId]
        };

        const response = await request(app)
          .post('/api/passwords')
          .set('Authorization', `Bearer ${authToken}`)
          .send(validEntry)
          .expect(201);

        expect(response.body).toMatchObject({
          site: 'github.com',
          username: 'testuser',
          notes: 'Development account'
        });
        // Password should be encrypted
        expect(response.body.password).not.toBe('securepass123');
      });

      it('should create entry at maximum field lengths', async () => {
        const maxLengthEntry = {
          site: 'A'.repeat(256),
          username: 'B'.repeat(128),
          password: 'C'.repeat(128),
          notes: 'D'.repeat(4096)
        };

        const response = await request(app)
          .post('/api/passwords')
          .set('Authorization', `Bearer ${authToken}`)
          .send(maxLengthEntry)
          .expect(201);

        expect(response.body.site).toBe('A'.repeat(256));
        expect(response.body.username).toBe('B'.repeat(128));
        expect(response.body.notes).toBe('D'.repeat(4096));
      });

      it('should reject site exceeding 256 characters', async () => {
        const invalidEntry = {
          site: 'A'.repeat(257), // Too long
          username: 'user'
        };

        const response = await request(app)
          .post('/api/passwords')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidEntry)
          .expect(400);

        expect(response.body.error).toBe('Validation failed');
        expect(response.body.details[0].message).toBe('Site must be less than or equal to 256 characters');
      });

      it('should reject username exceeding 128 characters', async () => {
        const invalidEntry = {
          site: 'example.com',
          username: 'A'.repeat(129) // Too long
        };

        const response = await request(app)
          .post('/api/passwords')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidEntry)
          .expect(400);

        expect(response.body.details[0].message).toBe('Username must be less than or equal to 128 characters');
      });

      it('should reject duplicate site+username combination', async () => {
        const entry = {
          site: 'example.com',
          username: 'testuser'
        };

        // Create first entry
        await request(app)
          .post('/api/passwords')
          .set('Authorization', `Bearer ${authToken}`)
          .send(entry)
          .expect(201);

        // Try to create duplicate
        const response = await request(app)
          .post('/api/passwords')
          .set('Authorization', `Bearer ${authToken}`)
          .send(entry)
          .expect(400);

        expect(response.body.error).toBe('Password entry for this site and username already exists');
      });

      it('should create entry without optional fields', async () => {
        const minimalEntry = {
          site: 'minimal.com',
          username: 'user'
        };

        const response = await request(app)
          .post('/api/passwords')
          .set('Authorization', `Bearer ${authToken}`)
          .send(minimalEntry)
          .expect(201);

        expect(response.body.site).toBe('minimal.com');
        expect(response.body.username).toBe('user');
        expect(response.body.password).toBeNull();
        expect(response.body.notes).toBeNull();
      });
    });

    describe('POST /api/passwords/validate-entry', () => {
      beforeEach(async () => {
        // Create existing entry for validation tests
        await request(app)
          .post('/api/passwords')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            site: 'existing.com',
            username: 'existinguser'
          });
      });

      it('should validate available site+username combination', async () => {
        const response = await request(app)
          .post('/api/passwords/validate-entry')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            site: 'new.com',
            username: 'newuser'
          })
          .expect(200);

        expect(response.body.isValid).toBe(true);
        expect(response.body.message).toBe('Site and username combination is available');
      });

      it('should reject existing site+username combination', async () => {
        const response = await request(app)
          .post('/api/passwords/validate-entry')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            site: 'existing.com',
            username: 'existinguser'
          })
          .expect(200);

        expect(response.body.isValid).toBe(false);
        expect(response.body.message).toBe('Password entry for this site and username already exists');
      });
    });
  });

  describe('Users API', () => {
    describe('POST /api/users', () => {
      it('should create valid user', async () => {
        const validUser = {
          name: 'NewUser',
          password: 'password123',
          isAdmin: false
        };

        const response = await request(app)
          .post('/api/users')
          .set('Authorization', `Bearer ${authToken}`)
          .send(validUser)
          .expect(201);

        expect(response.body.name).toBe('NewUser');
        expect(response.body.isAdmin).toBe(false);
        expect(response.body.password).toBeUndefined(); // Should not be returned
      });

      it('should create user at maximum name length (100 chars)', async () => {
        const longNameUser = {
          name: 'A'.repeat(100),
          password: 'password123'
        };

        const response = await request(app)
          .post('/api/users')
          .set('Authorization', `Bearer ${authToken}`)
          .send(longNameUser)
          .expect(201);

        expect(response.body.name).toBe('A'.repeat(100));
      });

      it('should reject name exceeding 100 characters', async () => {
        const invalidUser = {
          name: 'A'.repeat(101), // Too long
          password: 'password123'
        };

        const response = await request(app)
          .post('/api/users')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidUser)
          .expect(400);

        expect(response.body.details[0].message).toBe('Name must be less than or equal to 100 characters');
      });

      it('should reject password shorter than 6 characters', async () => {
        const invalidUser = {
          name: 'testuser',
          password: '12345' // Too short
        };

        const response = await request(app)
          .post('/api/users')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidUser)
          .expect(400);

        expect(response.body.details[0].message).toBe('Password must be at least 6 characters');
      });

      it('should reject duplicate username (case insensitive)', async () => {
        const response = await request(app)
          .post('/api/users')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'testuser', // Different case from existing TestUser
            password: 'password123'
          })
          .expect(400);

        expect(response.body.error).toBe('User already exists');
      });
    });
  });
});
