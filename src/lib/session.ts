// Utilitário de Sessão Seguro (Compatível com Edge Runtime) usando Web Crypto API nativo
const SECRET_KEY = process.env.SESSION_SECRET || 'sgo-super-secret-key-2026-fallback';
const encoder = new TextEncoder();

export interface SessionPayload {
  matricula: string;
  cargo: 'ADMIN' | 'EQUIPE';
  equipeId?: string;
  name?: string;
  exp: number; // Expiration timestamp em ms
  [key: string]: any;
}

// Helper para converter string para base64url
function toBase64Url(str: string): string {
  if (typeof btoa !== 'undefined') {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  return Buffer.from(str).toString('base64url');
}

// Helper para converter base64url para string
function fromBase64Url(b64: string): string {
  if (typeof atob !== 'undefined') {
    let standardB64 = b64.replace(/-/g, '+').replace(/_/g, '/');
    while (standardB64.length % 4) standardB64 += '=';
    return atob(standardB64);
  }
  return Buffer.from(b64, 'base64url').toString('utf-8');
}

// Prepara a chave de assinatura
async function getCryptoKey(): Promise<CryptoKey> {
  const secretBuffer = encoder.encode(SECRET_KEY);
  return await crypto.subtle.importKey(
    'raw',
    secretBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

// Assina e cria um token seguro
export async function encrypt(payload: Omit<SessionPayload, 'exp'>): Promise<string> {
  const exp = Date.now() + 12 * 60 * 60 * 1000; // 12 horas úteis
  const fullPayload = { ...payload, exp } as SessionPayload;
  
  const payloadStr = JSON.stringify(fullPayload);
  const payloadB64 = toBase64Url(payloadStr);
  
  const key = await getCryptoKey();
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payloadB64)
  );
  
  // Uint8Array para base64url
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const signatureStr = String.fromCharCode(...signatureArray);
  const signatureB64 = toBase64Url(signatureStr);
  
  return `${payloadB64}.${signatureB64}`;
}

// Descriptografa e verifica o token
export async function decrypt(token: string): Promise<SessionPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    
    const [payloadB64, signatureB64] = parts;
    
    const key = await getCryptoKey();
    
    // Verifica a assinatura refazendo-a
    const validSignatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(payloadB64)
    );
    
    const validSignatureArray = Array.from(new Uint8Array(validSignatureBuffer));
    const validSignatureStr = String.fromCharCode(...validSignatureArray);
    const validSignatureB64 = toBase64Url(validSignatureStr);
    
    if (signatureB64 !== validSignatureB64) {
      return null; // Assinatura inválida (Adulterado)
    }
    
    const payloadStr = fromBase64Url(payloadB64);
    const payload = JSON.parse(payloadStr) as SessionPayload;
    
    // Verifica expiração
    if (Date.now() > payload.exp) {
      return null;
    }
    
    return payload;
  } catch (error) {
    return null;
  }
}
