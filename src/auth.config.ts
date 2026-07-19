import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  providers: [],
  session: {
    strategy: "jwt",
    maxAge: (Number(process.env.AUTH_SESSION_ABSOLUTE_HOURS) || 12) * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.rolesVersion = user.rolesVersion;
        token.sessionVersion = user.sessionVersion;
        token.authMethod = user.authMethod;
        token.authTime = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
        session.user.rolesVersion = token.rolesVersion as number;
        session.user.sessionVersion = token.sessionVersion as number;
        session.user.authMethod = token.authMethod as string;
        session.user.authTime = token.authTime as number;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
