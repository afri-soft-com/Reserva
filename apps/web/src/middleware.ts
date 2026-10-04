import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIQUES = ["/connexion", "/cgu", "/confidentialite", "/reinitialiser-pin"];

/** Routes legacy client/prestataire → redirection console admin */
const BLOQUEES_PREFIXES = [
  "/services",
  "/reservations",
  "/portefeuille",
  "/favoris",
  "/profil",
  "/notifications",
  "/tarifs",
  "/prestataire",
  "/inscription",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (BLOQUEES_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.redirect(new URL("/connexion", request.url));
  }

  const publique = PUBLIQUES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (publique || pathname.startsWith("/admin") || pathname === "/") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".")) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/connexion", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png).*)"],
};
