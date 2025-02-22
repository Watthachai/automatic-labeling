import { prisma } from '@/src/app/libs/prisma';

interface ProductionLogData {
  startTime: string | Date;
  endTime: string | Date;
  date: string;
  [key: string]: string | Date | number | boolean | undefined;
}

export async function saveProductionLog(logData: ProductionLogData) {
  try {
    const response = await fetch('/api/production-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...logData,
        startTime: new Date(logData.startTime),
        endTime: new Date(logData.endTime),
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to save production log');
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving production log:', error);
    throw error;
  }
}

export async function getDailyLogs(date: string) {
  return await prisma.productionLog.findMany({
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
}

export async function getProductionLogsByDateRange(startDate: string, endDate: string) {
  return await prisma.productionLog.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: [
      { date: 'asc' },
      { startTime: 'asc' },
    ],
    include: {
      user: {
        select: {
          username: true,
          department: true,
        },
      },
    },
  });
}