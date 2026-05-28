import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdminKey } from '@/lib/admin-auth';
import crypto from 'crypto';

function generateApiKey(isAdmin: boolean = false): string {
  const prefix = isAdmin ? 'recon-admin-' : 'recon-';
  const randomPart = crypto.randomBytes(32).toString('hex');
  const timestamp = Date.now().toString(36);
  const extraRandom = crypto.randomBytes(16).toString('base64url');
  return `${prefix}${timestamp}-${randomPart}-${extraRandom}`;
}

// GET all API keys
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('x-admin-key');
    const { valid } = await verifyAdminKey(authHeader || '');
    if (!valid) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const keys = await db.apiKey.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ keys });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST create new API key for existing user
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('x-admin-key');
    const { valid } = await verifyAdminKey(authHeader || '');
    if (!valid) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { userId, plan, label, isAdmin } = await request.json();

    if (!userId || !plan) {
      return NextResponse.json({ error: 'userId and plan are required' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate expiry
    let expiresAt: Date | null = null;
    const now = new Date();
    switch (plan) {
      case '7days':
        expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        break;
      case '90days':
        expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
        break;
      case 'lifetime':
        expiresAt = null;
        break;
      default:
        return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const apiKey = generateApiKey(isAdmin === true);
    const keyRecord = await db.apiKey.create({
      data: {
        key: apiKey,
        userId,
        plan,
        label: label || null,
        isActive: true,
        expiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      apiKey: { id: keyRecord.id, key: apiKey, plan, expiresAt, label: keyRecord.label },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH toggle API key active status
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('x-admin-key');
    const { valid } = await verifyAdminKey(authHeader || '');
    if (!valid) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { keyId, isActive } = await request.json();
    if (!keyId) {
      return NextResponse.json({ error: 'keyId is required' }, { status: 400 });
    }

    const updated = await db.apiKey.update({
      where: { id: keyId },
      data: { isActive: isActive !== undefined ? isActive : undefined },
    });

    return NextResponse.json({ success: true, apiKey: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE an API key
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('x-admin-key');
    const { valid } = await verifyAdminKey(authHeader || '');
    if (!valid) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { keyId } = await request.json();
    if (!keyId) {
      return NextResponse.json({ error: 'keyId is required' }, { status: 400 });
    }

    await db.apiKey.delete({ where: { id: keyId } });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
