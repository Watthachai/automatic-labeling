import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { generateToken } from '@/lib/auth';

const prisma = new PrismaClient();

interface Verify2FARequest {
  userId: string;
  code: string;
}

export async function POST(request: Request) {
  try {
    const { userId, code } = await request.json() as Verify2FARequest;

    if (!userId || !code) {
      return NextResponse.json(
        { error: 'User ID and verification code are required' },
        { status: 400 }
      );
    }

    const validCode = await prisma.twoFactorCode.findFirst({
      where: {
        userId,
        code,
        isUsed: false,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (!validCode) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 401 }
      );
    }

    // Mark code as used
    await prisma.twoFactorCode.update({
      where: { id: validCode.id },
      data: { isUsed: true }
    });

    // Generate token
    const token = await generateToken(userId);
    if (!token) {
      throw new Error('Failed to generate token');
    }

    // Update last login
    await prisma.user.update({
      where: { id: userId },
      data: { lastLogin: new Date() }
    });

    return NextResponse.json({ token });

  } catch (error) {
    console.error('2FA verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}