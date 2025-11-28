import crypto from 'crypto';

const AES_ALGO = 'aes-256-gcm';
const PBKDF2_ITERATIONS = 150000;
const PBKDF2_KEYLEN = 32;
const PBKDF2_DIGEST = 'sha512';

export interface AesEncryptedPayload {
  iv: string;
  authTag: string;
  ciphertext: string;
}

export function generateAesKey(): Buffer {
  // 256-bit random key, must be unique per file
  return crypto.randomBytes(32);
}

export function aesEncrypt(plaintext: Buffer, key: Buffer): AesEncryptedPayload {
  const iv = crypto.randomBytes(12); // GCM recommended IV length
  const cipher = crypto.createCipheriv(AES_ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    ciphertext: ciphertext.toString('base64')
  };
}

export function aesDecrypt(payload: AesEncryptedPayload, key: Buffer): Buffer {
  const iv = Buffer.from(payload.iv, 'base64');
  const authTag = Buffer.from(payload.authTag, 'base64');
  const ciphertext = Buffer.from(payload.ciphertext, 'base64');

  const decipher = crypto.createDecipheriv(AES_ALGO, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function generateRsaKeyPair(): { publicKeyPem: string; privateKeyPem: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  return { publicKeyPem: publicKey, privateKeyPem: privateKey };
}

export function rsaEncryptAesKey(aesKey: Buffer, publicKeyPem: string): string {
  const ciphertext = crypto.publicEncrypt(
    {
      key: publicKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    aesKey
  );
  return ciphertext.toString('base64');
}

export function rsaDecryptAesKey(encryptedKeyB64: string, privateKeyPem: string): Buffer {
  const encrypted = Buffer.from(encryptedKeyB64, 'base64');
  const plaintext = crypto.privateDecrypt(
    {
      key: privateKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    encrypted
  );
  return plaintext;
}

export function deriveKeyFromPassword(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST);
}

export function encryptPrivateKeyWithPassword(
  privateKeyPem: string,
  password: string
): { ciphertextB64: string; saltB64: string; ivB64: string } {
  const salt = crypto.randomBytes(16);
  const key = deriveKeyFromPassword(password, salt);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(AES_ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(privateKeyPem, 'utf8')), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const payload = Buffer.concat([authTag, ciphertext]);
  return {
    ciphertextB64: payload.toString('base64'),
    saltB64: salt.toString('base64'),
    ivB64: iv.toString('base64')
  };
}

export function decryptPrivateKeyWithPassword(
  ciphertextB64: string,
  password: string,
  saltB64: string,
  ivB64: string
): string {
  const salt = Buffer.from(saltB64, 'base64');
  const key = deriveKeyFromPassword(password, salt);
  const iv = Buffer.from(ivB64, 'base64');
  const payload = Buffer.from(ciphertextB64, 'base64');
  const authTag = payload.subarray(0, 16);
  const ciphertext = payload.subarray(16);
  const decipher = crypto.createDecipheriv(AES_ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}


