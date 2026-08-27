/**
 * AES-256-GCM Cryptographic Vault Engine
 * Provides zero-trust encryption for client API keys and confidential integration tokens.
 * Isomorphic: Uses Web Crypto API in both browser and modern Node.js environments.
 */

function getCrypto(): Crypto {
  if (typeof globalThis !== "undefined" && globalThis.crypto) {
    return globalThis.crypto;
  }
  throw new Error("Web Crypto API is not available in the current environment.");
}

// Generate a random 96-bit (12 byte) IV for AES-GCM
export function generateIV(): Uint8Array {
  const c = getCrypto();
  return c.getRandomValues(new Uint8Array(12));
}

// Convert string / buffer to hex string
export function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const byteArray = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(byteArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Convert hex string to Uint8Array
export function hexToBuffer(hex: string): Uint8Array {
  const match = hex.match(/.{1,2}/g);
  if (!match) return new Uint8Array(0);
  return new Uint8Array(match.map((byte) => parseInt(byte, 16)));
}

// Derive a 256-bit CryptoKey from passphrase / secret
async function getCryptoKey(secretKey: string): Promise<CryptoKey> {
  const c = getCrypto();
  const encoder = new TextEncoder();
  const keyMaterial = await c.subtle.importKey(
    "raw",
    encoder.encode(secretKey.padEnd(32, "#").slice(0, 32)),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return c.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("ixma_operations_vault_salt_2026"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a plaintext payload using AES-256-GCM
 */
export async function encryptVaultPayload(
  plaintext: string,
  passphrase = "ixma_default_client_vault_passphrase"
): Promise<{ ciphertext: string; iv: string }> {
  const c = getCrypto();
  const encoder = new TextEncoder();
  const iv = generateIV();
  const key = await getCryptoKey(passphrase);

  const encryptedBuffer = await c.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encoder.encode(plaintext)
  );

  return {
    ciphertext: bufferToHex(encryptedBuffer),
    iv: bufferToHex(iv),
  };
}

/**
 * Decrypts a ciphertext payload using AES-256-GCM
 */
export async function decryptVaultPayload(
  ciphertextHex: string,
  ivHex: string,
  passphrase = "ixma_default_client_vault_passphrase"
): Promise<string> {
  const c = getCrypto();
  const decoder = new TextDecoder();
  const iv = hexToBuffer(ivHex);
  const encryptedBuffer = hexToBuffer(ciphertextHex);
  const key = await getCryptoKey(passphrase);

  const decryptedBuffer = await c.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encryptedBuffer
  );

  return decoder.decode(decryptedBuffer);
}
