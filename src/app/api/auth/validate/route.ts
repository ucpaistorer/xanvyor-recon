import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json();
    if (!apiKey) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    const keyRecord = await db.apiKey.findUnique({
      where: { key: apiKey.trim() },
      include: { user: true },
    });

    if (!keyRecord || !keyRecord.isActive) {
      return NextResponse.json({ valid: false });
    }

    if (keyRecord.expiresAt && new Date() > keyRecord.expiresAt) {
      await db.apiKey.update({ where: { id: keyRecord.id }, data: { isActive: false } });
      return NextResponse.json({ valid: false });
    }

    const isAdmin = keyRecord.key.startsWith('recon-admin-');

    return NextResponse.json({
      valid: true,
      user: {
        id: keyRecord.user.id,
        name: keyRecord.user.name,
        phone: keyRecord.user.phone,
      },
      apiKey: {
        id: keyRecord.id,
        plan: keyRecord.plan,
        isActive: keyRecord.isActive,
        expiresAt: keyRecord.expiresAt,
        label: keyRecord.label,
      },
      isAdmin,
    });
  } catch {
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
