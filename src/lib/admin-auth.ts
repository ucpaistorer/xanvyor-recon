import { db } from '@/lib/db';

/**
 * Verify that an API key belongs to an admin user.
 * Admin is determined by:
 * 1. Key starts with 'recon-admin-' prefix
 * 2. Key label contains 'admin'
 * 3. User name contains 'admin'
 */
export async function verifyAdminKey(key: string): Promise<{ valid: boolean; keyRecord?: Awaited<ReturnType<typeof db.apiKey.findUnique>> }> {
  if (!key) return { valid: false };

  const keyRecord = await db.apiKey.findUnique({
    where: { key },
    include: { user: true },
  });

  if (!keyRecord || !keyRecord.isActive) return { valid: false };

  if (keyRecord.expiresAt && new Date() > keyRecord.expiresAt) {
    await db.apiKey.update({ where: { id: keyRecord.id }, data: { isActive: false } });
    return { valid: false };
  }

  const isAdmin = keyRecord.key.startsWith('recon-admin-') ||
    (keyRecord.label && keyRecord.label.toLowerCase().includes('admin')) ||
    (keyRecord.user?.name && keyRecord.user.name.toLowerCase().includes('admin'));

  if (!isAdmin) return { valid: false };

  return { valid: true, keyRecord };
}
