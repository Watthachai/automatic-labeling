import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/src/app/libs/prisma';

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

// GET - ดึงรายการโรงพยาบาล
export async function GET(request: Request) {
  const auth = await verifyAdmin(request);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const hospitals = await prisma.hospital.findMany({
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(hospitals);
  } catch (error) {
    console.error('Error fetching hospitals:', error);
    return NextResponse.json({ error: 'Failed to fetch hospitals' }, { status: 500 });
  }
}

// POST - เพิ่มโรงพยาบาลใหม่
export async function POST(request: Request) {
  const auth = await verifyAdmin(request);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const data = await request.json();
    
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!data.id || !data.name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // ตรวจสอบว่ามีโรงพยาบาลนี้อยู่แล้วหรือไม่
    const existingHospital = await prisma.hospital.findUnique({
      where: { id: data.id }
    });

    if (existingHospital) {
      return NextResponse.json({ error: 'Hospital ID already exists' }, { status: 400 });
    }

    // สร้างโรงพยาบาลใหม่
    const newHospital = await prisma.hospital.create({
      data: {
        id: data.id,
        name: data.name
      }
    });
    
    return NextResponse.json(newHospital);
  } catch (error) {
    console.error('Error creating hospital:', error);
    return NextResponse.json({ error: 'Failed to create hospital' }, { status: 500 });
  }
}