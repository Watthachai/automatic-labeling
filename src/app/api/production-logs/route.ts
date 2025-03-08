import { NextResponse } from 'next/server';
import { prisma } from '@/src/app/libs/prisma';

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

    const productionLog = await prisma.productionLog.create({
      data: {
        ...data,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        // Convert numbers to strings since Prisma schema expects strings
        startCount: data.startCount,
        endCount: data.endCount,
        totalProduced: data.totalProduced,
      }
    });

    return NextResponse.json(productionLog);
  } catch (error) {
    console.error('Production log error:', error);
    return NextResponse.json(
      { error: 'Failed to create production log' },
      { status: 500 }
    );
  }
}