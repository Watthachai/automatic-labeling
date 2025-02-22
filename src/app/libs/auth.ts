import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { compare } from 'bcryptjs';

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface JWTPayload {
  id: string;
  username: string;
  role: string;
  hospitalId: string;
}

interface LoginResult {
  user: {
    id: string;
    username: string;
    role: string;
    hospitalId: string;
  } | null;
  token: string | null;
  error?: string;
}

export async function authenticateUser(
  username: string, 
  password: string, 
  hospitalId: string
): Promise<LoginResult> {
  try {
    // Find user
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        password: true,
        role: true,
        hospitalId: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      return { user: null, token: null, error: 'Invalid credentials' };
    }

    // Verify hospital ID
    if (user.hospitalId !== hospitalId) {
      return { user: null, token: null, error: 'Invalid hospital ID' };
    }

    // Verify password
    const validPassword = await compare(password, user.password);
    if (!validPassword) {
      return { user: null, token: null, error: 'Invalid credentials' };
    }

    // Generate token
    const token = await generateToken(user.id);
    if (!token) {
      return { user: null, token: null, error: 'Failed to generate token' };
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Return success result
    return {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        hospitalId: user.hospitalId
      },
      token
    };

  } catch (error) {
    console.error('Authentication error:', error);
    return { user: null, token: null, error: 'Authentication failed' };
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

    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        hospitalId: user.hospitalId
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
  } catch (error) {
    console.error('Token generation error:', error);
    return null;
  }
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    if (!JWT_SECRET) {
      console.error('JWT_SECRET is not configured');
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded === 'string') {
      return null;
    }

    return decoded as JWTPayload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}