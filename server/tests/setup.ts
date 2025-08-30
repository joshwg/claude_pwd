import { beforeAll } from 'vitest';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Ensure we're using a test database
if (!process.env.DATABASE_URL?.includes('test')) {
  console.warn('Warning: Not using a test database URL');
}
