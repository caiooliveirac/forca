import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export const query = (text: string, params?: unknown[]) =>
  pool.query(text, params);

export const getClient = () => pool.connect();

export default pool;
