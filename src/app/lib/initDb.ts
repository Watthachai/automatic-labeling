import { dbService } from '../services/DatabaseService';

export const initializeDatabase = async () => {
  try {
    await dbService.addUser({
      username: 'admin',
      password: 'admin123', // Change this in production
      role: 'admin',
      hospitalId: 'HOSP001'
    });
    console.log('Database initialized successfully');
  } catch (err) {
    console.log('Admin user already exists or initialization failed:', err);
  }
};