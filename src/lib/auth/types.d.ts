import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "trainer" | "student" | "admin";
      mustChangePassword?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: "trainer" | "student" | "admin";
    mustChangePassword?: boolean;
  }
}
