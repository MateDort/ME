import { NextResponse } from 'next/server'
import axios from 'axios'
import { MATE_PROFILE } from '@/lib/mate-profile'
import { formatPlainText } from '@/lib/format-response'
import { callLLMWithFallback } from '@/lib/llm-client'

const SERPER_API_KEY = process.env.NEXT_PUBLIC_SERPER_API_KEY || process.env.SERPER_API_KEY

interface NewsArticle {
  title: string
  link: string
  snippet: string
  source: string
}

export async function GET() {
  try {
    // Fetch real news from Serper for Máté's interests
    const topics = [
      'F1 Formula 1 latest news',
      'startup news technology',
      'AI artificial intelligence latest',
      'technology inventions innovations',
    ]

    const allArticles: NewsArticle[] = []

    // Fetch news for each topic
    for (const topic of topics) {
      try {
        const response = await axios.post(
          'https://google.serper.dev/search',
          {
            q: `${topic} -politics -death`,
            num: 5,
            tbs: 'qdr:d', // Past day
          },
          {
            headers: {
              'X-API-KEY': SERPER_API_KEY || '',
              'Content-Type': 'application/json',
            },
          }
        )

        if (response.data?.organic) {
          const articles = response.data.organic.map((item: any) => ({
            title: item.title || '',
            link: item.link || '',
            snippet: item.snippet || '',
            source: item.source || '',
          }))
          allArticles.push(...articles)
        }
      } catch (error) {
        console.error(`Error fetching news for ${topic}:`, error)
      }
    }

    // Remove duplicates and limit to 15 articles
    const uniqueArticles = Array.from(
      new Map(allArticles.map((item) => [item.link, item])).values()
    ).slice(0, 15)

    // Have AI summarize each article with fallback
    const summarizedArticles = await Promise.all(
      uniqueArticles.map(async (article) => {
        try {
          const prompt = `${MATE_PROFILE}\n\nI summarize this news article in 2-3 sentences. I focus on what the article is about, not my personal feelings about it. I keep it concise and factual:\n\nTitle: ${article.title}\n\nSnippet: ${article.snippet}

IMPORTANT: Write in plain text. NEVER use markdown formatting like *** or ** or __. Focus on summarizing the article content, not expressing personal opinions about why I would like it.`

          const llmResponse = await callLLMWithFallback(prompt, undefined, {
            maxTokens: 150,
            temperature: 0.7,
          })

          return {
            ...article,
            summary: formatPlainText(llmResponse.text).trim(),
          }
        } catch (error) {
          console.error('Error summarizing article:', error)
          return {
            ...article,
            summary: article.snippet,
          }
        }
      })
    )

    return NextResponse.json({ articles: summarizedArticles })
  } catch (error) {
    console.error('News API error:', error)
    return NextResponse.json(
      { articles: [] },
      { status: 200 }
    )
  }
}
