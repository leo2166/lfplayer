import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export default async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Si el usuario es nulo (ej. sesión vencida o inexistente), limpiamos la cookie
  // explícitamente del request para que el Server Component en page.tsx 
  // consulte la base de datos como "anónimo" y no con un token vencido que da error 401.
  if (!user) {
    const authCookies = request.cookies.getAll().filter(c => c.name.startsWith('sb-') && c.name.includes('-auth-token'))
    authCookies.forEach((cookie) => {
      request.cookies.delete(cookie.name)
      supabaseResponse.cookies.delete(cookie.name)
    })
  }

  // Redirect to app if accessing auth pages while logged in
  if ((request.nextUrl.pathname.startsWith("/auth") || request.nextUrl.pathname === "/") && user) {
    const url = request.nextUrl.clone()
    url.pathname = "/app"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (common extensions)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json|ico)$).*)",
  ],
}
