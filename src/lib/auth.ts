import { PrismaClient, User, TwoFactorCode } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { sendSMS } from './smsService';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secure-jwt-secret';
const MAX_VERIFICATION_ATTEMPTS = 3;
const VERIFICATION_WINDOW = 10 * 60 * 1000; // 10 minutes

interface TokenPayload {
  id: string;
  username: string;
  role: string;
  hospitalId: string;
}

interface AuthError extends Error {
  code?: string;
}

interface LoginResponse {
  requires2FA: boolean;
  token?: string;
  error?: string;
}

export async function loginUser(
  username: string, 
  password: string, 
  hospitalId: string
): Promise<LoginResponse> {
  try {
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user || !user.isActive || user.hospitalId !== hospitalId) {
      return { requires2FA: false, error: 'Invalid credentials' };
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return { requires2FA: false, error: 'Invalid credentials' };
    }

    // Generate and send 2FA code
    const code = Math.random().toString().substring(2, 8);
    await prisma.twoFactorCode.create({
      data: {
        userId: user.id,
        code,
        expiresAt: new Date(Date.now() + VERIFICATION_WINDOW)
      }
    });

    // Send SMS
    await sendSMS(user.phoneNumber, code);

    return { requires2FA: true };
  } catch (error) {
    console.error('Login error:', error);
    return { requires2FA: false, error: 'Login failed' };
  }
}

export async function verify2FACode(userId: string, code: string): Promise<boolean> {
  try {
    const validCode = await prisma.twoFactorCode.findFirst({
      where: {
        userId,
        code,
        used: false,
        expiresAt: { gt: new Date() }
      }
    });

    if (!validCode) return false;

    // Mark code as used
    await prisma.twoFactorCode.update({
      where: { id: validCode.id },
      data: { used: true }
    });

    return true;
  } catch (error) {
    console.error('2FA verification error:', error);
    return false;
  }
}

export async function generateToken(userId: string): Promise<string | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        role: true,
        hospitalId: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }

    const payload: TokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      hospitalId: user.hospitalId
    };

    return jwt.sign(
      payload,
      JWT_SECRET,
      { 
        expiresIn: '8h',
        algorithm: 'HS256'
      }
    );
  } catch (error) {
    console.error('Token generation error:', error);
    return null;
  }
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    
    if ((decoded as any).temp) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { isActive: true }
    });

    if (!user?.isActive) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}