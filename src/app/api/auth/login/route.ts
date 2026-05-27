import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json();
    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    const keyRecord = await db.apiKey.findUnique({
      where: { key: apiKey.trim() },
      include: { user: true },
    });

    if (!keyRecord) {
      return NextResponse.json({ error: 'API key tidak valid. Silakan beli API key dari owner.' }, { status: 401 });
    }

    if (!keyRecord.isActive) {
      return NextResponse.json({ error: 'API key sudah dinonaktifkan. Hubungi owner.' }, { status: 401 });
    }

    if (keyRecord.expiresAt && new Date() > keyRecord.expiresAt) {
      await db.apiKey.update({ where: { id: keyRecord.id }, data: { isActive: false } });
      return NextResponse.json({ error: 'API key sudah expired. Silakan perpanjang.' }, { status: 401 });
    }

    // Update last used
    await db.apiKey.update({
      where: { id: keyRecord.id },
      data: { lastUsedAt: new Date() },
    });

    const isAdmin = keyRecord.key.startsWith('recon-admin-');

    return NextResponse.json({
      success: true,
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
