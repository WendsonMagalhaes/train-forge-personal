import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role;

  const isTrainerRoute = pathname.startsWith("/dashboard");
  const isStudentRoute = pathname.startsWith("/portal");
  const isAdminRoute = pathname.startsWith("/admin");
  const isChangePasswordRoute = pathname === "/change-password";

  if ((isTrainerRoute || isStudentRoute || isAdminRoute || isChangePasswordRoute) && !req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
    
  }

  // Senha provisória (aluno recém-cadastrado ou reset pelo admin) — trava tudo
  // até o próximo login/troca, exceto a própria tela de troca de senha.
  if (req.auth && req.auth.user?.mustChangePassword && !isChangePasswordRoute) {
    return NextResponse.redirect(new URL("/change-password", req.nextUrl.origin));
  }

  if (isAdminRoute && role !== "admin") {
    const fallback = role === "student" ? "/portal" : "/dashboard";
    return NextResponse.redirect(new URL(fallback, req.nextUrl.origin));
  }

  if (isTrainerRoute && role !== "trainer" && role !== "admin") {
    return NextResponse.redirect(new URL("/portal", req.nextUrl.origin));
  }

  if (isStudentRoute && role !== "student") {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/portal/:path*", "/admin/:path*", "/change-password"],
};
