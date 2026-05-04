export const AUTH_STORAGE_KEY = 'bundlex-auth-key'

export function getStoredAccessKey(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(AUTH_STORAGE_KEY)
}

export function saveAccessKey(key: string): void {
  localStorage.setItem(AUTH_STORAGE_KEY, key)
}

export function getAccountStoreName(): string {
  if (typeof window === 'undefined') return 'bundlex-default'
  const key = localStorage.getItem(AUTH_STORAGE_KEY)
  return key ? `bundlex-${key}` : 'bundlex-default'
}
