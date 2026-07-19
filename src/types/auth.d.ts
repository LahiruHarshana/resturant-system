import type { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      rolesVersion: number;
      sessionVersion: number;
      authMethod: string;
      authTime: number;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    rolesVersion: number;
    sessionVersion: number;
    authMethod: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub: string; // User ID
    rolesVersion: number;
    sessionVersion: number;
    authMethod: string;
    authTime: number;
  }
}
