import { NextResponse } from 'next/server'

// In-memory rate limiter: 10 attempts per 15 minutes per IP
const attempts = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 10
const WINDOW_MS = 15 * 60 * 1000

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const record = attempts.get(ip)
  if (!record || now > record.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  record.count++
  return record.count > RATE_LIMIT
}

export async function POST(req: Request) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'

  if (isRateLimited(ip)) {
    return NextResponse.json({ valid: false, error: 'Too many attempts' }, { status: 429 })
  }

  const body = await req.json().catch(() => ({}))
  const { key } = body as { key?: string }

  if (!key || typeof key !== 'string') {
    return NextResponse.json({ valid: false }, { status: 400 })
  }

  const validKeys = (process.env.VALID_ACCESS_KEYS ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)

  if (!validKeys.includes(key)) {
    return NextResponse.json({ valid: false }, { status: 401 })
  }

  const response = NextResponse.json({ valid: true })
  response.cookies.set('bundlex-session', key, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
  return response
}
