import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? ''
  const sessionKey = `a_session_${projectId}`
  const sessionCookie = request.cookies.get(sessionKey)

  const isAuthenticated = Boolean(sessionCookie?.value)

  if (!isAuthenticated && !request.nextUrl.pathname.startsWith('/auth')) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/auth/login'
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next({ request })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
