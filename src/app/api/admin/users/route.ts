import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/src/app/libs/prisma';
import { Role } from '@prisma/client'; // Import the Role enum from Prisma

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
  } catch {
    return { success: false, error: 'Invalid token' };
  }
}

// ฟังก์ชันตรวจสอบรูปแบบเบอร์โทรศัพท์
function validatePhoneNumber(phoneNumber: string): boolean {
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phoneNumber);
}

// GET - ดึงรายการผู้ใช้
export async function GET(request: Request) {
  const auth = await verifyAdmin(request);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        phoneNumber: true,
        department: true,
        hospitalId: true,
        isActive: true,
        is2FAEnabled: true,
        hospital: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        username: 'asc'
      }
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST - เพิ่มผู้ใช้ใหม่
export async function POST(request: Request) {
  const auth = await verifyAdmin(request);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const data = await request.json();
    
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!data.username || !data.password || !data.phoneNumber) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // ตรวจสอบรูปแบบเบอร์โทร
    if (!validatePhoneNumber(data.phoneNumber)) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
    }

    // ตรวจสอบว่าชื่อผู้ใช้ซ้ำหรือไม่
    const existingUser = await prisma.user.findUnique({
      where: { username: data.username }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
    }

    // เข้ารหัสรหัสผ่าน
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Validate and convert role to the correct enum value
    let userRole: Role;
    
    if (data.role === 'ADMIN') {
      userRole = Role.ADMIN;
    } else if (data.role === 'OPERATOR') {
      userRole = Role.OPERATOR;
    } else {
      // Default to OPERATOR if role is not recognized
      userRole = Role.OPERATOR;
    }

    // สร้างผู้ใช้ใหม่
    const newUser = await prisma.user.create({
      data: {
        username: data.username,
        password: hashedPassword,
        role: userRole, // Use the properly converted enum value
        phoneNumber: data.phoneNumber,
        department: data.department || '',
        hospitalId: data.hospitalId,
        isActive: data.isActive !== undefined ? data.isActive : true,
        is2FAEnabled: data.is2FAEnabled !== undefined ? data.is2FAEnabled : true
      }
    });

    // ส่งข้อมูลกลับโดยไม่เปิดเผยรหัสผ่าน
    const { ...userWithoutPassword } = newUser;
    
    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}