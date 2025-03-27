import { prisma } from '../libs/prisma';

export interface User {
  id: string;
  username: string;
  password: string;
  role: 'OPERATOR' | 'ADMIN';
  hospitalId: string;
  phoneNumber: string;
  department: string;
  isActive: boolean;
  is2FAEnabled: boolean;
}

export interface ProductionLog {
  id?: string;
  userId: string;
  username: string;
  date: string;
  startTime: string;
  endTime: string;
  material?: string;
  batch?: string;
  vendorBatch?: string;
  materialDescription?: string;
  startCount: number;
  endCount: number;
  totalProduced: number;
  qrCodeData?: string;
  qrCodeImage?: string;
  serialNumbers?: string[];
}

class DatabaseService {
  async getUser(username: string): Promise<User | null> {
    // Note: Actual password verification should happen in API route
    // This is just a stub for reference
    try {
      const user = await prisma.user.findUnique({
        where: { username }
      });
      
      return user as unknown as User;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  async addProductionLog(log: Omit<ProductionLog, 'id'>): Promise<string> {
    try {
      const newLog = await prisma.productionLog.create({
        data: {
          userId: log.userId,
          username: log.username,
          date: log.date,
          startTime: log.startTime,
          endTime: log.endTime,
          material: log.material || '',
          batch: log.batch || '',
          vendorBatch: log.vendorBatch || '',
          materialDescription: log.materialDescription || '',
          startCount: log.startCount,
          endCount: log.endCount,
          totalProduced: log.totalProduced,
          qrCodeData: log.qrCodeData || '',
          qrCodeImage: log.qrCodeImage || '',
          serialNumbers: log.serialNumbers || [],
        }
      });
      
      return newLog.id;
    } catch (error) {
      console.error('Error adding production log:', error);
      throw error;
    }
  }

  async getProductionLogs(userId?: string): Promise<ProductionLog[]> {
    try {
      if (userId) {
        return await prisma.productionLog.findMany({
          where: { userId },
          orderBy: { startTime: 'desc' },
        }) as unknown as ProductionLog[];
      } else {
        return await prisma.productionLog.findMany({
          orderBy: { startTime: 'desc' },
        }) as unknown as ProductionLog[];
      }
    } catch (error) {
      console.error('Error getting production logs:', error);
      return [];
    }
  }
}

export const dbService = new DatabaseService();