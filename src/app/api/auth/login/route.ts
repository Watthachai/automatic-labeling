import { NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { sendSMS } from '@/lib/smsService';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { username, password, hospitalId } = await request.json();

    // Validate input
    if (!username || !password || !hospitalId) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user || !user.isActive || user.hospitalId !== hospitalId) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if 2FA is enabled
    if (user.is2FAEnabled) {
      // Generate 2FA code
      const code = Math.random().toString().substring(2, 8);
      
      // Save code to database
      await prisma.twoFactorCode.create({
        data: {
          userId: user.id,
          code,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
        }
      });

      // Send SMS
      await sendSMS(user.phoneNumber, code);

      return NextResponse.json({ 
        requires2FA: true,
        userId: user.id 
      });
    }

    // If 2FA not enabled, generate token directly
    const token = jwt.sign(
      { 
        id: user.id,
        username: user.username,
        role: user.role,
        hospitalId: user.hospitalId
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '8h' }
    );

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    return NextResponse.json({ token });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}