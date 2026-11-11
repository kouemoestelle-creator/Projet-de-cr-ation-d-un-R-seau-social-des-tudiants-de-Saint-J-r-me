import pg from 'pg';
import { config } from './config.js';

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
  max: 10,
});

// Toutes les requêtes sont paramétrées ($1, $2…) : jamais de texte utilisateur collé dans le SQL.
export const query = (text, params) => pool.query(text, params);
