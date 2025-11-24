import { NextRequest, NextResponse } from 'next/server'

const WHOOP_CLIENT_ID = process.env.WHOOP_CLIENT_ID
const WHOOP_CLIENT_SECRET = process.env.WHOOP_CLIENT_SECRET || ''
// IMPORTANT: This must match EXACTLY what's registered in your Whoop app settings
const WHOOP_REDIRECT_URI = process.env.WHOOP_REDIRECT_URI || 'http://localhost:3000/api/whoop/callback'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const storedState = req.cookies.get('whoop_auth_state')?.value
  const error = req.nextUrl.searchParams.get('error')

  const buildRedirect = (path: string) => {
    const url = new URL(path, req.nextUrl.origin)
    return NextResponse.redirect(url.toString())
  }

  if (error) {
    return buildRedirect(`/?error=${encodeURIComponent(error)}`)
  }

  // Check if this is a popup request (from state or cookie)
  const isPopupFromState = state?.startsWith('popup_')
  const isPopupFromCookie = req.cookies.get('whoop_auth_popup')?.value === 'true'
  const isPopup = isPopupFromState || isPopupFromCookie
  
  // Check if state matches (accounting for popup prefix)
  const stateValue = isPopupFromState ? state.substring(6) : state
  const storedStateValue = storedState?.startsWith('popup_') ? storedState.substring(6) : storedState

  if (!code || !state || stateValue !== storedStateValue) {
    console.error('State mismatch:', { state, storedState, stateValue, storedStateValue })
    return buildRedirect('/?error=invalid_state')
  }

  if (!WHOOP_CLIENT_ID || !WHOOP_CLIENT_SECRET) {
    console.error('Whoop Client ID or Secret missing!')
    if (isPopup) {
      // Return error HTML for popup
      const errorHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Whoop Auth Error</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; text-align: center; background: #f5f5f5; }
              .error { background: white; padding: 30px; border-radius: 8px; max-width: 500px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              h1 { color: #d32f2f; }
              code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
            </style>
          </head>
          <body>
            <div class="error">
              <h1>Configuration Error</h1>
              <p>WHOOP_CLIENT_SECRET is missing from your .env.local file.</p>
              <p>Please add it and restart your dev server.</p>
              <button onclick="window.close()" style="margin-top: 20px; padding: 10px 20px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
            </div>
          </body>
        </html>
      `
      return new NextResponse(errorHtml, { headers: { 'Content-Type': 'text/html' } })
    }
    return buildRedirect('/?error=server_config')
  }

  // Get the exact redirect URI - must match what was sent in auth request
  let redirectUri = WHOOP_REDIRECT_URI.trim().replace(/\/$/, '')
  if (!process.env.WHOOP_REDIRECT_URI) {
    const origin = req.nextUrl.origin
    redirectUri = `${origin}/api/whoop/callback`
  }

  console.log('Whoop Callback - Using redirect URI:', redirectUri)

  try {
    const tokenResponse = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri, // Must match EXACTLY what was sent in auth request
        client_id: WHOOP_CLIENT_ID,
        client_secret: WHOOP_CLIENT_SECRET,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error('Whoop token exchange failed:', tokenData)
      const errorMsg = tokenData.error || 'token_exchange_failed'
      
      if (isPopup) {
        // Return error HTML for popup
        const errorHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Whoop Auth Error</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 40px; text-align: center; background: #f5f5f5; }
                .error { background: white; padding: 30px; border-radius: 8px; max-width: 500px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { color: #d32f2f; }
              </style>
            </head>
            <body>
              <div class="error">
                <h1>Authentication Failed</h1>
                <p>${errorMsg}</p>
                <button onclick="window.close()" style="margin-top: 20px; padding: 10px 20px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
              </div>
            </body>
          </html>
        `
        return new NextResponse(errorHtml, { headers: { 'Content-Type': 'text/html' } })
      }
      
      return buildRedirect(`/?error=${encodeURIComponent(errorMsg)}`)
    }

    // isPopup is already set above
    
    // Set cookies with explicit path and domain settings
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    }

    if (isPopup) {
      // If popup, return HTML that closes the window and notifies parent
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Whoop Auth Success</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                padding: 40px; 
                text-align: center; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                margin: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
              }
              .success { 
                background: rgba(255,255,255,0.1);
                backdrop-filter: blur(10px);
                padding: 40px; 
                border-radius: 12px; 
                max-width: 400px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.1);
              }
              h1 { margin-top: 0; }
              .spinner {
                border: 3px solid rgba(255,255,255,0.3);
                border-top: 3px solid white;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin: 20px auto;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            </style>
          </head>
          <body>
            <div class="success">
              <h1>✅ Success!</h1>
              <p>Authentication successful!</p>
              <div class="spinner"></div>
              <p>Closing window...</p>
            </div>
            <script>
              // Wait a moment for cookies to be set, then notify parent and close
              setTimeout(function() {
                try {
                  if (window.opener && !window.opener.closed) {
                    window.opener.postMessage({ type: 'whoop_auth_success' }, window.location.origin);
                  }
                } catch(e) {
                  console.error('Error posting message:', e);
                }
                
                // Try to close the window
                setTimeout(function() {
                  window.close();
                  // If window didn't close (some browsers block it), show a message
                  setTimeout(function() {
                    if (!window.closed) {
                      document.body.innerHTML = '<div class="success"><h1>✅ Success!</h1><p>You can close this window now.</p><button onclick="window.close()" style="margin-top: 20px; padding: 10px 20px; background: white; color: #667eea; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Close Window</button></div>';
                    }
                  }, 1000);
                }, 500);
              }, 1000);
            </script>
          </body>
        </html>
      `
      
      const response = new NextResponse(html, {
        headers: { 'Content-Type': 'text/html' },
      })
      
      // Set cookies in the response
      response.cookies.set('whoop_access_token', tokenData.access_token, {
        ...cookieOptions,
        maxAge: tokenData.expires_in || 3600,
      })

      if (tokenData.refresh_token) {
        response.cookies.set('whoop_refresh_token', tokenData.refresh_token, {
          ...cookieOptions,
          maxAge: 60 * 60 * 24 * 30,
        })
      }

      response.cookies.delete('whoop_auth_state')
      response.cookies.delete('whoop_auth_popup')
      console.log('Whoop auth successful - popup mode, closing window')
      return response
    } else {
      // Regular redirect flow
      const response = buildRedirect('/?whoop_auth=success')
      
      response.cookies.set('whoop_access_token', tokenData.access_token, {
        ...cookieOptions,
        maxAge: tokenData.expires_in || 3600,
      })

      if (tokenData.refresh_token) {
        response.cookies.set('whoop_refresh_token', tokenData.refresh_token, {
          ...cookieOptions,
          maxAge: 60 * 60 * 24 * 30,
        })
      }

      response.cookies.delete('whoop_auth_state')
      console.log('Whoop auth successful - cookies set, redirecting to home')
      return response
    }
  } catch (error) {
    console.error('Whoop callback error:', error)
    return buildRedirect('/?error=callback_error')
  }
}

