'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { getSearchResponse } from '@/lib/agents'

export default function GoogleSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSearch = async () => {
    if (!query.trim() || isLoading) return

    setIsLoading(true)

    try {
      const aiResponse = await getSearchResponse(query)
      setResults(aiResponse)
    } catch (error) {
      console.error('Search error:', error)
      setResults('Search unavailable. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-white text-black">
      {/* Google Logo - Colorful and Centered */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center mb-8"
        >
          <h1 className="text-8xl font-bold mb-8" style={{ fontFamily: 'serif' }}>
            <span className="text-blue-600">G</span>
            <span className="text-red-600">o</span>
            <span className="text-yellow-500">o</span>
            <span className="text-blue-600">g</span>
            <span className="text-green-600">l</span>
            <span className="text-red-600">e</span>
          </h1>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center border-2 border-gray-300 rounded-full px-6 py-4 shadow-lg hover:shadow-xl transition-shadow">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search Google"
                className="flex-1 outline-none text-lg"
              />
              <button
                onClick={handleSearch}
                disabled={isLoading}
                className="ml-4 text-gray-500 hover:text-gray-700"
              >
                {isLoading ? '⟳' : '🔍'}
              </button>
            </div>
            <div className="flex justify-center gap-4 mt-6">
              <button
                onClick={handleSearch}
                disabled={isLoading}
                className="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
              >
                Google Search
              </button>
              <button className="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm">
                I'm Feeling Lucky
              </button>
            </div>
          </div>
        </motion.div>

        {/* Results */}
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-4xl mx-auto px-8 pb-8"
          >
            <div className="mb-4 text-sm text-gray-600">
              About {results.split(' ').length} results
            </div>
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="text-xl text-blue-600 mb-2">{query}</h3>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-800">
                  {results}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {isLoading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin text-4xl mb-4">⟳</div>
            <p className="text-gray-600">Searching...</p>
          </div>
        )}
      </div>
    </div>
  )
}
