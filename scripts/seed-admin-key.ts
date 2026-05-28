import { db } from '../src/lib/db';

async function main() {
  // Create admin user with the provided API key
  const apiKey = 'QCg6KXpYqKomtQXKGa0pngYzM9u5QpZvwqZjMupP3d3a869e';
  
  // Check if key already exists
  const existing = await db.apiKey.findUnique({ where: { key: `recon-admin-${apiKey}` } });
  if (existing) {
    console.log('Admin key already exists');
    return;
  }
  
  // Create admin user
  const user = await db.user.create({
    data: { name: 'XANVYOR Admin', phone: '+6287892614294' },
  });
  
  // Create admin API key (lifetime)
  const keyRecord = await db.apiKey.create({
    data: {
      key: `recon-admin-${apiKey}`,
      userId: user.id,
      plan: 'lifetime',
      label: 'Admin Key - Full Access',
      isActive: true,
      expiresAt: null,
    },
  });
  
  console.log(`Admin user created: ${user.name} (${user.id})`);
  console.log(`Admin API key: ${keyRecord.key}`);
  console.log(`Login with: recon-admin-${apiKey}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
