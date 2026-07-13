import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const VERSION = 'v1';
const ALGORITHM = 'aes-256-gcm';

export function encryptJson(value: unknown, secret: string): string {
  const iv = randomBytes(12);
  const key = keyFromSecret(secret);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString('base64url'),
    tag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.');
}

export function decryptJson<T>(encrypted: string, secret: string): T {
  const [version, iv, tag, ciphertext] = encrypted.split('.');
  if (version !== VERSION || !iv || !tag || !ciphertext) {
    throw new Error('Unsupported encrypted Epic grant format.');
  }
  const decipher = createDecipheriv(ALGORITHM, keyFromSecret(secret), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64url')),
    decipher.final(),
  ]);
  return JSON.parse(plaintext.toString('utf8')) as T;
}

function keyFromSecret(secret: string): Buffer {
  return createHash('sha256').update(secret, 'utf8').digest();
}

