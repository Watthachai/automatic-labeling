import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function validatePhoneNumber(phoneNumber: string): boolean {
  // Basic validation for international format
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phoneNumber);
}

async function addOperators() {
  try {
    const operators = [
      {
        username: 'Watthachai',
        password: 'Watthachai2171',
        phoneNumber: '+66803131282', // Thai format
        department: 'Production',
        hospitalId: 'HOSP001'
      },
      {
        username: 'operator2',
        password: 'secure_password2',
        phoneNumber: '+66812345672',
        department: 'Production',
        hospitalId: 'HOSP001'
      },
      // Add more operators as needed
    ];

    for (const operator of operators) {
      // Validate phone number format
      if (!validatePhoneNumber(operator.phoneNumber)) {
        throw new Error(`Invalid phone number format for operator: ${operator.username}`);
      }

      // Verify phone number is not the same as Twilio number
      if (operator.phoneNumber === process.env.TWILIO_PHONE_NUMBER) {
        throw new Error(`Phone number for ${operator.username} cannot be the same as Twilio number`);
      }

      const hashedPassword = await bcrypt.hash(operator.password, 10);
      
      await prisma.user.create({
        data: {
          ...operator,
          password: hashedPassword,
          role: 'OPERATOR',
          isActive: true,
          is2FAEnabled: true
        }
      });
      console.log(`Created operator: ${operator.username}`);
    }

    console.log('All operators added successfully');
  } catch (error) {
    console.error('Error adding operators:', error);
    throw error;
  }
}

addOperators()
  .catch((error) => {
    console.error('Failed to add operators:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });