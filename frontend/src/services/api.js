/**
 * Single entry point for all backend calls. Components never call fetch directly.
 *
 * Accounts stay in this browser (see services/mock/auth.js).
 * Scores, risk, persona, and the weekly plan always come from the FastAPI service:
 *
 *   POST /api/predict   profile  -> prediction
 *   POST /api/plan      { profile, prediction } -> { plan, generatedAt }
 *
 * Errors are thrown as ApiError with a user-presentable `message`.
 */
import { request } from './http';
import { mockLogin, mockSignup } from './mock/auth';

export async function loginUser({ email, password }) {
  return mockLogin({ email, password });
}

export async function signupUser({ name, email, password }) {
  return mockSignup({ name, email, password });
}

export async function predictStudent(profile) {
  return request('/api/predict', { method: 'POST', body: profile, auth: false });
}

export async function generatePlan({ profile, prediction }) {
  return request('/api/plan', { method: 'POST', body: { profile, prediction }, auth: false });
}
