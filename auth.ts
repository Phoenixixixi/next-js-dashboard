import NextAuth from 'next-auth'
import { authConfig } from './auth.config'
import Credentials from 'next-auth/providers/credentials'
import z from 'zod'
import type { User } from './app/lib/definitions'
import postgres from 'postgres'
import bcrypt from 'bcrypt'

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' })

async function getUser(email: string) {
  try {
    const user = await sql<User[]>`SELECT * FROM users WHERE email = ${email} `
    return user[0]
  } catch (err) {
    console.error('failed to fetch users : ', err)
    throw new Error('Failed to fetch Users')
  }
}

export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({
            email: z.string().email(),
            password: z.string().min(6),
          })
          .safeParse(credentials)
        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data
          console.log(password)
          const user = await getUser(email)
          if (!user) return null
          const passwordMatch = await bcrypt.compare(password, user.password)
          if (passwordMatch) return user
        }
        console.log('Invalid credentials')
        return null
      },
    }),
  ],
})
