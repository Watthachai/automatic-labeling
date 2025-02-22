// src/app/api/audit/route.ts
import { prisma } from '@/src/app/libs/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { userId, action, details, productionId, ipAddress } = await request.json();

    // Validate required fields
    if (!userId || !action || !details) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const auditLog = await prisma.auditLog.create({
      data: {
        userId,
        action,
        details,
        productionId,
        ipAddress,
        createdAt: new Date()
      }
    });

    return NextResponse.json(auditLog);
  } catch (error) {
    console.error('Audit log error:', error);
    return NextResponse.json(
      { error: 'Failed to create audit log' },
      { status: 500 }
    );
  }
}