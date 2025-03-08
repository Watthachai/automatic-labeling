import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()

    const user = await prisma.user.findUnique({
      where: { username }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        hospitalId: user.hospitalId
      },
      process.env.JWT_SECRET!,
      { expiresIn: '8h' }
    )

    return NextResponse.json({ token })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}