import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateToken } from '@/lib/auth';

const prisma = new PrismaClient();

interface LoginRequest {
  username: string;
  password: string;
  hospitalId: string;
}

export async function POST(request: Request) {
  try {
    const { username, password, hospitalId } = await request.json() as LoginRequest;

    if (!username || !password || !hospitalId) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user || !user.isActive || user.hospitalId !== hospitalId) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = await generateToken(user.id);
    if (!token) {
      throw new Error('Failed to generate token');
    }

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