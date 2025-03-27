import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/src/app/libs/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get the Authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization token' }, { status: 401 });
    }
    
    // Extract the token
    const token = authHeader.split(' ')[1];
    
    // Verify JWT token
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured!');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    // Decode and verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
      id: string;
      username: string;
      hospitalId: string;
      role: string;
      department: string;
    };
    
    // Check if user still exists and is active
    const user = await prisma.user.findFirst({
      where: {
        id: decoded.id,
        isActive: true,
      },
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 });
    }
    
    // Return user data
    return NextResponse.json({
      id: user.id,
      username: user.username,
      hospitalId: user.hospitalId,
      role: user.role,
      department: user.department,
    });
    
  } catch (error) {
    console.error('Token verification error:', error);
    
    // Check if it's a JWT verification error
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      return NextResponse.json({ error: 'Token expired' }, { status: 401 });
    }
    
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}