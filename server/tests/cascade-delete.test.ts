import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

describe('User Cascade Delete', () => {
  let testUserId: string;
  let testTagId: string;
  let testPasswordEntryId: string;

  beforeEach(async () => {
    // Create a test user
    const hashedPassword = await bcrypt.hash('testpassword', 12);
    const user = await prisma.user.create({
      data: {
        name: `testuser_${Date.now()}`,
        password: hashedPassword,
        isAdmin: false
      }
    });
    testUserId = user.id;

    // Create a test tag for the user
    const tag = await prisma.tag.create({
      data: {
        name: 'test-tag',
        description: 'Test tag for cascade delete',
        color: '#FF0000',
        userId: testUserId
      }
    });
    testTagId = tag.id;

    // Create a test password entry for the user
    const passwordEntry = await prisma.passwordEntry.create({
      data: {
        site: 'example.com',
        username: 'testuser',
        password: 'encrypted_password',
        salt: 'test_salt',
        userId: testUserId
      }
    });
    testPasswordEntryId = passwordEntry.id;

    // Create a password entry tag relationship
    await prisma.passwordEntryTag.create({
      data: {
        passwordEntryId: testPasswordEntryId,
        tagId: testTagId
      }
    });
  });

  afterEach(async () => {
    // Clean up any remaining data
    try {
      await prisma.passwordEntryTag.deleteMany({});
      await prisma.passwordEntry.deleteMany({});
      await prisma.tag.deleteMany({});
      await prisma.user.deleteMany({});
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should cascade delete all related data when user is deleted', async () => {
    // Verify test data exists before deletion
    const userBefore = await prisma.user.findUnique({ where: { id: testUserId } });
    const tagsBefore = await prisma.tag.findMany({ where: { userId: testUserId } });
    const passwordEntriesBefore = await prisma.passwordEntry.findMany({ where: { userId: testUserId } });
    const passwordEntryTagsBefore = await prisma.passwordEntryTag.findMany({ 
      where: { passwordEntryId: testPasswordEntryId } 
    });

    expect(userBefore).toBeTruthy();
    expect(tagsBefore).toHaveLength(1);
    expect(passwordEntriesBefore).toHaveLength(1);
    expect(passwordEntryTagsBefore).toHaveLength(1);

    // Delete the user
    await prisma.user.delete({
      where: { id: testUserId }
    });

    // Verify all related data has been cascade deleted
    const userAfter = await prisma.user.findUnique({ where: { id: testUserId } });
    const tagsAfter = await prisma.tag.findMany({ where: { userId: testUserId } });
    const passwordEntriesAfter = await prisma.passwordEntry.findMany({ where: { userId: testUserId } });
    const passwordEntryTagsAfter = await prisma.passwordEntryTag.findMany({ 
      where: { passwordEntryId: testPasswordEntryId } 
    });

    expect(userAfter).toBeNull();
    expect(tagsAfter).toHaveLength(0);
    expect(passwordEntriesAfter).toHaveLength(0);
    expect(passwordEntryTagsAfter).toHaveLength(0);
  });

  it('should handle deleting user with multiple tags and password entries', async () => {
    // Create additional test data
    const tag2 = await prisma.tag.create({
      data: {
        name: 'test-tag-2',
        description: 'Second test tag',
        color: '#00FF00',
        userId: testUserId
      }
    });

    const passwordEntry2 = await prisma.passwordEntry.create({
      data: {
        site: 'example2.com',
        username: 'testuser2',
        password: 'encrypted_password2',
        salt: 'test_salt2',
        userId: testUserId
      }
    });

    // Create additional password entry tag relationships
    await prisma.passwordEntryTag.create({
      data: {
        passwordEntryId: passwordEntry2.id,
        tagId: testTagId
      }
    });

    await prisma.passwordEntryTag.create({
      data: {
        passwordEntryId: testPasswordEntryId,
        tagId: tag2.id
      }
    });

    await prisma.passwordEntryTag.create({
      data: {
        passwordEntryId: passwordEntry2.id,
        tagId: tag2.id
      }
    });

    // Verify data exists
    const tagsBefore = await prisma.tag.findMany({ where: { userId: testUserId } });
    const passwordEntriesBefore = await prisma.passwordEntry.findMany({ where: { userId: testUserId } });
    const passwordEntryTagsBefore = await prisma.passwordEntryTag.findMany();

    expect(tagsBefore).toHaveLength(2);
    expect(passwordEntriesBefore).toHaveLength(2);
    expect(passwordEntryTagsBefore.length).toBeGreaterThanOrEqual(4);

    // Delete the user
    await prisma.user.delete({
      where: { id: testUserId }
    });

    // Verify all related data has been cascade deleted
    const tagsAfter = await prisma.tag.findMany({ where: { userId: testUserId } });
    const passwordEntriesAfter = await prisma.passwordEntry.findMany({ where: { userId: testUserId } });
    const passwordEntryTagsAfter = await prisma.passwordEntryTag.findMany({
      where: {
        OR: [
          { passwordEntryId: testPasswordEntryId },
          { passwordEntryId: passwordEntry2.id }
        ]
      }
    });

    expect(tagsAfter).toHaveLength(0);
    expect(passwordEntriesAfter).toHaveLength(0);
    expect(passwordEntryTagsAfter).toHaveLength(0);
  });
});
