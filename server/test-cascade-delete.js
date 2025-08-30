#!/usr/bin/env node

/**
 * Manual test script to verify cascade delete functionality
 * Run this script to test user deletion and cascade behavior
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function testCascadeDelete() {
  console.log('🧪 Testing User Cascade Delete Functionality\n');

  try {
    // 1. Create a test user
    console.log('1. Creating test user...');
    const hashedPassword = await bcrypt.hash('testpassword123', 12);
    const testUser = await prisma.user.create({
      data: {
        name: `test_cascade_${Date.now()}`,
        password: hashedPassword,
        isAdmin: false
      }
    });
    console.log(`✅ Created user: ${testUser.name} (ID: ${testUser.id})`);

    // 2. Create test tags for the user
    console.log('\n2. Creating test tags...');
    const tag1 = await prisma.tag.create({
      data: {
        name: 'work',
        description: 'Work related passwords',
        color: '#FF0000',
        userId: testUser.id
      }
    });

    const tag2 = await prisma.tag.create({
      data: {
        name: 'personal',
        description: 'Personal passwords',
        color: '#00FF00',
        userId: testUser.id
      }
    });
    console.log(`✅ Created tags: ${tag1.name} and ${tag2.name}`);

    // 3. Create test password entries for the user
    console.log('\n3. Creating test password entries...');
    const passwordEntry1 = await prisma.passwordEntry.create({
      data: {
        site: 'example.com',
        username: 'testuser',
        password: 'encrypted_password_1',
        notes: 'Test password entry 1',
        salt: 'salt1',
        userId: testUser.id
      }
    });

    const passwordEntry2 = await prisma.passwordEntry.create({
      data: {
        site: 'github.com',
        username: 'testuser',
        password: 'encrypted_password_2',
        notes: 'Test password entry 2', 
        salt: 'salt2',
        userId: testUser.id
      }
    });
    console.log(`✅ Created password entries for: ${passwordEntry1.site} and ${passwordEntry2.site}`);

    // 4. Create password entry tag relationships
    console.log('\n4. Creating password entry tag relationships...');
    await prisma.passwordEntryTag.create({
      data: {
        passwordEntryId: passwordEntry1.id,
        tagId: tag1.id
      }
    });

    await prisma.passwordEntryTag.create({
      data: {
        passwordEntryId: passwordEntry2.id,
        tagId: tag2.id
      }
    });

    await prisma.passwordEntryTag.create({
      data: {
        passwordEntryId: passwordEntry1.id,
        tagId: tag2.id
      }
    });
    console.log(`✅ Created 3 password entry tag relationships`);

    // 5. Verify data exists before deletion
    console.log('\n5. Verifying data before deletion...');
    const userCount = await prisma.user.count({ where: { id: testUser.id } });
    const tagCount = await prisma.tag.count({ where: { userId: testUser.id } });
    const passwordEntryCount = await prisma.passwordEntry.count({ where: { userId: testUser.id } });
    const passwordEntryTagCount = await prisma.passwordEntryTag.count({
      where: {
        OR: [
          { passwordEntryId: passwordEntry1.id },
          { passwordEntryId: passwordEntry2.id }
        ]
      }
    });

    console.log(`📊 Data before deletion:`);
    console.log(`   Users: ${userCount}`);
    console.log(`   Tags: ${tagCount}`);
    console.log(`   Password Entries: ${passwordEntryCount}`);
    console.log(`   Password Entry Tags: ${passwordEntryTagCount}`);

    // 6. Delete the user (this should cascade delete all related data)
    console.log('\n6. Deleting user (cascade delete)...');
    await prisma.user.delete({
      where: { id: testUser.id }
    });
    console.log(`✅ Deleted user: ${testUser.name}`);

    // 7. Verify all related data has been cascade deleted
    console.log('\n7. Verifying cascade deletion...');
    const userCountAfter = await prisma.user.count({ where: { id: testUser.id } });
    const tagCountAfter = await prisma.tag.count({ where: { userId: testUser.id } });
    const passwordEntryCountAfter = await prisma.passwordEntry.count({ where: { userId: testUser.id } });
    const passwordEntryTagCountAfter = await prisma.passwordEntryTag.count({
      where: {
        OR: [
          { passwordEntryId: passwordEntry1.id },
          { passwordEntryId: passwordEntry2.id }
        ]
      }
    });

    console.log(`📊 Data after deletion:`);
    console.log(`   Users: ${userCountAfter}`);
    console.log(`   Tags: ${tagCountAfter}`);
    console.log(`   Password Entries: ${passwordEntryCountAfter}`);
    console.log(`   Password Entry Tags: ${passwordEntryTagCountAfter}`);

    // 8. Verify cascade delete worked correctly
    if (userCountAfter === 0 && tagCountAfter === 0 && passwordEntryCountAfter === 0 && passwordEntryTagCountAfter === 0) {
      console.log('\n🎉 SUCCESS: Cascade delete working correctly!');
      console.log('✅ All user data (tags, password entries, and password entry tags) were automatically deleted');
    } else {
      console.log('\n❌ FAILURE: Cascade delete not working properly');
      console.log('Some related data was not deleted');
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testCascadeDelete().catch(console.error);
