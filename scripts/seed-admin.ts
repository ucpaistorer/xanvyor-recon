import { db } from '../src/lib/db';
import crypto from 'crypto';

async function seedAdmin() {
  const existingAdmin = await db.apiKey.findFirst({
    where: { key: { startsWith: 'recon-admin-' } }
  });

  if (existingAdmin) {
    console.log('Admin already exists:');
    console.log(`Key: ${existingAdmin.key}`);
    return;
  }

  const adminUser = await db.user.create({
    data: { name: 'Admin Owner', phone: '6287892614294' },
  });

  const randomPart = crypto.randomBytes(32).toString('hex');
  const timestamp = Date.now().toString(36);
  const extraRandom = crypto.randomBytes(16).toString('base64url');
  const adminKey = `recon-admin-${timestamp}-${randomPart}-${extraRandom}`;

  await db.apiKey.create({
    data: {
      key: adminKey,
      userId: adminUser.id,
      plan: 'lifetime',
      label: 'Admin Owner Key',
      isActive: true,
      expiresAt: null,
    },
  });

  console.log('==========================================');
  console.log('ADMIN API KEY CREATED');
  console.log(`Key: ${adminKey}`);
  console.log('==========================================');
}

seedAdmin().catch(console.error).finally(() => db.$disconnect());
