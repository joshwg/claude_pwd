"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding database...');
    const hashedPassword = await bcryptjs_1.default.hash('abcd1234', 10);
    const superUser = await prisma.user.upsert({
        where: { name: 'Super' },
        update: {},
        create: {
            name: 'Super',
            password: hashedPassword,
            isAdmin: true,
        },
    });
    console.log('Created Super admin user:', { id: superUser.id, name: superUser.name });
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
//# sourceMappingURL=seed.js.map