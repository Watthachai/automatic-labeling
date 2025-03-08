import jwt from 'jsonwebtoken';

interface TokenPayload {
  id: string;
  username: string;
  role: string;
  hospitalId: string;
}

export function generateToken(payload: TokenPayload): string {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { 
      expiresIn: '7d',  // Token expires in 7 days
      algorithm: 'HS256' // Use HMAC SHA256 algorithm
    }
  );
}

export function verifyToken(token: string): TokenPayload {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  return jwt.verify(token, process.env.JWT_SECRET) as TokenPayload;
}