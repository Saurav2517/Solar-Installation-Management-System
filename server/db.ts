import fs from 'node:fs';
import path from 'node:path';
import { seed } from './seed';
import { demoAccounts } from './auth';
import type { DB } from '../shared/types';

/** Set DATA_DIR to keep the JSON store on a mounted volume (e.g. a Render disk). */
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'db.json');

let db: DB | null = null;

/** Older demo databases were written before logins existed — add them in place. */
function normalize(raw: DB): DB {
  if (!Array.isArray(raw.accounts) || !raw.accounts.length) {
    raw.accounts = demoAccounts(raw.customers ?? []);
  }
  if (!Array.isArray(raw.sessions)) raw.sessions = [];
  return raw;
}

export function getDb(): DB {
  if (db) return db;
  if (fs.existsSync(FILE)) {
    db = normalize(JSON.parse(fs.readFileSync(FILE, 'utf8')) as DB);
  } else {
    db = seed();
    saveDb();
  }
  return db;
}

export function saveDb() {
  if (!db) return;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}

export function resetDb(): DB {
  db = normalize(seed());
  saveDb();
  return db;
}

export function reloadDb(): DB {
  db = fs.existsSync(FILE) ? normalize(JSON.parse(fs.readFileSync(FILE, 'utf8')) as DB) : normalize(seed());
  return db;
}
