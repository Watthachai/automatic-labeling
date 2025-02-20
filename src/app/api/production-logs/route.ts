import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  if (!date) {
    return NextResponse.json(
      { error: 'Date parameter is required' }, 
      { status: 400 }
    );
  }

  try {
    const logs = await prisma.productionLog.findMany({
      where: { date },
      orderBy: { startTime: 'desc' },
      include: {
        user: {
          select: {
            username: true,
            department: true
          }
        }
      }
    });
    
    return NextResponse.json(logs);
  } catch (error) {
    console.error('Failed to fetch logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch production logs' }, 
      { status: 500 }
    );
  }
}

interface ProductionLogInput {
  date: string;
  userId: string;
  material: string;
  materialDescription: string;
  startTime: string;
  endTime: string;
  username: string;
  startCount: number;
  endCount: number;
  totalProduced: number;
}

export async function POST(request: Request) {
  try {
    const data = await request.json() as ProductionLogInput;
    const log = await prisma.productionLog.create({
      data: {
        date: data.date,
        userId: data.userId,
        material: data.material,
        materialDescription: data.materialDescription,
        startTime: data.startTime,
        endTime: data.endTime,
        username: data.username,
        startCount: data.startCount,
        endCount: data.endCount,
        totalProduced: data.totalProduced,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    return NextResponse.json(log);
  } catch (error) {
    console.error('Failed to save production log:', error);
    return NextResponse.json(
      { error: 'Failed to save production log' },
      { status: 500 }
    );
  }
}