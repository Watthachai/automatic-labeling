import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/src/app/libs/prisma';

interface Params {
  params: {
    id: string
  }
}

// ตรวจสอบสิทธิ์ admin
async function verifyAdmin(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false, error: 'Unauthorized' };
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      username: string;
      role: string;
    };

    if (decoded.role !== 'ADMIN') {
      return { success: false, error: 'Admin access required' };
    }

    return { success: true };
  } catch (error) {
    console.error('Token verification error:', error);
    return { success: false, error: 'Invalid token' };
  }
}

// PUT - อัพเดทสถานะผู้ใช้
export async function PUT(request: Request, { params }: Params) {
  const auth = await verifyAdmin(request);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const userId = params.id;
    const { isActive } = await request.json();
    
    if (isActive === undefined) {
      return NextResponse.json({ error: 'isActive field is required' }, { status: 400 });
    }

    // ตรวจสอบว่ามีผู้ใช้นี้อยู่ในระบบ
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // อัพเดทสถานะผู้ใช้
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive }
    });

    // ส่งข้อมูลกลับโดยไม่เปิดเผยรหัสผ่าน
    const { ...userWithoutPassword } = updatedUser;
    
    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error('Error updating user status:', error);
    return NextResponse.json({ error: 'Failed to update user status' }, { status: 500 });
  }
}