import { Pool } from 'pg';
import { redisClient } from './redis';
import fs from 'fs';

// Configure SSL for production
const getSslConfig = () => {
  if (process.env.NODE_ENV !== 'production') {
    return false;
  }

  const sslConfig: any = {
    rejectUnauthorized: true,
  };

  // If CA certificate path is provided, use it
  if (process.env.DB_CA_CERT_PATH) {
    try {
      sslConfig.ca = fs.readFileSync(process.env.DB_CA_CERT_PATH).toString();
    } catch (error) {
      console.warn('Failed to read CA certificate, using default certificate validation');
    }
  }

  return sslConfig;
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: getSslConfig(),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const db = {
  query: async (text: string, params?: any[]) => {
    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  },
  
  getClient: async () => {
    const client = await pool.connect();
    const query = client.query;
    const release = client.release;
    
    // Set a timeout of 5 seconds
    const timeout = setTimeout(() => {
      console.error('A client has been checked out for more than 5 seconds!');
    }, 5000);
    
    // Monkey patch the query method to log the queries
    client.query = (...args: any[]) => {
      client.lastQuery = args;
      return query.apply(client, args);
    };
    
    client.release = () => {
      clearTimeout(timeout);
      client.query = query;
      client.release = release;
      return release.apply(client);
    };
    
    return client;
  },
};

export { redisClient };

