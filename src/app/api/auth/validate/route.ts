import { NextResponse } from 'next/server'

export async function POST(req: Request) {
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

  return NextResponse.json({ valid: true })
}
