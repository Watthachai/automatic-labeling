# Hospital Production System Documentation

## Table of Contents
- [Database Setup](#database-setup)
- [Authentication System](#authentication-system)
- [Two-Factor Authentication](#two-factor-authentication)
- [Security Guidelines](#security-guidelines)
- [Development Setup](#development-setup)

## Database Setup

### PostgreSQL Installation

```bash
# Install PostgreSQL 15
brew install postgresql@15

# Start the service
brew services start postgresql@15

# Verify service is running
brew services list
```

### Database Creation

```sql
-- Connect to PostgreSQL
psql postgres

-- Create database and user
CREATE DATABASE hospital_db;
CREATE USER admin_user WITH ENCRYPTED PASSWORD 'admin';
GRANT ALL PRIVILEGES ON DATABASE hospital_db TO admin_user;
ALTER USER admin_user CREATEDB;
\c hospital_db
GRANT ALL PRIVILEGES ON SCHEMA public TO admin_user;
```

### Environment Configuration

```properties
# filepath: .env.example
DATABASE_URL="postgresql://admin_user:admin@localhost:5432/hospital_db"
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

## Authentication System

### Database Schema

```prisma
// filepath: prisma/schema.prisma
model User {
  id            String    @id @default(cuid())
  username      String    @unique
  password      String
  role          Role      @default(OPERATOR)
  hospitalId    String
  department    String
  phoneNumber   String    
  createdAt     DateTime  @default(now())
  lastLogin     DateTime?
  isActive      Boolean   @default(true)
  is2FAEnabled  Boolean   @default(true)
  productions   Production[]
  auditLogs     AuditLog[]
}

model Production {
  id           String    @id @default(cuid())
  userId       String
  user         User      @relation(fields: [userId], references: [id])
  material     String
  batch        String
  vendorBatch  String
  startTime    DateTime
}
```

## Two-Factor Authentication

### SMS Integration

1. Sign up for a Twilio account at [twilio.com](https://www.twilio.com)
2. Get your Account SID and Auth Token
3. Purchase a phone number
4. Configure environment variables:

```properties
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number
```

### Adding Operators

```typescript
// filepath: scripts/add-operators.ts
const operators = [
  {
    username: 'operator1',
    password: 'secure_password1',
    phoneNumber: '+66812345671',
    department: 'Production',
    hospitalId: 'HOSP001'
  }
  // Add more operators as needed
];
```

## Security Guidelines

### Best Practices

1. **Database Security**
   - Use strong passwords
   - Regular backups
   - Encrypt sensitive data
   - Limit database access

2. **Authentication**
   - Implement 2FA
   - Session management
   - Password policies
   - Regular session timeouts

3. **Access Control**
   - Role-based access
   - Audit logging
   - IP whitelisting
   - Department restrictions

### Production Deployment

1. **Environment Setup**
   - Use production-grade database
   - Configure SSL/TLS
   - Set up firewalls
   - Enable monitoring

2. **Security Measures**
   - Regular security audits
   - Automated backups
   - Incident response plan
   - Access logging

## Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 15
- npm or yarn
- Git

### Initial Setup

```bash
# Clone repository
git clone [repository-url]

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Run migrations
npx prisma migrate dev

# Start development server
npm run dev
```

### Verification Steps

1. Check database connection:
```bash
npx prisma studio
```

2. Verify API endpoints:
```bash
curl http://localhost:3000/api/health
```

3. Test authentication:
- Access login page
- Try 2FA functionality
- Verify user roles

## Troubleshooting

### Common Issues

1. **Database Connection**
```bash
# Check PostgreSQL status
brew services list

# Restart PostgreSQL
brew services restart postgresql@15
```

2. **Permission Issues**
```sql
-- Grant additional permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO admin_user;
```

3. **Migration Issues**
```bash
# Reset database
npx prisma migrate reset

# Apply migrations
npx prisma migrate dev
```

For additional support, contact the development team or system administrator.