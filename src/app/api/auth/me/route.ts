import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const session = (await cookies()).get('bundlex-session')?.value

  const validKeys = (process.env.VALID_ACCESS_KEYS ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)

  if (!session || !validKeys.includes(session)) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  return NextResponse.json({ authenticated: true })
}
