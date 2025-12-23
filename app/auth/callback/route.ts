import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/onboarding'

  if (code) {
    const supabase = await createClient()

    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(new URL('/auth/login?error=verification_failed', requestUrl.origin))
    }

    // Redirect to the next URL (onboarding by default)
    return NextResponse.redirect(new URL(next, requestUrl.origin))
  }

  // If no code, redirect to login
  return NextResponse.redirect(new URL('/auth/login', requestUrl.origin))
}
