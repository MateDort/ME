'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Word {
  word: string
  translation: string
  date: string
  language: string
}

type Language = 'spanish' | 'italian' | 'french'

const LANGUAGE_NAMES = {
  spanish: 'Spanish',
  italian: 'Italian',
  french: 'French',
}

export default function LanguageApp() {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('spanish')
  const [dailyWords, setDailyWords] = useState<Word[]>([])
  const [allPastWords, setAllPastWords] = useState<Word[]>([])
  const [showPastWords, setShowPastWords] = useState(false)
  const [showQuiz, setShowQuiz] = useState(false)
  const [quizWords, setQuizWords] = useState<Word[]>([])
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0)
  const [quizAnswer, setQuizAnswer] = useState('')
  const [quizScore, setQuizScore] = useState(0)
  const [quizFinished, setQuizFinished] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadDailyWords()
    loadPastWords()
    
    // Check if we need to generate new words at midnight
    const checkMidnight = () => {
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      const msUntilMidnight = tomorrow.getTime() - now.getTime()
      
      setTimeout(() => {
        // Clear cache and generate new words at midnight
        localStorage.removeItem(`daily_words_${selectedLanguage}`)
        localStorage.removeItem(`daily_words_date_${selectedLanguage}`)
        generateDailyWords()
        // Set up next midnight check
        checkMidnight()
      }, msUntilMidnight)
    }
    
    checkMidnight()
  }, [])

  useEffect(() => {
    loadDailyWords()
  }, [selectedLanguage])

  const loadDailyWords = async () => {
    // Check if we have cached words for today
    const today = new Date().toDateString()
    const cachedDate = localStorage.getItem(`daily_words_date_${selectedLanguage}`)
    const cachedWords = localStorage.getItem(`daily_words_${selectedLanguage}`)
    
    if (cachedDate === today && cachedWords) {
      try {
        setDailyWords(JSON.parse(cachedWords))
        return
      } catch (e) {
        // If parsing fails, generate new words
      }
    }
    
    // Generate new words if not cached
    await generateDailyWords()
  }

  const generateDailyWords = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/generate-language-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: selectedLanguage, count: 10 }),
      })
      
      const data = await response.json()
      if (data.words) {
        const wordsWithDate = data.words.map((w: Word) => ({
          ...w,
          date: new Date().toDateString(),
          language: selectedLanguage,
        }))
        setDailyWords(wordsWithDate)
        // Cache for today
        localStorage.setItem(`daily_words_${selectedLanguage}`, JSON.stringify(wordsWithDate))
        localStorage.setItem(`daily_words_date_${selectedLanguage}`, new Date().toDateString())
        
        // Save to past words
        const pastWords = JSON.parse(localStorage.getItem('all_past_words') || '[]')
        pastWords.push(...wordsWithDate)
        localStorage.setItem('all_past_words', JSON.stringify(pastWords))
        setAllPastWords(pastWords)
      }
    } catch (error) {
      console.error('Error generating words:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadPastWords = () => {
    const pastWords = JSON.parse(localStorage.getItem('all_past_words') || '[]')
    setAllPastWords(pastWords)
  }

  const startQuiz = () => {
    // Combine current and past words for the selected language
    const allWords = [
      ...dailyWords,
      ...allPastWords.filter(w => w.language === selectedLanguage),
    ]
    
    // Shuffle and take 10 random words
    const shuffled = allWords.sort(() => Math.random() - 0.5)
    setQuizWords(shuffled.slice(0, 10))
    setCurrentQuizIndex(0)
    setQuizScore(0)
    setQuizFinished(false)
    setQuizAnswer('')
    setShowQuiz(true)
  }

  const checkQuizAnswer = () => {
    const currentWord = quizWords[currentQuizIndex]
    const isCorrect = quizAnswer.toLowerCase().trim() === currentWord.translation.toLowerCase().trim()
    
    if (isCorrect) {
      setQuizScore(quizScore + 1)
    }
    
    if (currentQuizIndex < quizWords.length - 1) {
      setCurrentQuizIndex(currentQuizIndex + 1)
      setQuizAnswer('')
    } else {
      setQuizFinished(true)
    }
  }

  const resetQuiz = () => {
    setShowQuiz(false)
    setQuizFinished(false)
    setCurrentQuizIndex(0)
    setQuizAnswer('')
    setQuizScore(0)
  }

  if (showPastWords) {
    const filteredPastWords = allPastWords.filter(w => w.language === selectedLanguage)
    
    return (
      <div className="h-full flex flex-col bg-gradient-to-br from-amber-900 via-orange-800 to-red-900 text-white" style={{ fontFamily: 'monospace' }}>
        <div className="bg-amber-950 border-b-4 border-amber-600 p-4" style={{ boxShadow: '0 4px 8px rgba(0,0,0,0.3)' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>📚 PAST WORDS - {LANGUAGE_NAMES[selectedLanguage].toUpperCase()}</h2>
            <button
              onClick={() => setShowPastWords(false)}
              className="px-6 py-3 bg-amber-600 hover:bg-amber-500 border-4 border-amber-800 rounded-lg font-bold text-lg transition-all"
              style={{ boxShadow: '4px 4px 8px rgba(0,0,0,0.3)', fontFamily: 'monospace' }}
            >
              ← BACK
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPastWords.map((word, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-amber-900 rounded-lg p-6 border-4 border-amber-700"
                style={{ boxShadow: '4px 4px 12px rgba(0,0,0,0.4)' }}
              >
                <div className="text-3xl font-bold mb-3 text-amber-200" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>{word.word}</div>
                <div className="text-xl text-amber-100 mb-2">{word.translation}</div>
                <div className="text-xs text-amber-400 mt-3 font-bold">{word.date}</div>
              </motion.div>
            ))}
          </div>
          {filteredPastWords.length === 0 && (
            <div className="text-center py-16">
              <div className="text-8xl mb-4">📚</div>
              <p className="text-2xl text-amber-200 font-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>NO PAST WORDS YET</p>
              <p className="text-lg text-amber-300 mt-2">Learn some words first!</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (showQuiz && !quizFinished) {
    const currentWord = quizWords[currentQuizIndex]
    
    return (
      <div className="h-full flex flex-col bg-gradient-to-br from-amber-900 via-orange-800 to-red-900 text-white" style={{ fontFamily: 'monospace' }}>
        <div className="bg-amber-950 border-b-4 border-amber-600 p-4" style={{ boxShadow: '0 4px 8px rgba(0,0,0,0.3)' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>📝 QUIZ - {LANGUAGE_NAMES[selectedLanguage].toUpperCase()}</h2>
            <div className="text-xl font-bold text-amber-200">
              QUESTION {currentQuizIndex + 1} / {quizWords.length}
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-2xl w-full">
            <motion.div
              key={currentQuizIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-amber-950 rounded-lg p-8 border-4 border-amber-600"
              style={{ boxShadow: '4px 4px 12px rgba(0,0,0,0.4)' }}
            >
              <div className="text-8xl mb-6">📖</div>
              <h3 className="text-5xl font-bold mb-8 text-amber-200" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>{currentWord.word}</h3>
              <input
                type="text"
                value={quizAnswer}
                onChange={(e) => setQuizAnswer(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && checkQuizAnswer()}
                placeholder="Type the English translation..."
                className="w-full px-6 py-4 text-3xl text-black rounded-lg mb-6 focus:outline-none border-4 border-amber-800 font-bold"
                style={{ fontFamily: 'monospace', boxShadow: '4px 4px 8px rgba(0,0,0,0.3)' }}
                autoFocus
              />
              <button
                onClick={checkQuizAnswer}
                className="px-10 py-5 bg-amber-600 hover:bg-amber-500 border-4 border-amber-800 rounded-lg font-bold text-2xl transition-all transform hover:scale-105"
                style={{ boxShadow: '4px 4px 8px rgba(0,0,0,0.3)', fontFamily: 'monospace' }}
              >
                SUBMIT ANSWER
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    )
  }

  if (showQuiz && quizFinished) {
    return (
      <div className="h-full flex flex-col bg-gradient-to-br from-amber-900 via-orange-800 to-red-900 text-white" style={{ fontFamily: 'monospace' }}>
        <div className="bg-amber-950 border-b-4 border-amber-600 p-4" style={{ boxShadow: '0 4px 8px rgba(0,0,0,0.3)' }}>
          <h2 className="text-3xl font-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>📝 QUIZ RESULTS</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center bg-amber-950 rounded-lg p-8 border-4 border-amber-600"
            style={{ boxShadow: '4px 4px 12px rgba(0,0,0,0.4)' }}
          >
            <div className="text-8xl mb-6">🎉</div>
            <h3 className="text-5xl font-bold mb-4 text-amber-200" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
              SCORE: {quizScore} / {quizWords.length}
            </h3>
            <p className="text-3xl mb-8 text-amber-100 font-bold">
              {Math.round((quizScore / quizWords.length) * 100)}% CORRECT
            </p>
            <button
              onClick={resetQuiz}
              className="px-10 py-5 bg-amber-600 hover:bg-amber-500 border-4 border-amber-800 rounded-lg font-bold text-2xl transition-all transform hover:scale-105"
              style={{ boxShadow: '4px 4px 8px rgba(0,0,0,0.3)', fontFamily: 'monospace' }}
            >
              TRY AGAIN
            </button>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-amber-900 via-orange-800 to-red-900 text-white" style={{ fontFamily: 'monospace' }}>
      <div className="bg-amber-950 border-b-4 border-amber-600 p-4" style={{ boxShadow: '0 4px 8px rgba(0,0,0,0.3)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>🌍 LANGUAGE LEARNING</h2>
          <div className="flex gap-2">
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value as Language)}
              className="px-4 py-2 bg-amber-600 rounded-lg font-bold border-4 border-amber-800 text-lg"
              style={{ boxShadow: '2px 2px 4px rgba(0,0,0,0.3)', fontFamily: 'monospace' }}
            >
              <option value="spanish">SPANISH</option>
              <option value="italian">ITALIAN</option>
              <option value="french">FRENCH</option>
            </select>
            <button
              onClick={() => setShowPastWords(true)}
              className="px-6 py-3 bg-amber-600 hover:bg-amber-500 border-4 border-amber-800 rounded-lg font-bold text-lg transition-all"
              style={{ boxShadow: '2px 2px 4px rgba(0,0,0,0.3)', fontFamily: 'monospace' }}
            >
              📚 PAST WORDS
            </button>
          </div>
        </div>
        <button
          onClick={startQuiz}
          className="px-8 py-4 bg-green-600 hover:bg-green-500 border-4 border-green-800 rounded-lg font-bold text-xl transition-all transform hover:scale-105"
          style={{ boxShadow: '4px 4px 8px rgba(0,0,0,0.3)', fontFamily: 'monospace' }}
        >
          🎯 START QUIZ
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin text-8xl mb-4">⟳</div>
            <p className="text-2xl font-bold text-amber-200" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>GENERATING WORDS...</p>
          </div>
        ) : dailyWords.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-8xl mb-4">📖</div>
            <p className="text-2xl font-bold text-amber-200" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>NO WORDS FOR TODAY YET</p>
            <p className="text-lg text-amber-300 mt-2">Generating...</p>
          </div>
        ) : (
          <div>
            <h3 className="text-2xl font-bold mb-6 text-amber-200" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
              📖 TODAY'S WORDS - {LANGUAGE_NAMES[selectedLanguage].toUpperCase()} ({dailyWords.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dailyWords.map((word, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-amber-900 rounded-lg p-6 border-4 border-amber-700 hover:border-amber-500 transition-all"
                  style={{ boxShadow: '4px 4px 12px rgba(0,0,0,0.4)' }}
                >
                  <div className="text-4xl font-bold mb-3 text-amber-200" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>{word.word}</div>
                  <div className="text-2xl text-amber-100 font-bold">{word.translation}</div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

