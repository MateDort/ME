'use client'

const STORAGE_KEY = 'cursor_api_keys'
const SALT_KEY = 'cursor_api_salt'
const PASSPHRASE_KEY = 'cursor_api_passphrase'

export type ApiProvider = 'claude' | 'gemini' | 'openai' | 'custom'

interface StoredApiKey {
  value: string
  label?: string
  endpoint?: string
  updatedAt: number
}

export interface ApiKeyRecord {
  provider: ApiProvider
  apiKey: string
  label?: string
  endpoint?: string
  updatedAt: number
}

export interface ProviderDefinition {
  id: ApiProvider
  name: string
  description: string
  placeholder: string
  helper?: string
  allowEndpoint?: boolean
}

export const PROVIDERS: ProviderDefinition[] = [
  {
    id: 'claude',
    name: 'Claude',
    description: 'Anthropic API key for Claude 3.5/3.0 models.',
    placeholder: 'sk-ant-...',
    helper: 'Find it at console.anthropic.com',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    description: 'Google AI Studio key for Gemini 1.5 models.',
    placeholder: 'AIzaSy...',
    helper: 'Create one at makersuite.google.com',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'OpenAI API key for GPT-4+/o3 models.',
    placeholder: 'sk-proj-...',
    helper: 'From platform.openai.com',
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Bring your own endpoint + key for a local or hosted model.',
    placeholder: 'your-secret-key',
    allowEndpoint: true,
    helper: 'Provide a full HTTPS endpoint if needed.',
  },
]

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const isBrowser = typeof window !== 'undefined' && typeof window.crypto !== 'undefined'

function base64Encode(buffer: Uint8Array): string {
  let binary = ''
  buffer.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

function base64Decode(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function getSalt(): Uint8Array {
  if (!isBrowser) return new Uint8Array(16)
  const existing = window.localStorage.getItem(SALT_KEY)
  if (existing) {
    return base64Decode(existing)
  }
  const salt = window.crypto.getRandomValues(new Uint8Array(16))
  window.localStorage.setItem(SALT_KEY, base64Encode(salt))
  return salt
}

export function setSessionPassphrase(passphrase: string) {
  if (!isBrowser) return
  window.sessionStorage.setItem(PASSPHRASE_KEY, passphrase)
}

export function clearSessionPassphrase() {
  if (!isBrowser) return
  window.sessionStorage.removeItem(PASSPHRASE_KEY)
}

export function hasSessionPassphrase(): boolean {
  if (!isBrowser) return false
  return Boolean(window.sessionStorage.getItem(PASSPHRASE_KEY))
}

function getSessionPassphrase(): string {
  if (!isBrowser) return ''
  return window.sessionStorage.getItem(PASSPHRASE_KEY) || ''
}

async function deriveKey(passphrase: string) {
  if (!isBrowser) {
    throw new Error('Crypto APIs are only available in the browser.')
  }
  if (!passphrase) {
    throw new Error('Set a session passphrase to encrypt your API keys.')
  }
  const salt = getSalt()
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

async function encrypt(text: string): Promise<string> {
  const passphrase = getSessionPassphrase()
  const cryptoKey = await deriveKey(passphrase)
  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const cipherBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encoder.encode(text)
  )
  const payload = new Uint8Array(iv.length + cipherBuffer.byteLength)
  payload.set(iv, 0)
  payload.set(new Uint8Array(cipherBuffer), iv.length)
  return base64Encode(payload)
}

async function decrypt(payload: string): Promise<string> {
  const passphrase = getSessionPassphrase()
  const cryptoKey = await deriveKey(passphrase)
  const data = base64Decode(payload)
  const iv = data.slice(0, 12)
  const cipherText = data.slice(12)
  const plainBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    cipherText
  )
  return decoder.decode(plainBuffer)
}

function getStoredMap(): Record<ApiProvider, StoredApiKey> {
  if (!isBrowser) return {} as Record<ApiProvider, StoredApiKey>
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return {} as Record<ApiProvider, StoredApiKey>
  try {
    return JSON.parse(raw)
  } catch {
    return {} as Record<ApiProvider, StoredApiKey>
  }
}

function setStoredMap(map: Record<ApiProvider, StoredApiKey>) {
  if (!isBrowser) return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

export async function saveApiKey(
  provider: ApiProvider,
  apiKey: string,
  options?: { label?: string; endpoint?: string }
) {
  if (!isBrowser) return
  const cipher = await encrypt(apiKey)
  const map = getStoredMap()
  map[provider] = {
    value: cipher,
    label: options?.label,
    endpoint: options?.endpoint,
    updatedAt: Date.now(),
  }
  setStoredMap(map)
}

export async function deleteApiKey(provider: ApiProvider) {
  if (!isBrowser) return
  const map = getStoredMap()
  delete map[provider]
  setStoredMap(map)
}

export function listStoredApiKeys(): Record<ApiProvider, StoredApiKey> {
  return getStoredMap()
}

export async function getApiKey(provider: ApiProvider): Promise<ApiKeyRecord | null> {
  if (!isBrowser) return null
  const map = getStoredMap()
  const payload = map[provider]
  if (!payload) return null
  const apiKey = await decrypt(payload.value)
  return {
    provider,
    apiKey,
    label: payload.label,
    endpoint: payload.endpoint,
    updatedAt: payload.updatedAt,
  }
}

