import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function getValidKeys(): string[] {
  return (process.env.VALID_ACCESS_KEYS ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith('/api/')) return NextResponse.next()
  if (pathname.startsWith('/api/auth/')) return NextResponse.next()

  const session = request.cookies.get('bundlex-session')?.value
  if (!session || !getValidKeys().includes(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
