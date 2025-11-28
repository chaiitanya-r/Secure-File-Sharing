import crypto from 'crypto';

const WRAP_SECRET = process.env.KEY_WRAP_SECRET || 'dev-wrap-secret-change-me';
const WRAP_KEY = crypto.createHash('sha256').update(WRAP_SECRET).digest();

export interface WrappedKey {
  ciphertext: string;
  iv: string;
  authTag: string;
}

export function wrapKey(key: Buffer): WrappedKey {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', WRAP_KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(key), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64')
  };
}

export function unwrapKey(payload: WrappedKey): Buffer {
  const iv = Buffer.from(payload.iv, 'base64');
  const ciphertext = Buffer.from(payload.ciphertext, 'base64');
  const authTag = Buffer.from(payload.authTag, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', WRAP_KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}


