import { prisma } from '@/lib/prisma';

export interface ProductionLog {
  id?: string;
  userId: string;
  username: string;
  date: string;
  startTime: string;
  endTime: string;
  startCount: number;
  endCount: number;
  totalProduced: number;
  material?: string;
  batch?: string;
  vendorBatch?: string;
  materialDescription?: string;
  createdAt?: Date;
}

/**
 * Save a new production log to the database
 */
export async function saveProductionLog(log: ProductionLog): Promise<ProductionLog> {
  try {
    const savedLog = await prisma.productionLog.create({
      data: {
        ...log,
        createdAt: new Date(),
      },
    });
    return savedLog;
  } catch (error) {
    console.error('Error saving production log:', error);
    throw new Error('Failed to save production log');
  }
}

/**
 * Get all production logs for a specific date
 */
export async function getDailyLogs(date: string): Promise<ProductionLog[]> {
  try {
    const logs = await prisma.productionLog.findMany({
      where: {
        date: date,
      },
      orderBy: {
        startTime: 'desc',
      },
    });
    return logs;
  } catch (error) {
    console.error('Error fetching daily logs:', error);
    throw new Error('Failed to fetch daily logs');
  }
}

/**
 * Get production logs within a date range
 */
export async function getLogsInRange(startDate: string, endDate: string): Promise<ProductionLog[]> {
  try {
    const logs = await prisma.productionLog.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: 'desc',
      },
    });
    return logs;
  } catch (error) {
    console.error('Error fetching logs in range:', error);
    throw new Error('Failed to fetch logs in date range');
  }
}

/**
 * Delete a production log by ID
 */
export async function deleteProductionLog(id: string): Promise<void> {
  try {
    await prisma.productionLog.delete({
      where: {
        id,
      },
    });
  } catch (error) {
    console.error('Error deleting production log:', error);
    throw new Error('Failed to delete production log');
  }
}