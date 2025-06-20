import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      instructorType: string
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: string
    instructorType: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    instructorType: string
  }
}