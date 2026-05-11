import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { createHash, createHmac } from 'crypto'
import type { NextAuthOptions } from 'next-auth'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      id: 'telegram',
      name: 'Telegram',
      credentials: {
        id: { type: 'text' },
        first_name: { type: 'text' },
        last_name: { type: 'text' },
        username: { type: 'text' },
        photo_url: { type: 'text' },
        auth_date: { type: 'text' },
        hash: { type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials) return null

        const { hash, ...data } = credentials as Record<string, string>
        if (!hash || !data.id || !data.auth_date) return null

        // Build the check string (sorted keys, exclude hash)
        const checkString = Object.keys(data)
          .sort()
          .filter((k) => data[k])
          .map((k) => `${k}=${data[k]}`)
          .join('\n')

        // HMAC-SHA256 using SHA256(bot_token) as key
        const secretKey = createHash('sha256')
          .update(process.env.TELEGRAM_BOT_TOKEN!)
          .digest()

        const expectedHash = createHmac('sha256', secretKey)
          .update(checkString)
          .digest('hex')

        if (expectedHash !== hash) return null

        // Reject stale auth data (older than 24 hours)
        const authDate = parseInt(data.auth_date, 10)
        if (isNaN(authDate) || Date.now() / 1000 - authDate > 86400) return null

        return {
          id: `tg_${data.id}`,
          name: [data.first_name, data.last_name].filter(Boolean).join(' ') || data.username || 'Telegram User',
          email: null,
          image: data.photo_url || null,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.uid = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = (token.uid as string) ?? token.sub
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
