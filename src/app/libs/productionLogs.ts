import { prisma } from '@/src/app/libs/prisma';

interface ProductionLogData {
  startTime: string | Date;
  endTime: string | Date;
  date: string;
  [key: string]: string | Date | number | boolean | undefined;
}

export const saveProductionLog = async (data: ProductionLogData) => {
  try {
    // Log what we're trying to save
    console.log('Sending data to API:', data);
    
    // Make sure all required fields are present
    if (!data.userId || !data.username || !data.startTime || !data.endTime) {
      console.error('Missing required fields in production log data');
      throw new Error('Missing required fields in production log data');
    }
    
    // Make sure fields have valid formats
    if (isNaN(new Date(data.startTime).getTime()) || isNaN(new Date(data.endTime).getTime())) {
      console.error('Invalid date format in production log data');
      throw new Error('Invalid date format in production log data');
    }
    
    // Add error handling for the fetch call
    const response = await fetch('/api/production-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    // Handle non-ok responses
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      throw new Error(`Failed to save production log: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error saving production log:', error);
    throw error;
  }
};

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