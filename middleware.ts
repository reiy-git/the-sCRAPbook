import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedPrefixes = ["/dashboard", "/diary", "/settings"];
const authRoutes = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;
  const isProtected = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix),
  );
  const isAuthRoute = authRoutes.includes(pathname);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Avoid a platform-level 500 when deployment environment variables are not
  // available. Protected pages remain inaccessible until Supabase is configured.
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Auth middleware is missing Supabase environment variables.");
    if (isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return response;
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });

    // `getSession()` only reads the cookie and may accept a stale token. Verify
    // the user with Supabase so invalid sessions are redirected here instead of
    // reaching a Server Component that throws "Unauthorized".
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user && isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    if (user && isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    return response;
  } catch (error) {
    // Middleware must never surface an opaque Vercel 500 for an auth failure.
    // The original error is retained in runtime logs for follow-up.
    console.error("Auth middleware failed:", error);
    if (isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
