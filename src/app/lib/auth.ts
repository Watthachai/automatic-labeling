import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const authenticateUser = async (username: string, password: string, hospitalId: string) => {
  // Get user
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.isActive) return null;

  // Verify password
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword || user.hospitalId !== hospitalId) return null;

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() }
  });

  // Create JWT token
  const token = jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role,
      hospitalId: user.hospitalId 
    },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  return { user, token };
};

// Middleware to verify JWT token
export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
};