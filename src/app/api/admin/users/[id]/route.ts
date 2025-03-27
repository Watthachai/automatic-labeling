import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/src/app/libs/prisma';

interface Params {
  id: string;
}

// ฟังก์ชันตรวจสอบสิทธิ์ admin
async function verifyAdmin(request: Request) {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { success: false, error: 'Missing token' };
  }
  
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      username: string;
      role: string;
    };
    
    if (decoded.role !== 'ADMIN') {
      return { success: false, error: 'Admin access required' };
    }
    
    return { success: true, adminId: decoded.id };
  } catch (error) {
    console.error('Token verification error:', error);
    return { success: false, error: 'Invalid token' };
  }
}

// ฟังก์ชันตรวจสอบรูปแบบเบอร์โทรศัพท์
function validatePhoneNumber(phoneNumber: string): boolean {
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phoneNumber);
}

// API Route สำหรับอัพเดทข้อมูลผู้ใช้
export async function PUT(request: Request, { params }: { params: Params }) {
  const auth = await verifyAdmin(request);
  
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }
  
  try {
    const userId = params.id;
    const { password, phoneNumber, department, hospitalId, role, isActive, is2FAEnabled } = await request.json();
    
    // ตรวจสอบว่ามีผู้ใช้อยู่จริง
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // ตรวจสอบรูปแบบเบอร์โทรศัพท์
    if (phoneNumber && !validatePhoneNumber(phoneNumber)) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
    }
    
    // ตรวจสอบเบอร์โทรศัพท์ซ้ำ (ยกเว้นตัวเอง)
    if (phoneNumber && phoneNumber !== existingUser.phoneNumber) {
      const duplicatePhone = await prisma.user.findFirst({
        where: { 
          phoneNumber,
          NOT: { id: userId }
        },
      });
      
      if (duplicatePhone) {
        return NextResponse.json({ error: 'Phone number already in use' }, { status: 400 });
      }
    }
    
    // เตรียมข้อมูลที่จะอัพเดท
    const updateData: Partial<{
      department: string;
      hospitalId: string;
      role: string;
      isActive: boolean;
      is2FAEnabled: boolean;
      phoneNumber: string;
      password: string;
    }> = {
      department: department || existingUser.department,
      hospitalId: hospitalId || existingUser.hospitalId,
      role: role || existingUser.role,
      isActive: isActive !== undefined ? isActive : existingUser.isActive,
      is2FAEnabled: is2FAEnabled !== undefined ? is2FAEnabled : existingUser.is2FAEnabled,
    };
    
    // อัพเดทเบอร์โทรศัพท์ถ้ามีการเปลี่ยนแปลง
    if (phoneNumber && phoneNumber !== existingUser.phoneNumber) {
      updateData.phoneNumber = phoneNumber;
    }
    
    // เข้ารหัสรหัสผ่านใหม่ถ้ามีการเปลี่ยน
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    
    // อัพเดทข้อมูลผู้ใช้
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
    
    // ส่งข้อมูลกลับโดยไม่ส่งรหัสผ่าน
    const {...userWithoutPassword } = updatedUser;
    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// API Route สำหรับลบผู้ใช้
export async function DELETE(request: Request, { params }: { params: Params }) {
  const auth = await verifyAdmin(request);
  
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }
  
  try {
    const userId = params.id;
    
    // ตรวจสอบว่ามีผู้ใช้อยู่จริง
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // ลบผู้ใช้
    await prisma.user.delete({
      where: { id: userId },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}