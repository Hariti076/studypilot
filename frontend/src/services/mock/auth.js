/**
 * Mock auth backend, stored in localStorage. DEMO ONLY — a real backend must hash passwords
 * server-side (bcrypt/argon2) and issue real tokens. Same response shape as the real API:
 *   { token, user: { id, name, email } }
 */
import { ApiError } from '../http';

const USERS_KEY = 'sp:users';
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const readUsers = () => {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  } catch {
    return [];
  }
};
const writeUsers = (users) => localStorage.setItem(USERS_KEY, JSON.stringify(users));

const rand = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

async function hash(password) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`sp-salt:${password}`));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return `plain:${password}`; // crypto.subtle needs a secure context (https / localhost)
  }
}

const toSession = (u) => ({ token: `mock.${rand()}`, user: { id: u.id, name: u.name, email: u.email } });

export async function mockSignup({ name, email, password }) {
  await delay(600);
  const users = readUsers();
  const e = email.trim().toLowerCase();
  if (users.some((u) => u.email === e)) {
    throw new ApiError('An account with this email already exists. Try logging in instead.', { status: 409 });
  }
  const user = { id: rand(), name: name.trim(), email: e, passwordHash: await hash(password) };
  writeUsers([...users, user]);
  return toSession(user);
}

export async function mockLogin({ email, password }) {
  await delay(500);
  const e = email.trim().toLowerCase();
  const user = readUsers().find((u) => u.email === e);
  if (!user || user.passwordHash !== (await hash(password))) {
    throw new ApiError('Invalid email or password.', { status: 401 });
  }
  return toSession(user);
}
