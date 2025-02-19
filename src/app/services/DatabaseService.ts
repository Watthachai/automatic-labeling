// src/app/services/DatabaseService.ts
export interface User {
    id: number;
    username: string;
    password: string; // In production, use proper password hashing
    role: 'operator' | 'admin';
    hospitalId: string;
  }
  
  export interface ProductionLog {
    id?: number;
    userId: number;
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
  }
  
  class DatabaseService {
    private dbName = 'hospitalProductionDB';
    private version = 1;
  
    async initDB() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.version);
  
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
  
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
  
          // Create users store
          if (!db.objectStoreNames.contains('users')) {
            const userStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
            userStore.createIndex('username', 'username', { unique: true });
          }
  
          // Create production logs store
          if (!db.objectStoreNames.contains('productionLogs')) {
            const logStore = db.createObjectStore('productionLogs', { keyPath: 'id', autoIncrement: true });
            logStore.createIndex('userId', 'userId');
            logStore.createIndex('date', 'date');
          }
        };
      });
    }
  
    async addUser(user: Omit<User, 'id'>): Promise<number> {
      const db = await this.initDB() as IDBDatabase;
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['users'], 'readwrite');
        const store = transaction.objectStore('users');
        const request = store.add(user);
  
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
      });
    }
  
    async getUser(username: string, password: string): Promise<User | null> {
      const db = await this.initDB() as IDBDatabase;
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['users'], 'readonly');
        const store = transaction.objectStore('users');
        const index = store.index('username');
        const request = index.get(username);
  
        request.onsuccess = () => {
          const user = request.result;
          if (user && user.password === password) {
            resolve(user);
          } else {
            resolve(null);
          }
        };
        request.onerror = () => reject(request.error);
      });
    }
  
    async addProductionLog(log: Omit<ProductionLog, 'id'>): Promise<number> {
      const db = await this.initDB() as IDBDatabase;
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['productionLogs'], 'readwrite');
        const store = transaction.objectStore('productionLogs');
        const request = store.add(log);
  
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
      });
    }
  
    async getProductionLogs(userId?: number): Promise<ProductionLog[]> {
      const db = await this.initDB() as IDBDatabase;
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['productionLogs'], 'readonly');
        const store = transaction.objectStore('productionLogs');
        const request = userId 
          ? store.index('userId').getAll(userId)
          : store.getAll();
  
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
  }
  
  export const dbService = new DatabaseService();