import { db } from '../src/lib/db';

async function seedKey() {
  // Check if admin already exists
  const existing = await db.apiKey.findFirst({
    where: { key: { startsWith: 'recon-admin-' } }
  });

  if (existing) {
    console.log('Admin key already exists:');
    console.log(`Key: ${existing.key}`);
    
    // Also create the user-provided key
    const userKey = 'QCg6KXpYqKomtQXKGa0pngYzM9u5QpZvwqZjMupP3d3a869e';
    const existingUserKey = await db.apiKey.findFirst({
      where: { key: `recon-admin-${userKey}` }
    });
    
    if (!existingUserKey) {
      const adminUser = await db.user.create({
        data: { name: 'XANVYOR Admin', phone: '6287892614294' },
      });
      
      await db.apiKey.create({
        data: {
          key: `recon-admin-${userKey}`,
          userId: adminUser.id,
          plan: 'lifetime',
          label: 'XANVYOR Admin Owner Key',
          isActive: true,
          expiresAt: null,
        },
      });
      console.log('Created admin key: recon-admin-QCg6KXpYqKomtQXKGa0pngYzM9u5QpZvwqZjMupP3d3a869e');
    } else {
      console.log('User key already exists');
    }
    return;
  }

  // Create fresh admin
  const adminUser = await db.user.create({
    data: { name: 'XANVYOR Admin', phone: '6287892614294' },
  });

  // Create the user-provided admin key
  const userKey = 'QCg6KXpYqKomtQXKGa0pngYzM9u5QpZvwqZjMupP3d3a869e';
  
  await db.apiKey.create({
    data: {
      key: `recon-admin-${userKey}`,
      userId: adminUser.id,
      plan: 'lifetime',
      label: 'XANVYOR Admin Owner Key',
      isActive: true,
      expiresAt: null,
    },
  });

  console.log('==========================================');
  console.log('ADMIN API KEY CREATED');
  console.log(`Key: recon-admin-${userKey}`);
  console.log('==========================================');
  
  // Also create a demo user key
  const demoUser = await db.user.create({
    data: { name: 'Demo User', phone: '081234567890' },
  });

  await db.apiKey.create({
    data: {
      key: 'recon-demo-30days-key',
      userId: demoUser.id,
      plan: '30days',
      label: 'Demo User Key',
      isActive: true,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('Demo key: recon-demo-30days-key');
}

seedKey().catch(console.error).finally(() => db.$disconnect());
