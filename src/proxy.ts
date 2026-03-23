import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const isAuthenticated = Boolean(request.cookies.get('appwrite_jwt')?.value)

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
