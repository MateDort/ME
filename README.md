# MEOS - My Operating System

A personal creative space OS built as a web app, themed from the 1970s to 2000s, with AI agents powering everything in the background.

## Features

### 🚀 Booting Animation
Retro boot sequence with scanline effects and terminal-style loading messages.

### 💬 Messages App
1970s-style Apple Messages interface where you can talk to yourself. Powered by Claude AI to generate responses as Máté.

### 🎵 Music Player
iPod-style music player with click wheel interface and retro design.

### 🔍 Google Search
Early Google search interface with:
- AI-powered search responses (Claude AI)
- Serper API integration for real search results
- Daily personalized news feed (F1, startups, AI, technology, inventing)
- No politics or death news unless major

### 💡 Brainstorm App
Hybrid of Apple Notes and Cursor:
- Create notes and code snippets
- Syntax highlighting for multiple languages
- Code preview
- Perfect for brainstorming and building projects

### 🔔 Notification System
macOS-style notifications with random thoughts from the ME agent (Máté's AI persona).

## Tech Stack

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Zustand** - State management
- **Claude AI** - AI agents
- **Serper API** - Search results
- **React Syntax Highlighter** - Code highlighting

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env.local`:
```
CLAUDE_API_KEY=your_claude_key
GEMINI_API_KEY=your_gemini_key
SERPER_API_KEY=your_serper_key

# Spotify Integration (optional)
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/spotify/callback
```

### Whoop Setup

1. Add your Whoop credentials to `.env.local`:
```env
WHOOP_CLIENT_ID=
WHOOP_CLIENT_SECRET=your_whoop_client_secret_here
WHOOP_REDIRECT_URI=
```

2. Make sure the redirect URI matches exactly in your Whoop app settings:
   - Go to your Whoop app dashboard
   - Add `http://127.0.0.1:3000/api/whoop/callback` to Redirect URLs
   - Save the changes

3. Access the Health app and click "CONNECT WHOOP" to authenticate

## Spotify Setup (for Music Player)

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Copy your **Client ID** and **Client Secret**
4. **IMPORTANT**: In your app settings, add this **exact** redirect URI:
   - `http://127.0.0.1:3000/api/spotify/callback` (recommended for local development)
   - Make sure there are no trailing slashes or extra characters
   - The URI must match **exactly** what's in your code
5. Add the credentials to your `.env.local` file:
   ```
   SPOTIFY_CLIENT_ID=your_client_id_here
   SPOTIFY_CLIENT_SECRET=your_client_secret_here
   SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/spotify/callback
   ```
6. Save the `.env.local` file and restart your dev server
7. The Music Player will now allow you to connect and play your Spotify playlists!

**Note**: If you get a "redirect URI is not secure" error:
- Make sure the redirect URI in Spotify dashboard matches exactly: `http://127.0.0.1:3000/api/spotify/callback`
- For local testing, `127.0.0.1` is safer than `localhost`
- Make sure there are no extra spaces or characters
- After adding the redirect URI in Spotify, click "Save" or "Add"

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Apps

### Messages
Click the Messages icon in the dock to open a chat interface where you can talk to yourself. The AI responds as Máté would.

### Music Player
iPod-style player with click wheel controls. 
- **Spotify Integration**: Connect your Spotify account to play your playlists
- Click "Connect Spotify" to authenticate
- Browse and play your playlists
- Full playback controls (play, pause, next, previous)
- Real-time playback status updates

### Google Search
Search the web with AI-powered responses. By default, shows a personalized daily news feed.

### Brainstorm
Create notes and code snippets. Supports multiple programming languages with syntax highlighting.

## AI Agents

- **ME Agent**: Generates random thoughts and notifications
- **Chat Agent**: Responds in Messages app as Máté
- **Search Agent**: Provides AI-powered search results
- **News Agent**: Generates personalized daily news

## Personalization

The system is personalized for Máté:
- Interests: F1, startups, AI, technology, inventing, reading
- Personality traits integrated into all AI responses
- No social media, no TV shows
- Focus on learning and inventing

## License

Personal project - All rights reserved.

