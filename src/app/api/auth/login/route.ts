import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '@/src/app/libs/prisma'

export async function POST(request: NextRequest) {
  try {
    const { username, password, hospitalId } = await request.json()
    console.log('Login attempt:', { username, hospitalId }) // Don't log passwords

    // ตรวจสอบว่ามีข้อมูลครบถ้วน
    if (!username || !password || !hospitalId) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 })
    }

    // ค้นหาผู้ใช้
    const user = await prisma.user.findFirst({
      where: {
        username,
        hospitalId,
        isActive: true,
      },
    })

    // For debugging - check password format in DB
    console.log('User found?', !!user)
    if (user) {
      console.log('Password format check:', {
        length: user.password.length,
        startsWithHash: user.password.startsWith('$2')
      })
    }
    
    // ถ้าไม่พบผู้ใช้หรือรหัสผ่านไม่ถูกต้อง
    if (!user) {
      return NextResponse.json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 })
    }

    // Added fallback validation approach
    let isPasswordValid = false;
    
    try {
      // First attempt with bcrypt
      isPasswordValid = await bcrypt.compare(password, user.password);
      console.log('bcrypt comparison result:', isPasswordValid);
      
      // If that fails and we're in development, try direct comparison as fallback
      if (!isPasswordValid && process.env.NODE_ENV === 'development') {
        // CAUTION: This fallback should only be used during development
        isPasswordValid = (password === user.password);
        console.log('Direct comparison fallback result:', isPasswordValid);
        
        // If the direct comparison works, upgrade to bcrypt hash
        if (isPasswordValid) {
          const hashedPassword = await bcrypt.hash(password, 10);
          await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
          });
          console.log('Password automatically upgraded to bcrypt hash');
        }
      }
    } catch (error) {
      console.error('Password validation error:', error);
      isPasswordValid = false;
    }
    
    console.log('Final password valid?', isPasswordValid);
    
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 })
    }

    // Check if JWT_SECRET is set
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set');
      return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการตั้งค่าระบบ' }, { status: 500 })
    }

    // สร้าง JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        hospitalId: user.hospitalId,
        department: user.department,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    )

    // ส่งข้อมูลกลับ
    return NextResponse.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        hospitalId: user.hospitalId,
        department: user.department,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' }, { status: 500 })
  }
}