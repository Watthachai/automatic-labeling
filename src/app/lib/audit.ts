import { PrismaClient, AuditLog } from '@prisma/client';

const prisma = new PrismaClient();

export const logAudit = async (
  userId: string,
  action: string,
  details: string,
  productionId?: string,
  ipAddress?: string
): Promise<AuditLog | null> => {
  try {
    // Validate inputs
    if (!userId || !action || !details) {
      console.error('Invalid audit log parameters');
      return null;
    }

    return await prisma.auditLog.create({
      data: {
        userId,
        action,
        details,
        productionId,
        ipAddress: ipAddress || 'unknown'
      }
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
    return null;
  }
};