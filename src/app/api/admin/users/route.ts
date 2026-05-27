import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

// Generate a long random API key
function generateApiKey(isAdmin: boolean = false): string {
  const prefix = isAdmin ? 'recon-admin-' : 'recon-';
  const randomPart = crypto.randomBytes(32).toString('hex');
  const timestamp = Date.now().toString(36);
  const extraRandom = crypto.randomBytes(16).toString('base64url');
  return `${prefix}${timestamp}-${randomPart}-${extraRandom}`;
}

// GET all users with their API keys
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('x-admin-key');
    if (!authHeader || !authHeader.startsWith('recon-admin-')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Verify admin key exists
    const adminKey = await db.apiKey.findUnique({ where: { key: authHeader } });
    if (!adminKey || !adminKey.isActive) {
      return NextResponse.json({ error: 'Invalid admin key' }, { status: 403 });
    }

    const users = await db.user.findMany({
      include: { apiKeys: { orderBy: { createdAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST create a new user
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('x-admin-key');
    if (!authHeader || !authHeader.startsWith('recon-admin-')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const adminKey = await db.apiKey.findUnique({ where: { key: authHeader } });
    if (!adminKey || !adminKey.isActive) {
      return NextResponse.json({ error: 'Invalid admin key' }, { status: 403 });
    }

    const { name, phone, plan, label, isAdmin } = await request.json();

    if (!plan) {
      return NextResponse.json({ error: 'Plan is required' }, { status: 400 });
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
        return NextResponse.json({ error: 'Invalid plan. Use: 7days, 30days, 90days, lifetime' }, { status: 400 });
    }

    // Create user
    const user = await db.user.create({
      data: {
        name: name || null,
        phone: phone || null,
      },
    });

    // Create API key
    const apiKey = generateApiKey(isAdmin === true);
    const keyRecord = await db.apiKey.create({
      data: {
        key: apiKey,
        userId: user.id,
        plan,
        label: label || null,
        isActive: true,
        expiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, phone: user.phone },
      apiKey: { id: keyRecord.id, key: apiKey, plan, expiresAt, label: keyRecord.label },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
