// utils/supabase/middleware.ts
import { type NextRequest, NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Get the JWT from the request cookies
  const jwt = request.cookies.get('userJWT')?.value

  // Clone the request headers
  const requestHeaders = new Headers(request.headers)

  // Set the JWT in the request headers
  if (jwt) {
    requestHeaders.set('Authorization', `Bearer ${jwt}`)
  }

  // Return the response with the updated request headers
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}
