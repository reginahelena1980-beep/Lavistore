import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

/**
 * =====================================================================
 * LAVISTORE ADMIN AUTHENTICATION MODULE (BACKEND / SERVERLESS ONLY)
 * =====================================================================
 * This module runs exclusively on the backend (Vercel Serverless / Node).
 * NEVER expose service account credentials, ADMIN_SESSION_SECRET, or
 * password hashes to the frontend.
 */

export const ADMIN_SESSION_COOKIE_NAME = 'lavistore_admin_session';
export const ADMIN_RECOVERY_COOKIE_NAME = 'lavistore_admin_recovery';

export const ADMIN_SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours
export const ADMIN_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // 28800 seconds

export const ADMIN_RECOVERY_DURATION_MS = 15 * 60 * 1000; // 15 minutes
export const ADMIN_RECOVERY_MAX_AGE_SECONDS = 15 * 60; // 900 seconds

const ADMIN_PASSWORD_SALT_BYTES = 16;
const ADMIN_PASSWORD_KEY_LENGTH = 64;

// Cache instances during serverless execution life cycle
let cachedApp: App | null = null;
let cachedFirestore: Firestore | null = null;

/**
 * Safely normalizes private key from environment variables.
 * Handles escaped newlines and accidental wrapping quotes.
 */
export function normalizePrivateKey(rawKey?: string): string | undefined {
  if (!rawKey) return undefined;
  let key = rawKey.trim();

  // Strip wrapping single or double quotes
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  // Normalize escaped newlines
  key = key.replace(/\\n/g, '\n');
  return key;
}

/**
 * Idempotently initializes the Firebase Admin SDK.
 * Fails closed if required credentials are missing.
 */
export function getFirebaseAdminApp(): App | null {
  if (cachedApp) {
    return cachedApp;
  }

  const existingApps = getApps();
  if (existingApps.length > 0 && existingApps[0]) {
    cachedApp = existingApps[0];
    return cachedApp;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
  const privateKey = normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  try {
    cachedApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey
      }),
      projectId
    });
    return cachedApp;
  } catch (err: any) {
    console.error('[Firebase Admin] Initialization failure:', err?.message || err);
    return null;
  }
}

/**
 * Retrieves the Firestore instance from Firebase Admin.
 * Fails closed if Firebase Admin is not initialized.
 */
export function getAdminFirestore(): Firestore | null {
  if (cachedFirestore) {
    return cachedFirestore;
  }

  const app = getFirebaseAdminApp();
  if (!app) {
    return null;
  }

  try {
    cachedFirestore = getFirestore(app);
    return cachedFirestore;
  } catch (err: any) {
    console.error('[Firebase Admin Firestore] Error:', err?.message || err);
    return null;
  }
}

/**
 * Interface representing the private admin authentication document in Firestore.
 * Path: private_admin/auth
 */
export interface AdminAuthDocData {
  adminPasswordHash?: string;
  adminPasswordChanged?: boolean;
  adminPasswordChangedAt?: string;
  updatedAt?: string;
}

/**
 * Hashes an administrative password using scrypt.
 * Output format: scrypt:<saltHex>:<derivedKeyHex>
 */
export function hashAdminPassword(password: string): string {
  const salt = crypto.randomBytes(ADMIN_PASSWORD_SALT_BYTES);
  const derivedKey = crypto.scryptSync(
    password,
    salt,
    ADMIN_PASSWORD_KEY_LENGTH
  );
  return `scrypt:${salt.toString('hex')}:${derivedKey.toString('hex')}`;
}

/**
 * Verifies a plaintext password against a stored scrypt hash.
 * Uses crypto.timingSafeEqual to prevent timing attacks.
 */
export function verifyAdminPasswordHash(
  password: string,
  storedHash: string
): boolean {
  try {
    const [algorithm, saltHex, hashHex] = storedHash.split(':');

    if (algorithm !== 'scrypt' || !saltHex || !hashHex) {
      return false;
    }

    const salt = Buffer.from(saltHex, 'hex');
    const storedKey = Buffer.from(hashHex, 'hex');

    if (storedKey.length !== ADMIN_PASSWORD_KEY_LENGTH) {
      return false;
    }

    const derivedKey = crypto.scryptSync(
      password,
      salt,
      ADMIN_PASSWORD_KEY_LENGTH
    );

    return crypto.timingSafeEqual(storedKey, derivedKey);
  } catch {
    return false;
  }
}

/**
 * Searches server-side data files for an existing scrypt-hashed password.
 * Used exclusively for controlled first-deployment initialization when
 * Firestore does not yet contain a valid hash.
 * NEVER reads or converts plaintext passwords.
 */
function findServerHashedCredential(): {
  adminPasswordHash: string;
  adminPasswordChanged: boolean;
  adminPasswordChangedAt?: string;
} | null {
  const candidateFiles = [
    path.join(process.cwd(), 'persistent_data', 'admin_persistent_settings.json'),
    path.join(process.cwd(), 'persistent_data', 'store_state.json'),
    path.join(process.cwd(), 'src', 'data', 'admin_persistent_vault.json')
  ];

  for (const filePath of candidateFiles) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);
        if (
          typeof data?.adminPasswordHash === 'string' &&
          data.adminPasswordHash.startsWith('scrypt:')
        ) {
          return {
            adminPasswordHash: data.adminPasswordHash,
            adminPasswordChanged: Boolean(data.adminPasswordChanged),
            adminPasswordChangedAt: data.adminPasswordChangedAt
          };
        }
      }
    } catch {
      // Continue search
    }
  }

  return null;
}

/**
 * Retrieves the current administrative credential from Firestore (private_admin/auth).
 * If Firestore has no document yet, attempts controlled migration of an existing
 * valid hash from server-side persistent files.
 * Fails safely (returns null) if no valid hash exists.
 */
export async function getAdminCredential(): Promise<{
  adminPasswordHash: string;
  adminPasswordChanged: boolean;
  adminPasswordChangedAt?: string;
} | null> {
  const firestore = getAdminFirestore();

  if (firestore) {
    try {
      const docRef = firestore.collection('private_admin').doc('auth');
      const snap = await docRef.get();
      if (snap.exists) {
        const data = snap.data() as AdminAuthDocData;
        if (
          typeof data?.adminPasswordHash === 'string' &&
          data.adminPasswordHash.startsWith('scrypt:')
        ) {
          return {
            adminPasswordHash: data.adminPasswordHash,
            adminPasswordChanged: Boolean(data.adminPasswordChanged),
            adminPasswordChangedAt: data.adminPasswordChangedAt
          };
        }
      }

      // First deployment migration: check for an existing valid hashed credential
      const existingServerHash = findServerHashedCredential();
      if (existingServerHash) {
        const now = new Date().toISOString();
        const payloadToMigrate: AdminAuthDocData = {
          adminPasswordHash: existingServerHash.adminPasswordHash,
          adminPasswordChanged: existingServerHash.adminPasswordChanged,
          adminPasswordChangedAt: existingServerHash.adminPasswordChangedAt || now,
          updatedAt: now
        };
        await docRef.set(payloadToMigrate, { merge: true });
        return existingServerHash;
      }
    } catch (err: any) {
      console.error('[Admin Credential] Firestore retrieval error:', err?.message || err);
    }
  } else {
    // If Firebase Admin credentials are not yet set in environment, check server file for hash
    const existingServerHash = findServerHashedCredential();
    if (existingServerHash) {
      return existingServerHash;
    }
  }

  return null;
}

/**
 * Persists a new scrypt-hashed password to private_admin/auth in Firestore.
 */
export async function persistNewAdminPassword(newPassword: string): Promise<boolean> {
  if (typeof newPassword !== 'string' || newPassword.trim().length < 8) {
    return false;
  }

  const passwordHash = hashAdminPassword(newPassword.trim());
  const now = new Date().toISOString();
  const firestore = getAdminFirestore();

  if (!firestore) {
    console.error('[Admin Password] Firebase Admin Firestore not configured.');
    return false;
  }

  try {
    const docRef = firestore.collection('private_admin').doc('auth');
    await docRef.set(
      {
        adminPasswordHash: passwordHash,
        adminPasswordChanged: true,
        adminPasswordChangedAt: now,
        updatedAt: now
      },
      { merge: true }
    );
    return true;
  } catch (err: any) {
    console.error('[Admin Password] Firestore persistence failure:', err?.message || err);
    return false;
  }
}

/**
 * =====================================================================
 * STATELESS ADMIN SESSION MANAGEMENT (HMAC-SHA256)
 * =====================================================================
 */

export interface AdminSessionPayload {
  role: 'admin';
  iat: number;
  exp: number;
}

export function getAdminSessionSecret(): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (!secret || secret.length === 0) {
    return null;
  }
  return secret;
}

export function createSignedAdminSession(): string | null {
  const secret = getAdminSessionSecret();
  if (!secret) {
    return null;
  }

  const now = Date.now();
  const payload: AdminSessionPayload = {
    role: 'admin',
    iat: now,
    exp: now + ADMIN_SESSION_DURATION_MS
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${signature}`;
}

export function verifyAdminSessionToken(token: string): {
  valid: boolean;
  payload: AdminSessionPayload | null;
} {
  if (!token || typeof token !== 'string') {
    return { valid: false, payload: null };
  }

  const secret = getAdminSessionSecret();
  if (!secret) {
    return { valid: false, payload: null };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, payload: null };
  }

  const [payloadB64, signature] = parts;
  if (!payloadB64 || !signature) {
    return { valid: false, payload: null };
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payloadB64)
    .digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return { valid: false, payload: null };
  }

  try {
    const rawPayload = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    const parsed = JSON.parse(rawPayload);

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      parsed.role !== 'admin' ||
      typeof parsed.iat !== 'number' ||
      typeof parsed.exp !== 'number'
    ) {
      return { valid: false, payload: null };
    }

    if (Date.now() > parsed.exp) {
      return { valid: false, payload: null };
    }

    return { valid: true, payload: parsed };
  } catch {
    return { valid: false, payload: null };
  }
}

/**
 * =====================================================================
 * STATELESS PASSWORD RECOVERY (HMAC-SHA256 COOKIE-BASED)
 * =====================================================================
 */

export interface AdminRecoveryPayload {
  purpose: 'admin-password-recovery';
  email: string;
  codeHash: string;
  iat: number;
  exp: number;
}

export function computeRecoveryCodeHash(code: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(`admin-recovery-code-salt:${code.trim()}`)
    .digest('hex');
}

export function createSignedRecoveryToken(email: string, code: string): string | null {
  const secret = getAdminSessionSecret();
  if (!secret) {
    return null;
  }

  const now = Date.now();
  const codeHash = computeRecoveryCodeHash(code, secret);

  const payload: AdminRecoveryPayload = {
    purpose: 'admin-password-recovery',
    email: email.trim().toLowerCase(),
    codeHash,
    iat: now,
    exp: now + ADMIN_RECOVERY_DURATION_MS
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${signature}`;
}

export function verifyRecoveryToken(
  token: string,
  enteredCode: string
): { valid: boolean; email?: string } {
  if (!token || typeof token !== 'string') {
    return { valid: false };
  }

  const secret = getAdminSessionSecret();
  if (!secret) {
    return { valid: false };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false };
  }

  const [payloadB64, signature] = parts;
  if (!payloadB64 || !signature) {
    return { valid: false };
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payloadB64)
    .digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return { valid: false };
  }

  try {
    const rawPayload = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    const parsed = JSON.parse(rawPayload);

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      parsed.purpose !== 'admin-password-recovery' ||
      typeof parsed.codeHash !== 'string' ||
      typeof parsed.exp !== 'number'
    ) {
      return { valid: false };
    }

    if (Date.now() > parsed.exp) {
      return { valid: false };
    }

    // Hash submitted code and compare securely
    const submittedHash = computeRecoveryCodeHash(enteredCode, secret);
    const submittedBuf = Buffer.from(submittedHash, 'hex');
    const expectedHashBuf = Buffer.from(parsed.codeHash, 'hex');

    if (
      submittedBuf.length !== expectedHashBuf.length ||
      !crypto.timingSafeEqual(submittedBuf, expectedHashBuf)
    ) {
      return { valid: false };
    }

    return { valid: true, email: parsed.email };
  } catch {
    return { valid: false };
  }
}

export function hasActiveRecoveryToken(token?: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  const secret = getAdminSessionSecret();
  if (!secret) return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [payloadB64, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payloadB64)
    .digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return false;
  }

  try {
    const raw = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    const parsed = JSON.parse(raw);
    return parsed?.purpose === 'admin-password-recovery' && Date.now() < parsed?.exp;
  } catch {
    return false;
  }
}

/**
 * =====================================================================
 * COOKIE & HTTP UTILITIES
 * =====================================================================
 */

export function parseCookies(cookieHeader?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const key = parts.shift()?.trim();
    if (key) {
      const val = parts.join('=').trim();
      try {
        list[key] = decodeURIComponent(val);
      } catch {
        list[key] = val;
      }
    }
  });
  return list;
}

export function serializeCookie(
  name: string,
  value: string,
  options: {
    maxAge?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'lax' | 'strict' | 'none';
    path?: string;
  } = {}
): string {
  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path || '/'}`);

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }

  if (options.httpOnly !== false) {
    parts.push('HttpOnly');
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const secure = options.secure !== undefined ? options.secure : isProduction;
  if (secure) {
    parts.push('Secure');
  }

  const sameSite = options.sameSite || 'lax';
  parts.push(`SameSite=${sameSite.charAt(0).toUpperCase() + sameSite.slice(1)}`);

  return parts.join('; ');
}

export function getAdminSessionFromCookies(req: any): string | null {
  const cookies = parseCookies(req.headers?.cookie);
  return cookies[ADMIN_SESSION_COOKIE_NAME] || null;
}

export function getRecoveryTokenFromCookies(req: any): string | null {
  const cookies = parseCookies(req.headers?.cookie);
  return cookies[ADMIN_RECOVERY_COOKIE_NAME] || null;
}

export function buildSessionCookie(token: string): string {
  return serializeCookie(ADMIN_SESSION_COOKIE_NAME, token, {
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    httpOnly: true,
    sameSite: 'lax',
    path: '/'
  });
}

export function buildClearSessionCookie(): string {
  return serializeCookie(ADMIN_SESSION_COOKIE_NAME, '', {
    maxAge: 0,
    httpOnly: true,
    sameSite: 'lax',
    path: '/'
  });
}

export function buildRecoveryCookie(token: string): string {
  return serializeCookie(ADMIN_RECOVERY_COOKIE_NAME, token, {
    maxAge: ADMIN_RECOVERY_MAX_AGE_SECONDS,
    httpOnly: true,
    sameSite: 'lax',
    path: '/'
  });
}

export function buildClearRecoveryCookie(): string {
  return serializeCookie(ADMIN_RECOVERY_COOKIE_NAME, '', {
    maxAge: 0,
    httpOnly: true,
    sameSite: 'lax',
    path: '/'
  });
}

/**
 * Parse JSON body cleanly in Vercel serverless environment.
 */
export function parseRequestBody(req: any): any {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return {};
    }
  }
  return typeof body === 'object' && body !== null ? body : {};
}

/**
 * Standardized JSON response sender compatible with Vercel and Express.
 */
export function sendResponse(
  res: any,
  statusCode: number,
  data: any,
  headers?: Record<string, string | string[]>
) {
  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      res.setHeader(key, value);
    }
  }

  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(data);
  }

  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.end(JSON.stringify(data));
}

/**
 * Sets one or more cookies onto the response.
 */
export function setCookies(res: any, cookies: string[]) {
  const existing = res.getHeader('Set-Cookie');
  let current: string[] = [];
  if (Array.isArray(existing)) {
    current = [...existing];
  } else if (typeof existing === 'string') {
    current = [existing];
  }
  res.setHeader('Set-Cookie', [...current, ...cookies]);
}

/**
 * =====================================================================
 * EMAIL RECOVERY CONFIGURATION & DISPATCH (NODEMAILER)
 * =====================================================================
 */

export function resolveSmtpConfig() {
  const rawHost = process.env.SMTP_HOST?.trim() || '';
  const user = process.env.SMTP_USER?.trim() || '';
  const pass = process.env.SMTP_PASS?.trim() || '';
  let port = Number(process.env.SMTP_PORT) || 587;
  let secure = process.env.SMTP_SECURE === 'true' || port === 465;
  let host = rawHost;

  if (host.includes('@')) {
    const domain = host.split('@')[1]?.toLowerCase().trim();
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
      host = 'smtp.gmail.com';
    } else if (domain === 'outlook.com' || domain === 'hotmail.com' || domain === 'live.com') {
      host = 'smtp-mail.outlook.com';
      port = 587;
      secure = false;
    } else if (domain === 'yahoo.com' || domain === 'yahoo.com.br') {
      host = 'smtp.mail.yahoo.com';
    } else if (domain) {
      host = `smtp.${domain}`;
    }
  }

  if (host.toLowerCase() === 'gmail' || host.toLowerCase() === 'gmail.com') {
    host = 'smtp.gmail.com';
  }

  if (!host && user.toLowerCase().endsWith('@gmail.com')) {
    host = 'smtp.gmail.com';
  }

  if (host.toLowerCase() === 'smtp.gmail.com') {
    if (port !== 465 && port !== 587) {
      port = 587;
    }
    if (port === 465) {
      secure = true;
    }
  }

  return { host, port, secure, user, pass, rawHost };
}

export function createMailTransporter() {
  const { host, port, secure, user, pass } = resolveSmtpConfig();

  if (host && user && pass) {
    return {
      transporter: nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        tls: { rejectUnauthorized: false }
      }),
      isConfigured: true,
      resolvedHost: host,
      user
    };
  }

  return {
    transporter: null,
    isConfigured: false,
    resolvedHost: host || null,
    user: user || null
  };
}

export async function getAdminEmails(): Promise<{
  primaryEmail: string;
  allowedEmails: string[];
  storeEmailConfigured: boolean;
}> {
  const envStoreEmail = process.env.STORE_EMAIL?.trim().toLowerCase();
  const emails: string[] = [];

  if (envStoreEmail) {
    emails.push(envStoreEmail);
  }

  // Check Firestore configuration if accessible
  const firestore = getAdminFirestore();
  if (firestore) {
    try {
      const snap = await firestore.collection('settings').doc('store_config').get();
      if (snap.exists) {
        const data = snap.data() as any;
        const cfg = data?.homePageConfig || data;
        if (cfg?.orderNotificationEmail?.trim()) {
          emails.push(cfg.orderNotificationEmail.trim().toLowerCase());
        }
        if (cfg?.contactEmail?.trim()) {
          emails.push(cfg.contactEmail.trim().toLowerCase());
        }
      }
    } catch {
      // Continue to check local file fallback
    }
  }

  // Check local data files fallback
  const candidateFiles = [
    path.join(process.cwd(), 'persistent_data', 'admin_persistent_settings.json'),
    path.join(process.cwd(), 'persistent_data', 'store_state.json'),
    path.join(process.cwd(), 'src', 'data', 'store_state.json')
  ];

  for (const sFile of candidateFiles) {
    try {
      if (fs.existsSync(sFile)) {
        const raw = fs.readFileSync(sFile, 'utf-8');
        const data = JSON.parse(raw);
        const cfg = data?.homePageConfig || data;
        if (cfg?.orderNotificationEmail?.trim()) {
          emails.push(cfg.orderNotificationEmail.trim().toLowerCase());
        }
        if (cfg?.contactEmail?.trim()) {
          emails.push(cfg.contactEmail.trim().toLowerCase());
        }
      }
    } catch {
      // Continue
    }
  }

  const unique = Array.from(
    new Set(emails.map(e => e.trim().toLowerCase()).filter(Boolean))
  );

  return {
    primaryEmail: unique[0] || '',
    allowedEmails: unique,
    storeEmailConfigured: unique.length > 0
  };
}

export function maskEmail(email: string): string {
  if (!email) return '';
  const [user, domain] = email.split('@');
  if (!domain) return '';
  const visible = user.length <= 3 ? user.slice(0, 1) : user.slice(0, 3);
  return `${visible}***@${domain}`;
}
