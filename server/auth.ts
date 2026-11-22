import crypto from 'node:crypto';
import type { Account, Customer, DB, Session } from '../shared/types';

const SESSION_DAYS = 7;

/** Salted SHA-256, stored as `salt:hash`. */
export function hashPassword(password: string, salt = crypto.randomBytes(12).toString('hex')) {
  const hash = crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(candidate, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function publicAccount(account: Account) {
  return {
    id: account.id,
    email: account.email,
    name: account.name,
    role: account.role,
    customerId: account.customerId,
  };
}

/** Demo logins: one admin, plus a customer login for each of the first four customers. */
export function demoAccounts(customers: Customer[]): Account[] {
  const accounts: Account[] = [
    {
      id: 'ACC-ADMIN',
      email: 'admin@sunpower.in',
      name: 'Priya Sharma',
      role: 'admin',
      passwordHash: hashPassword('admin123'),
      createdAt: new Date().toISOString(),
    },
  ];
  for (const customer of customers.slice(0, 4)) {
    if (!customer.email) continue;
    accounts.push({
      id: `ACC-${customer.id}`,
      email: customer.email.toLowerCase(),
      name: customer.name,
      role: 'customer',
      customerId: customer.id,
      passwordHash: hashPassword('customer123'),
      createdAt: customer.createdAt,
    });
  }
  return accounts;
}

export function createSession(db: DB, account: Account): Session {
  const now = new Date();
  const session: Session = {
    token: crypto.randomBytes(24).toString('hex'),
    accountId: account.id,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_DAYS * 86_400_000).toISOString(),
  };
  db.sessions = db.sessions.filter((s) => new Date(s.expiresAt).getTime() > now.getTime());
  db.sessions.push(session);
  return session;
}

export function accountForToken(db: DB, token: string): Account | null {
  if (!token) return null;
  const session = db.sessions.find((s) => s.token === token);
  if (!session || new Date(session.expiresAt).getTime() <= Date.now()) return null;
  return db.accounts.find((a) => a.id === session.accountId) ?? null;
}

export function destroySession(db: DB, token: string) {
  db.sessions = db.sessions.filter((s) => s.token !== token);
}
