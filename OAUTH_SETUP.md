# OAuth Redirect URI Setup Guide

## The Problem
OAuth providers (Whoop, Spotify) require the redirect URI to match **EXACTLY** what's registered in their dashboard. Even small differences (localhost vs 127.0.0.1, http vs https, trailing slashes) will cause errors.

## Quick Fix

### Option 1: Use Environment Variables (Recommended)

Add these to your `.env.local` file with the **EXACT** redirect URIs from your OAuth app dashboards:

```env
# Whoop - Use the EXACT redirect URI from your Whoop app settings
WHOOP_REDIRECT_URI=http://localhost:3000/api/whoop/callback
# OR if your Whoop app has port 8000 registered:
# WHOOP_REDIRECT_URI=http://localhost:8000/whoop/callback

# Spotify - Use the EXACT redirect URI from your Spotify app settings
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/spotify/callback
# OR if your Spotify app has 127.0.0.1 registered:
# SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/spotify/callback
```

### Option 2: Update Your OAuth App Settings

**For Whoop:**
1. Go to your Whoop app dashboard
2. Find "Redirect URLs" section
3. Add: `http://localhost:3000/api/whoop/callback`
4. Also add: `http://127.0.0.1:3000/api/whoop/callback` (if you use 127.0.0.1)
5. Save changes

**For Spotify:**
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click on your app
3. Click "Edit Settings"
4. In "Redirect URIs", add:
   - `http://localhost:3000/api/spotify/callback`
   - `http://127.0.0.1:3000/api/spotify/callback`
5. Click "Add" and "Save"

## Important Notes

1. **Case Sensitive**: Redirect URIs are case-sensitive
2. **No Trailing Slashes**: Don't add trailing slashes (e.g., `/api/spotify/callback/` is wrong)
3. **Protocol Matters**: `http://` vs `https://` must match
4. **Host Matters**: `localhost` vs `127.0.0.1` are different
5. **Port Matters**: `:3000` vs `:8000` must match

## Testing

After updating, restart your dev server:
```bash
npm run dev
```

Then try connecting again. Check the browser console and terminal logs for the exact redirect URI being used.

## Common Issues

### "redirect_uri does not match"
- The redirect URI in your code doesn't match what's in the OAuth dashboard
- Solution: Copy the EXACT URI from the error message and add it to your OAuth app settings

### "invalid_request"
- Usually means redirect_uri mismatch
- Check both the auth request and callback use the same URI

### Works with localhost but not 127.0.0.1
- Add both to your OAuth app settings
- Or use environment variables to switch between them

