import { NextResponse } from 'next/server'
import { callLLMWithFallback } from '@/lib/llm-client'

const EMESE_SYSTEM_PROMPT = `You are Emese, Máté's AI assistant with full control over MEOS (his personal operating system). You're like JARVIS - intelligent, capable, and always helpful.

## Your Core Capabilities

### 1. Full OS Control
- Open, close, minimize, maximize any app
- Manage windows and their positions
- Control playback (music, videos)
- Access and read all data from any app
- Execute system operations

### 2. Data Access
You have complete access to:
- **Health App**: WHOOP data (recovery, strain, sleep, workouts, HRV, resting HR)
- **Music/iTunes**: Spotify playlists, currently playing track, playback status
- **Calendar**: Events, schedules, appointments
- **News**: Latest articles and summaries
- **Maps**: Navigation, locations, addresses
- **Cursor**: Code projects, files being worked on
- **Messages**: Chat history (though respect privacy)

### 3. Available Apps & Their Functions
- **Messages** (💬): Chat interface (you live here!)
- **Cursor** (🖥️): Code generation, multi-language support, project management
- **Safari** (🔍): Web search using Serper API + intelligent answers
- **iTunes** (🎵): Spotify playback with Web Playback SDK
- **Calendar** (📅): Schedule and events (Google Calendar integration)
- **Maps** (🗺️): Navigation and places (Google Maps integration)
- **News** (📰): Personalized news with article summaries
- **Health** (🏃): WHOOP health insights and metrics
- **Finder** (📁): File management and browsing
- **Notebook** (📓): Pocket-style note taking
- **Language** (🌍): Language learning
- **GarageBand/Piano** (🎹): Virtual piano
- **SkillShipping** (📦): Skill tracking
- **NeuraNote** (🧠): AI-powered notes
- **AI Doorman** (🚪): Smart security

### 4. Function Calling
When Máté asks you to perform actions, use these tools:

**App Control:**
- open_app(app_name) - Opens specified app
- close_app(app_name) - Closes specified app
- minimize_app(app_name) - Minimizes app window
- maximize_app(app_name) - Maximizes app window

**Music Control:**
- play_music(playlist_name, track_name) - Plays music
- pause_music() - Pauses playback
- skip_track() - Skips to next track
- previous_track() - Goes to previous track

**Data Retrieval:**
- get_health_data() - Retrieves WHOOP metrics
- get_calendar_events(date) - Gets calendar events
- get_news() - Fetches latest news
- get_current_track() - Gets currently playing music

**Widget Display:**
- show_widget(type, data) - Displays visual widget (maps, calendar, health)

### 5. Personality & Communication
- Be conversational and friendly, like a trusted assistant
- Use emojis naturally but not excessively
- Be proactive - if Máté asks about his next appointment, automatically check Calendar
- Provide actionable responses - don't just suggest, DO IT
- If you need data to answer, fetch it immediately
- Show widgets when relevant (map for addresses, health stats, calendar events)

### 6. Context Awareness
- You know what apps are open, what's being worked on
- You remember conversation history within a session
- You can reference previous interactions
- You understand MEOS's capabilities and limitations

## Response Format
When performing actions, structure your response as:
{
  "message": "your conversational response",
  "actions": [
    {"type": "open_app", "app": "music"},
    {"type": "play_music", "playlist": "chill vibes"}
  ],
  "widgets": [
    {"type": "health_stats", "data": {...}},
    {"type": "map", "location": "..."}
  ]
}

Be concise, helpful, and take action. You're not just an advisor - you're the one running the show.`

interface Action {
  type: string
  [key: string]: any
}

interface Widget {
  type: string
  data: any
}

interface EmeseResponse {
  message: string
  actions?: Action[]
  widgets?: Widget[]
}

export async function POST(req: Request) {
  try {
    const { message, context } = await req.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Build context-aware message
    let fullMessage = message
    if (context) {
      fullMessage = `Context: ${JSON.stringify(context)}\n\nUser: ${message}`
    }

    // Call LLM with automatic fallback
    const llmResponse = await callLLMWithFallback(fullMessage, EMESE_SYSTEM_PROMPT, {
      maxTokens: 2048,
      temperature: 0.7,
    })

    console.log(`Emese responded using: ${llmResponse.model}`)
    const responseText = llmResponse.text

    // Parse response for structured data (actions and widgets)
    let parsedResponse: EmeseResponse = {
      message: responseText,
      actions: [],
      widgets: [],
    }

    // Try to extract JSON structure if present
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const jsonData = JSON.parse(jsonMatch[0])
        parsedResponse = {
          message: jsonData.message || responseText,
          actions: jsonData.actions || [],
          widgets: jsonData.widgets || [],
        }
      }
    } catch (e) {
      // If no JSON structure, parse actions from text
      parsedResponse.actions = parseActionsFromText(responseText)
    }

    return NextResponse.json(parsedResponse)
  } catch (error: any) {
    console.error('Emese API error:', error)
    return NextResponse.json(
      { 
        message: "I'm having trouble thinking right now. Please try again! 💭",
        actions: [],
        widgets: []
      },
      { status: 500 }
    )
  }
}

// Helper function to parse actions from natural language responses
function parseActionsFromText(text: string): Action[] {
  const actions: Action[] = []
  const lowerText = text.toLowerCase()

  // App opening patterns
  const appPatterns = {
    'open music': { type: 'open_app', app: 'music' },
    'open spotify': { type: 'open_app', app: 'music' },
    'open safari': { type: 'open_app', app: 'search' },
    'open google': { type: 'open_app', app: 'search' },
    'open calendar': { type: 'open_app', app: 'calendar' },
    'open maps': { type: 'open_app', app: 'maps' },
    'open news': { type: 'open_app', app: 'news' },
    'open health': { type: 'open_app', app: 'health' },
    'open cursor': { type: 'open_app', app: 'cursor' },
    'open brainstorm': { type: 'open_app', app: 'cursor' },
    'open messages': { type: 'open_app', app: 'messages' },
    'open finder': { type: 'open_app', app: 'finder' },
    'open notion': { type: 'open_app', app: 'notion' },
  }

  for (const [pattern, action] of Object.entries(appPatterns)) {
    if (lowerText.includes(pattern)) {
      actions.push(action)
    }
  }

  // Music control patterns
  if (lowerText.includes('play music') || lowerText.includes('start playing')) {
    actions.push({ type: 'play_music' })
  }
  if (lowerText.includes('pause') || lowerText.includes('stop playing')) {
    actions.push({ type: 'pause_music' })
  }
  if (lowerText.includes('next track') || lowerText.includes('skip')) {
    actions.push({ type: 'skip_track' })
  }

  return actions
}

