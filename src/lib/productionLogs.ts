import { prisma } from './prisma';
import type { ProductionLog } from '@prisma/client';

export async function saveProductionLog(data: Omit<ProductionLog, 'id' | 'createdAt' | 'updatedAt'>) {
  const response = await fetch('/api/production-logs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    const errorMessage = error && typeof error === 'object' && 'message' in error
      ? String(error.message)
      : 'Failed to save production log';
    throw new Error(errorMessage);
  }

  return response.json();
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