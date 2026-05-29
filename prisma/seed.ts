import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { id: 'admin-001' },
    update: {},
    create: {
      id: 'admin-001',
      name: 'Administrator',
      phone: '+6287892614294',
    },
  });

  // Create admin API keys
  await prisma.apiKey.upsert({
    where: { key: 'recon-admin-5CwJXmXOXUMMc6YdFwJxmM9Gev7zrgrJPlX5kWcq1ed6480e' },
    update: {},
    create: {
      key: 'recon-admin-5CwJXmXOXUMMc6YdFwJxmM9Gev7zrgrJPlX5kWcq1ed6480e',
      userId: adminUser.id,
      plan: 'lifetime',
      label: 'Admin Master Key',
      isActive: true,
    },
  });

  await prisma.apiKey.upsert({
    where: { key: 'recon-admin-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a' },
    update: {},
    create: {
      key: 'recon-admin-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a',
      userId: adminUser.id,
      plan: 'lifetime',
      label: 'Admin Key #2',
      isActive: true,
    },
  });

  // Create user API key
  await prisma.apiKey.upsert({
    where: { key: '5CwJXmXOXUMMc6YdFwJxmM9Gev7zrgrJPlX5kWcq1ed6480e' },
    update: {},
    create: {
      key: '5CwJXmXOXUMMc6YdFwJxmM9Gev7zrgrJPlX5kWcq1ed6480e',
      userId: adminUser.id,
      plan: 'lifetime',
      label: 'User Master Key',
      isActive: true,
    },
  });

  await prisma.apiKey.upsert({
    where: { key: '8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a' },
    update: {},
    create: {
      key: '8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a',
      userId: adminUser.id,
      plan: 'lifetime',
      label: 'User Key #2',
      isActive: true,
    },
  });

  // Create demo user
  const demoUser = await prisma.user.upsert({
    where: { id: 'user-demo-001' },
    update: {},
    create: {
      id: 'user-demo-001',
      name: 'Demo User',
      phone: '+628000000000',
    },
  });

  await prisma.apiKey.upsert({
    where: { key: 'recon-demo-freekey2024xanvyor' },
    update: {},
    create: {
      key: 'recon-demo-freekey2024xanvyor',
      userId: demoUser.id,
      plan: '7days',
      label: 'Demo Key',
      isActive: true,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('✅ Seed completed successfully!');
  console.log('Admin keys:');
  console.log('  - recon-admin-5CwJXmXOXUMMc6YdFwJxmM9Gev7zrgrJPlX5kWcq1ed6480e');
  console.log('  - recon-admin-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a');
  console.log('User keys:');
  console.log('  - 5CwJXmXOXUMMc6YdFwJxmM9Gev7zrgrJPlX5kWcq1ed6480e');
  console.log('  - 8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
