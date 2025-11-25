import { NextRequest, NextResponse } from 'next/server'
import { MATE_PROFILE } from '@/lib/mate-profile'
import { getClaudeClient, handleClaudeError } from '@/lib/claude-client'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { CLAUDE_MODELS, GEMINI_MODELS } from '@/lib/models'

export async function POST(req: NextRequest) {
  try {
    const { prompt, model, mode, image, existingFiles, projectDescription, filePath, fileType, todo } = await req.json()

    if (!model) {
      return NextResponse.json({ error: 'Model is required' }, { status: 400 })
    }

    const isClaude = CLAUDE_MODELS.includes(model)
    const isGemini = GEMINI_MODELS.includes(model)

    if (!isClaude && !isGemini) {
      return NextResponse.json({ error: 'Invalid model selected' }, { status: 400 })
    }

    // Build context
    const context = existingFiles && existingFiles.length > 0
      ? `\n\nExisting files in project:\n${existingFiles.map((f: any) => `${f.path}: ${f.content.substring(0, 200)}...`).join('\n')}`
      : ''

    const taskContext = todo ? `\n\nCurrent task: ${todo.task}` : ''
    const fileContext = filePath ? `\n\nGenerating file: ${filePath} (${fileType})` : ''

    if (isClaude) {
      const claude = getClaudeClient()
      
      let systemPrompt = ''
      if (mode === 'agent') {
        systemPrompt = `${MATE_PROFILE}

I am building: ${projectDescription || 'a project'}
${taskContext}${fileContext}

I generate complete, working code.
- For HTML files, include all necessary CSS and JavaScript inline if it's a single-file project
- For JavaScript: Use BROWSER-COMPATIBLE code only. NO require(), NO Node.js modules, NO axios. Use fetch() and vanilla JS
- Forms must use event.preventDefault() to prevent page navigation
- All code must run client-side in a browser
- Return ONLY the code, no markdown, no explanations${context}`
      } else {
        systemPrompt = `${MATE_PROFILE}

I answer questions about code and projects. I provide helpful explanations and guidance.${context}`
      }

      const messages: any[] = []
      
      // Handle image if provided
      if (image && mode === 'agent') {
        messages.push({
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: image.mimeType || 'image/png',
                data: image.data,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        })
      } else {
        messages.push({
          role: 'user',
          content: prompt,
        })
      }

      const response = await claude.messages.create({
        model: model,
        max_tokens: model.includes('haiku') ? 4096 : 8192,
        system: systemPrompt,
        messages,
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      
      // Clean up markdown code blocks
      const cleanedText = text
        .replace(/^```[\w]*\n?/gm, '')
        .replace(/```$/gm, '')
        .replace(/^```/gm, '')
        .trim()

      return NextResponse.json({ 
        response: cleanedText,
        model: model,
      })
    } else if (isGemini) {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
      if (!apiKey) {
        return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
      }

      const genAI = new GoogleGenerativeAI(apiKey)
      const geminiModel = genAI.getGenerativeModel({ model: model })

      let fullPrompt = prompt
      if (mode === 'agent') {
        fullPrompt = `You are a code generation assistant.

I am building: ${projectDescription || 'a project'}
${taskContext}${fileContext}

I generate complete, working code.
- For HTML files, include all necessary CSS and JavaScript inline if it's a single-file project
- For JavaScript: Use BROWSER-COMPATIBLE code only. NO require(), NO Node.js modules, NO axios. Use fetch() and vanilla JS
- Forms must use event.preventDefault() to prevent page navigation
- All code must run client-side in a browser
- Return ONLY the code, no markdown, no explanations${context}

User request: ${prompt}`
      } else {
        fullPrompt = `You are a helpful coding assistant.

I answer questions about code and projects. I provide helpful explanations and guidance.${context}

Question: ${prompt}`
      }

      // Handle image if provided
      if (image && model.includes('vision')) {
        const imagePart = {
          inlineData: {
            data: image.data,
            mimeType: image.mimeType || 'image/png',
          },
        }
        const result = await geminiModel.generateContent([fullPrompt, imagePart])
        const response = await result.response
        const text = response.text()
        return NextResponse.json({ 
          response: text,
          model: model,
        })
      } else {
        const result = await geminiModel.generateContent(fullPrompt)
        const response = await result.response
        const text = response.text()
        
        // Clean up markdown code blocks
        const cleanedText = text
          .replace(/^```[\w]*\n?/gm, '')
          .replace(/```$/gm, '')
          .replace(/^```/gm, '')
          .trim()
        
        return NextResponse.json({ 
          response: cleanedText,
          model: model,
        })
      }
    }

    return NextResponse.json({ error: 'Unsupported model' }, { status: 400 })
  } catch (error: any) {
    console.error('Generate with model error:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to generate response',
        response: '',
      },
      { status: 500 }
    )
  }
}

