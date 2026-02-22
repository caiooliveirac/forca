import { query } from '../config/database';
import type { UserRow } from '../types';

export const findByEmail = async (
  email: string,
): Promise<UserRow | null> => {
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  return (result.rows[0] as UserRow) ?? null;
};

export const findById = async (id: string): Promise<UserRow | null> => {
  const result = await query('SELECT * FROM users WHERE id = $1', [id]);
  return (result.rows[0] as UserRow) ?? null;
};

export const create = async (
  email: string,
  passwordHash: string,
  displayName: string,
): Promise<UserRow> => {
  const result = await query(
    `INSERT INTO users (email, password_hash, display_name)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [email, passwordHash, displayName],
  );
  return result.rows[0] as UserRow;
};

export const updateById = async (
  id: string,
  fields: { displayName?: string },
): Promise<UserRow | null> => {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (fields.displayName !== undefined) {
    setClauses.push(`display_name = $${idx++}`);
    values.push(fields.displayName);
  }

  if (setClauses.length === 0) {
    return findById(id);
  }

  values.push(id);
  const result = await query(
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
    values,
  );
  return (result.rows[0] as UserRow) ?? null;
};
