'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface NewsArticle {
  title: string
  link: string
  snippet: string
  source: string
  summary: string
}

export default function NewsApp() {
  const [dailyNews, setDailyNews] = useState<NewsArticle[]>([])
  const [isLoadingNews, setIsLoadingNews] = useState(true)

  useEffect(() => {
    loadNews()
  }, [])

  const loadNews = async () => {
    setIsLoadingNews(true)
    try {
      const response = await fetch('/api/news')
      const data = await response.json()
      if (data.articles) {
        setDailyNews(data.articles)
      }
    } catch (error) {
      console.error('Error loading news:', error)
    } finally {
      setIsLoadingNews(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-yellow-50 to-orange-50 text-black">
      {/* Header */}
      <div className="bg-retro-orange border-b-4 border-black p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-black mb-2">📰 Daily News</h1>
            <p className="text-sm text-black/80">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <button
            onClick={loadNews}
            disabled={isLoadingNews}
            className="px-4 py-2 bg-retro-yellow text-black rounded font-bold hover:bg-retro-green disabled:opacity-50 border-2 border-black"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* News Articles */}
      <div className="flex-1 overflow-y-auto p-8">
        {isLoadingNews ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin text-6xl mb-4">⟳</div>
            <p className="text-xl text-gray-600">Loading news...</p>
          </div>
        ) : dailyNews.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xl text-gray-600">No news available at this time.</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {dailyNews.map((article, index) => (
              <motion.article
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white border-l-4 border-retro-blue pl-6 pr-6 py-6 border-b-2 border-gray-300 shadow-lg rounded-r-lg"
              >
                <h3 className="text-2xl font-bold text-retro-blue mb-3 hover:underline">
                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cursor-pointer"
                  >
                    {article.title}
                  </a>
                </h3>
                <p className="text-base text-gray-700 mb-4 leading-relaxed">
                  {article.summary || article.snippet}
                </p>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <span className="font-bold text-retro-orange">{article.source}</span>
                  <span>•</span>
                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-retro-blue hover:underline cursor-pointer font-semibold"
                  >
                    Read full article →
                  </a>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

