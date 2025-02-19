import { NextResponse } from 'next/server';
import { verify2FACode, generateToken } from '@/lib/auth';
import { logAudit } from '@/app/lib/audit';

interface VerifyRequestBody {
  userId: string;
  code: string;
}

export async function POST(request: Request) {
  try {
    const { userId, code } = await request.json() as VerifyRequestBody;

    if (!userId || !code) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const isValid = await verify2FACode(userId, code);

    // Log the verification attempt
    await logAudit(
      userId,
      isValid ? 'SUCCESS_2FA' : 'FAILED_2FA',
      `2FA verification attempt with code ${code}`,
      undefined,
      request.headers.get('x-forwarded-for') || 'unknown'
    );

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid or expired code' },
        { status: 400 }
      );
    }

    const token = await generateToken(userId);
    if (!token) {
      await logAudit(
        userId,
        'TOKEN_GENERATION_FAILED',
        'Failed to generate token after successful 2FA',
        undefined,
        request.headers.get('x-forwarded-for') || 'unknown'
      );
      
      return NextResponse.json(
        { error: 'Token generation failed' },
        { status: 500 }
      );
    }

    await logAudit(
      userId,
      'LOGIN_SUCCESS',
      'Successfully logged in with 2FA',
      undefined,
      request.headers.get('x-forwarded-for') || 'unknown'
    );

    return NextResponse.json({ token });
  } catch (error) {
    console.error('2FA verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}