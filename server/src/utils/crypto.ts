import crypto from 'crypto';

const SECRET_KEY = process.env.PWD_SECRET_KEY || 'ThisSecretKeyShouldBeChanged';
const ALGORITHM = 'aes-256-cbc';

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function encrypt(text: string, salt: string): string {
  if (!text) return '';
  
  const key = crypto.pbkdf2Sync(SECRET_KEY, salt, 100000, 32, 'sha256');
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedData: string, salt: string): string {
  if (!encryptedData) return '';
  
  const [ivHex, encrypted] = encryptedData.split(':');
  if (!ivHex || !encrypted) return '';
  
  const key = crypto.pbkdf2Sync(SECRET_KEY, salt, 100000, 32, 'sha256');
  const iv = Buffer.from(ivHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
