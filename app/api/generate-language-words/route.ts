import { NextRequest, NextResponse } from 'next/server'
import { getClaudeClient, handleClaudeError } from '@/lib/claude-client'

const LANGUAGE_WORDS: Record<string, string[]> = {
  spanish: [
    'hola', 'adiós', 'gracias', 'por favor', 'sí', 'no', 'agua', 'comida', 'casa', 'amigo',
    'trabajo', 'tiempo', 'día', 'noche', 'bueno', 'malo', 'grande', 'pequeño', 'nuevo', 'viejo',
    'fácil', 'difícil', 'rápido', 'lento', 'caliente', 'frío', 'alto', 'bajo', 'rico', 'pobre',
  ],
  italian: [
    'ciao', 'arrivederci', 'grazie', 'per favore', 'sì', 'no', 'acqua', 'cibo', 'casa', 'amico',
    'lavoro', 'tempo', 'giorno', 'notte', 'buono', 'cattivo', 'grande', 'piccolo', 'nuovo', 'vecchio',
    'facile', 'difficile', 'veloce', 'lento', 'caldo', 'freddo', 'alto', 'basso', 'ricco', 'povero',
  ],
  french: [
    'bonjour', 'au revoir', 'merci', 's\'il vous plaît', 'oui', 'non', 'eau', 'nourriture', 'maison', 'ami',
    'travail', 'temps', 'jour', 'nuit', 'bon', 'mauvais', 'grand', 'petit', 'nouveau', 'vieux',
    'facile', 'difficile', 'rapide', 'lent', 'chaud', 'froid', 'haut', 'bas', 'riche', 'pauvre',
  ],
}

const TRANSLATIONS: Record<string, Record<string, string>> = {
  spanish: {
    'hola': 'hello', 'adiós': 'goodbye', 'gracias': 'thank you', 'por favor': 'please',
    'sí': 'yes', 'no': 'no', 'agua': 'water', 'comida': 'food', 'casa': 'house', 'amigo': 'friend',
    'trabajo': 'work', 'tiempo': 'time', 'día': 'day', 'noche': 'night', 'bueno': 'good', 'malo': 'bad',
    'grande': 'big', 'pequeño': 'small', 'nuevo': 'new', 'viejo': 'old', 'fácil': 'easy', 'difícil': 'difficult',
    'rápido': 'fast', 'lento': 'slow', 'caliente': 'hot', 'frío': 'cold', 'alto': 'tall', 'bajo': 'short',
    'rico': 'rich', 'pobre': 'poor',
  },
  italian: {
    'ciao': 'hello', 'arrivederci': 'goodbye', 'grazie': 'thank you', 'per favore': 'please',
    'sì': 'yes', 'no': 'no', 'acqua': 'water', 'cibo': 'food', 'casa': 'house', 'amico': 'friend',
    'lavoro': 'work', 'tempo': 'time', 'giorno': 'day', 'notte': 'night', 'buono': 'good', 'cattivo': 'bad',
    'grande': 'big', 'piccolo': 'small', 'nuovo': 'new', 'vecchio': 'old', 'facile': 'easy', 'difficile': 'difficult',
    'veloce': 'fast', 'lento': 'slow', 'caldo': 'hot', 'freddo': 'cold', 'alto': 'tall', 'basso': 'short',
    'ricco': 'rich', 'povero': 'poor',
  },
  french: {
    'bonjour': 'hello', 'au revoir': 'goodbye', 'merci': 'thank you', 's\'il vous plaît': 'please',
    'oui': 'yes', 'non': 'no', 'eau': 'water', 'nourriture': 'food', 'maison': 'house', 'ami': 'friend',
    'travail': 'work', 'temps': 'time', 'jour': 'day', 'nuit': 'night', 'bon': 'good', 'mauvais': 'bad',
    'grand': 'big', 'petit': 'small', 'nouveau': 'new', 'vieux': 'old', 'facile': 'easy', 'difficile': 'difficult',
    'rapide': 'fast', 'lent': 'slow', 'chaud': 'hot', 'froid': 'cold', 'haut': 'tall', 'bas': 'short',
    'riche': 'rich', 'pauvre': 'poor',
  },
}

export async function POST(req: NextRequest) {
  try {
    const { language, count = 10 } = await req.json()
    
    if (!language || !['spanish', 'italian', 'french'].includes(language)) {
      return NextResponse.json({ error: 'Invalid language' }, { status: 400 })
    }

    // Get available words for the language
    const availableWords = LANGUAGE_WORDS[language] || []
    const translations = TRANSLATIONS[language] || {}
    
    // Shuffle and pick random words
    const shuffled = [...availableWords].sort(() => Math.random() - 0.5)
    const selectedWords = shuffled.slice(0, Math.min(count, availableWords.length))
    
    // Create word objects with translations
    const words = selectedWords.map(word => ({
      word,
      translation: translations[word] || word,
    }))

    return NextResponse.json({ words })
  } catch (error) {
    const errorInfo = handleClaudeError(error)
    return NextResponse.json({ error: errorInfo.message }, { status: 500 })
  }
}

