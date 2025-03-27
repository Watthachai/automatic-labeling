import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/src/app/libs/prisma';

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

export async function GET(request: Request) {
  const auth = await verifyAdmin(request);
  
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }
  
  try {
    // นับจำนวนผู้ใช้งานทั้งหมด
    const totalOperators = await prisma.user.count({
      where: { role: 'OPERATOR' },
    });
    
    // นับจำนวนผู้ใช้งานที่ใช้งานอยู่
    const activeOperators = await prisma.user.count({
      where: { 
        role: 'OPERATOR',
        isActive: true 
      },
    });
    
    // นับจำนวนผู้ใช้งานที่ไม่ได้ใช้งาน
    const inactiveOperators = await prisma.user.count({
      where: { 
        role: 'OPERATOR',
        isActive: false 
      },
    });
    
    // นับจำนวนการผลิตทั้งหมด
    const totalProduction = await prisma.productionLog.aggregate({
      _sum: {
        totalProduced: true,
      },
    });
    
    return NextResponse.json({
      totalOperators,
      activeOperators,
      inactiveOperators,
      totalProduction: totalProduction._sum.totalProduced || 0,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}