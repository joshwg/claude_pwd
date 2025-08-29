import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create the Super admin user
  const hashedPassword = await bcrypt.hash('abcd1234', 10);
  
  const superUser = await prisma.user.upsert({
    where: { name: 'super' },
    update: {},
    create: {
      name: 'super',
      password: hashedPassword,
      isAdmin: true,
    },
  });

  console.log('Created Super admin user:', { id: superUser.id, name: superUser.name });

  // Create some sample tags for the Super user
  const predefinedColors = [
    '#EF4444', '#F97316', '#EAB308', '#22C55E', '#06B6D4', '#3B82F6',
    '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#0EA5E9', '#6366F1',
    '#A855F7', '#E11D48', '#DC2626', '#EA580C', '#CA8A04', '#16A34A',
    '#0891B2', '#2563EB', '#7C3AED', '#C2410C', '#BE123C', '#9A3412'
  ];

  const sampleTags = [
    { name: 'Work', description: 'Work-related passwords', color: predefinedColors[0] },
    { name: 'Personal', description: 'Personal accounts', color: predefinedColors[1] },
    { name: 'Banking', description: 'Financial accounts', color: predefinedColors[2] },
    { name: 'Social Media', description: 'Social media platforms', color: predefinedColors[3] },
    { name: 'Shopping', description: 'E-commerce sites', color: predefinedColors[4] },
  ];

  for (const tag of sampleTags) {
    await prisma.tag.upsert({
      where: {
        name_userId: {
          name: tag.name,
          userId: superUser.id,
        },
      },
      update: {},
      create: {
        ...tag,
        userId: superUser.id,
      },
    });
  }

  console.log('Created sample tags for Super user');
  console.log('Database seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
