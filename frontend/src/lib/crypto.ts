const encoder = new TextEncoder();
const decoder = new TextDecoder();

const PBKDF2_ITERATIONS = 150000;

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binaryString = atob(b64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function concatArrayBuffers(buffer1: ArrayBuffer, buffer2: ArrayBuffer): ArrayBuffer {
  const arr1 = new Uint8Array(buffer1);
  const arr2 = new Uint8Array(buffer2);
  const combined = new Uint8Array(arr1.length + arr2.length);
  combined.set(arr1, 0);
  combined.set(arr2, arr1.length);
  return combined.buffer;
}

async function derivePrivateKey(password: string, salt: ArrayBuffer) {
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-512'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
}

export async function decryptPrivateKeyPem(
  encryptedPrivateKey: string,
  saltB64: string,
  ivB64: string,
  password: string
): Promise<string> {
  const salt = base64ToArrayBuffer(saltB64);
  const iv = base64ToArrayBuffer(ivB64);
  const payload = base64ToArrayBuffer(encryptedPrivateKey);
  const authTag = payload.slice(0, 16);
  const ciphertext = payload.slice(16);
  const ciphertextWithTag = concatArrayBuffers(ciphertext, authTag);
  const key = await derivePrivateKey(password, salt);
  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    key,
    ciphertextWithTag
  );
  return decoder.decode(decrypted);
}

function pemToArrayBuffer(pem: string) {
  const normalized = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');
  return base64ToArrayBuffer(normalized);
}

export function arrayBufferToBlob(buffer: ArrayBuffer, mimeType: string) {
  return new Blob([buffer], { type: mimeType });
}

export async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const binaryDer = pemToArrayBuffer(pem);
  return window.crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256'
    },
    false,
    ['decrypt']
  );
}

export async function decryptFileAesKey(
  encryptedKeyB64: string,
  privateKey: CryptoKey
): Promise<CryptoKey> {
  const encryptedBuffer = base64ToArrayBuffer(encryptedKeyB64);
  const rawKey = await window.crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    encryptedBuffer
  );
  return window.crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['decrypt']);
}

export async function decryptFileContents(
  encryptedBuffer: ArrayBuffer,
  aesKey: CryptoKey,
  ivB64: string,
  authTagB64: string
): Promise<ArrayBuffer> {
  const iv = base64ToArrayBuffer(ivB64);
  const authTag = base64ToArrayBuffer(authTagB64);
  const ciphertextWithTag = concatArrayBuffers(encryptedBuffer, authTag);
  return window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    aesKey,
    ciphertextWithTag
  );
}


