const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        isAdmin: true
      }
    });
    
    console.log('Current users in database:');
    console.table(users);
    
    // Try to find Super user specifically
    const superUser = await prisma.user.findUnique({
      where: { name: 'Super' }
    });
    
    console.log('\nSuper user (exact match):', superUser ? 'Found' : 'Not found');
    
    // Try to find super user (lowercase)
    const superUserLower = await prisma.user.findUnique({
      where: { name: 'super' }
    });
    
    console.log('super user (lowercase):', superUserLower ? 'Found' : 'Not found');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
