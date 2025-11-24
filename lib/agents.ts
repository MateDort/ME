// Client-side agent functions that call API routes
export async function getMEAgentThought(): Promise<string> {
  try {
    const response = await fetch('/api/thought')
    const data = await response.json()
    return data.thought || 'Just thinking about the next big thing...'
  } catch (error) {
    console.error('Error getting ME agent thought:', error)
    return 'Just thinking about the next big thing...'
  }
}

export async function getChatResponse(message: string): Promise<string> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })
    const data = await response.json()
    return data.response || 'Let me think about that...'
  } catch (error) {
    console.error('Error getting chat response:', error)
    return 'Let me think about that...'
  }
}

export async function getSearchResponse(
  query: string,
  searchResults?: any[]
): Promise<string> {
  try {
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })
    const data = await response.json()
    return data.response || 'Search unavailable.'
  } catch (error) {
    console.error('Error getting search response:', error)
    return 'Search unavailable.'
  }
}

export async function generateDailyNews(): Promise<string> {
  try {
    const response = await fetch('/api/news')
    const data = await response.json()
    return data.news || 'News unavailable.'
  } catch (error) {
    console.error('Error generating daily news:', error)
    return 'News unavailable.'
  }
}

