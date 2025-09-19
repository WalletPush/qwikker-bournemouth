import { NextRequest, NextResponse } from 'next/server'
import { authenticateAdmin } from '@/lib/utils/admin-auth'
import type { FranchiseCity } from '@/lib/utils/city-detection'

export async function POST(request: NextRequest) {
  try {
    console.log('Admin login API called')
    const { city, username, password } = await request.json()
    console.log('Received data:', { city, username, passwordLength: password?.length })

    // Validate input
    if (!city || !username || !password) {
      console.log('Missing required fields')
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate city
    const validCities: FranchiseCity[] = ['bournemouth', 'calgary', 'london', 'paris']
    if (!validCities.includes(city)) {
      console.log('Invalid city:', city)
      return NextResponse.json(
        { success: false, error: 'Invalid city' },
        { status: 400 }
      )
    }

    console.log('Attempting to authenticate admin...')
    // Authenticate admin
    const result = await authenticateAdmin(city, username, password)
    console.log('Authentication result:', { success: result.success, error: result.error })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      )
    }

    // Create response with admin info
    const response = NextResponse.json({
      success: true,
      admin: {
        id: result.admin!.id,
        city: result.admin!.city,
        username: result.admin!.username,
        email: result.admin!.email,
        full_name: result.admin!.full_name,
        last_login: result.admin!.last_login
      }
    })

    // Set HTTP-only cookie for session management
    const sessionData = {
      adminId: result.admin!.id,
      city: result.admin!.city,
      username: result.admin!.username,
      loginTime: new Date().toISOString()
    }

    response.cookies.set('qwikker_admin_session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 hours
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Admin login API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
