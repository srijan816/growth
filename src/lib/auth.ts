import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { findOne } from "./postgres"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Check if this is the test instructor - DISABLED to use real database user
          // const testEmail = process.env.TEST_INSTRUCTOR_EMAIL;
          // const testPassword = process.env.TEST_INSTRUCTOR_PASSWORD;
          // 
          // if (credentials.email === testEmail && credentials.password === testPassword) {
          //   return {
          //     id: 'test-instructor-id',
          //     email: testEmail,
          //     name: 'Test Instructor',
          //     role: 'test_instructor',
          //     instructorType: 'all_access'
          //   }
          // }

          // Fetch user from PostgreSQL
          const user = await findOne('users', { email: credentials.email });

          if (!user) {
            console.log('User not found:', credentials.email);
            return null;
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            console.log('Invalid password for user:', credentials.email);
            return null;
          }

          console.log('User authenticated successfully:', user.name);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            instructorType: 'normal'
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.instructorType = user.instructorType
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as string
        session.user.instructorType = token.instructorType as string
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
}
