import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const { Pool } = pg;

// Connection to PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/homestay',
});

// Initialize database schema
export const initDb = async () => {
  try {
    const schemaSql = fs.readFileSync(path.join(process.cwd(), 'server', 'schema.sql'), 'utf8');
    await pool.query(schemaSql);
    console.log('Database schema initialized.');
  } catch (err) {
    console.error('Failed to initialize database schema:', err);
  }
};

export default pool;
