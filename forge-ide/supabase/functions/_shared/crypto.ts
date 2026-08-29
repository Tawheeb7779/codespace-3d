/**
 * Symmetric AES-GCM encryption for storing user-provided AI provider API
 * keys at rest. The key never leaves the server: it is encrypted here with
 * a secret only Edge Functions hold (AI_KEY_ENCRYPTION_SECRET) and is only
 * ever decrypted inside the ai-agent function to call the provider.
 *
 * This protects the key from anyone reading the database directly (e.g.
 * via the dashboard or a leaked service-role query) but the encryption
 * secret itself is a single server-side value — production deployments
 * with stricter requirements should move this to a managed KMS/HSM.
 */

async function deriveKey(secret: string): Promise<CryptoKey> {
  const raw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

export async function encryptSecret(plaintext: string, secret: string): Promise<string> {
  const key = await deriveKey(secret)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext))
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.length)
  return btoa(String.fromCharCode(...combined))
}

export async function decryptSecret(encoded: string, secret: string): Promise<string> {
  const key = await deriveKey(secret)
  const combined = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new TextDecoder().decode(plaintext)
}
