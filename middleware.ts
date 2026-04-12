import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const pathname = request.nextUrl.pathname

  // Allow access to chat, practice, study-plan, and stats without auth
  const publicDashboardPaths = ['/dashboard/chat', '/dashboard/practice', '/dashboard/study-plan', '/dashboard/stats']
  const isPublicDashboard = publicDashboardPaths.some(path => pathname.startsWith(path))

  // Protect dashboard routes (except public ones)
  if (pathname.startsWith('/dashboard') && !session && !isPublicDashboard) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Allow access to certain API routes without auth
  const publicApiPaths = ['/api/chat', '/api/coding', '/api/study-plan', '/api/stats', '/api/dashboard/stats']
  const isPublicApi = publicApiPaths.some(path => pathname.startsWith(path))

  // Protect API routes (except auth and public ones)
  if (pathname.startsWith('/api') &&
      !pathname.startsWith('/api/auth') &&
      !isPublicApi &&
      !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Redirect authenticated users away from login/signup pages
  if ((request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup') && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/:path*',
    '/login',
    '/signup',
  ],
}