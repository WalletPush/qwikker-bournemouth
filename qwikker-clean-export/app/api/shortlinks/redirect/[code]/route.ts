import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    console.log(`🔗 Shortlink redirect request for code: ${code}`)
    
    if (!code) {
      return NextResponse.json(
        { error: 'Missing shortlink code' },
        { status: 400 }
      )
    }
    
    const supabase = createServiceRoleClient()
    
    // Look up shortlink
    const { data: shortlink, error: shortlinkError } = await supabase
      .from('user_shortlinks')
      .select('*')
      .eq('shortlink_code', code)
      .eq('is_active', true)
      .single()
    
    if (shortlinkError || !shortlink) {
      console.error('❌ Shortlink not found:', code, shortlinkError)
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Link Not Found - Qwikker</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: #0f172a; 
              color: #e2e8f0; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              min-height: 100vh; 
              margin: 0; 
            }
            .container { 
              text-align: center; 
              max-width: 400px; 
              padding: 2rem; 
            }
            h1 { color: #ef4444; margin-bottom: 1rem; }
            p { margin-bottom: 1.5rem; line-height: 1.6; }
            a { 
              color: #00d083; 
              text-decoration: none; 
              padding: 0.75rem 1.5rem; 
              border: 1px solid #00d083; 
              border-radius: 0.5rem; 
              display: inline-block;
              transition: all 0.2s;
            }
            a:hover { 
              background: #00d083; 
              color: #0f172a; 
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Link Not Found</h1>
            <p>This link is no longer valid or has expired. This usually happens when a wallet pass has been removed.</p>
            <a href="https://qwikker.com">Visit Qwikker</a>
          </div>
        </body>
        </html>
        `,
        { 
          status: 404,
          headers: { 'Content-Type': 'text/html' }
        }
      )
    }
    
    // Validate user still exists (bulletproof security)
    const { data: user, error: userError } = await supabase
      .from('app_users')
      .select('wallet_pass_id, name, deleted_at')
      .eq('wallet_pass_id', shortlink.wallet_pass_id)
      .single()
    
    if (userError || !user || user.deleted_at) {
      console.log('❌ User not found or pass deleted:', shortlink.wallet_pass_id)
      
      // Deactivate shortlink
      await supabase
        .from('user_shortlinks')
        .update({ is_active: false })
        .eq('id', shortlink.id)
      
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Customer Not Found - Qwikker</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: #0f172a; 
              color: #e2e8f0; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              min-height: 100vh; 
              margin: 0; 
            }
            .container { 
              text-align: center; 
              max-width: 400px; 
              padding: 2rem; 
            }
            h1 { color: #ef4444; margin-bottom: 1rem; }
            p { margin-bottom: 1.5rem; line-height: 1.6; }
            a { 
              color: #00d083; 
              text-decoration: none; 
              padding: 0.75rem 1.5rem; 
              border: 1px solid #00d083; 
              border-radius: 0.5rem; 
              display: inline-block;
              transition: all 0.2s;
            }
            a:hover { 
              background: #00d083; 
              color: #0f172a; 
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Customer Not Found</h1>
            <p>Your wallet pass has been removed or is no longer valid. Please sign up again to get a new pass.</p>
            <a href="https://qwikker.com">Sign Up Again</a>
          </div>
        </body>
        </html>
        `,
        { 
          status: 404,
          headers: { 'Content-Type': 'text/html' }
        }
      )
    }
    
    // Update access analytics
    await supabase
      .from('user_shortlinks')
      .update({
        access_count: shortlink.access_count + 1,
        last_accessed_at: new Date().toISOString()
      })
      .eq('id', shortlink.id)
    
    console.log(`✅ Redirecting ${user.name} to ${shortlink.link_type}: ${shortlink.destination_url}`)
    
    // Redirect to destination URL
    return NextResponse.redirect(shortlink.destination_url, 302)
    
  } catch (error) {
    console.error('❌ Shortlink redirect error:', error)
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error - Qwikker</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0f172a; 
            color: #e2e8f0; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            min-height: 100vh; 
            margin: 0; 
          }
          .container { 
            text-align: center; 
            max-width: 400px; 
            padding: 2rem; 
          }
          h1 { color: #ef4444; margin-bottom: 1rem; }
          p { margin-bottom: 1.5rem; line-height: 1.6; }
          a { 
            color: #00d083; 
            text-decoration: none; 
            padding: 0.75rem 1.5rem; 
            border: 1px solid #00d083; 
            border-radius: 0.5rem; 
            display: inline-block;
            transition: all 0.2s;
          }
          a:hover { 
            background: #00d083; 
            color: #0f172a; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Something Went Wrong</h1>
          <p>We encountered an error processing your request. Please try again or contact support.</p>
          <a href="https://qwikker.com">Back to Qwikker</a>
        </div>
      </body>
      </html>
      `,
      { 
        status: 500,
        headers: { 'Content-Type': 'text/html' }
      }
    )
  }
}
