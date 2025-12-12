export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function encryptMessage(message: string, password: string): string {
  const key = password.padEnd(16, '0').slice(0, 16);
  let encrypted = '';
  for (let i = 0; i < message.length; i++) {
    const charCode = message.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    encrypted += String.fromCharCode(charCode);
  }
  return btoa(encrypted);
}

export function decryptMessage(encryptedMessage: string, password: string): string {
  try {
    const key = password.padEnd(16, '0').slice(0, 16);
    const encrypted = atob(encryptedMessage);
    let decrypted = '';
    for (let i = 0; i < encrypted.length; i++) {
      const charCode = encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      decrypted += String.fromCharCode(charCode);
    }
    return decrypted;
  } catch {
    return '[Encrypted Message]';
  }
}
