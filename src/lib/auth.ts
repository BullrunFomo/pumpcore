const USER_ID_KEY = 'bundlex-user-id'

export function getStoredUserId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(USER_ID_KEY)
}

export function saveUserId(id: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(USER_ID_KEY, id)
}

export function clearUserId(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(USER_ID_KEY)
}

export function getAccountStoreName(): string {
  if (typeof window === 'undefined') return 'bundlex-default'
  const id = localStorage.getItem(USER_ID_KEY)
  return id ? `bundlex-${id}` : 'bundlex-default'
}
