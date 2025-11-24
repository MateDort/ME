/**
 * Formats AI responses to remove markdown and use proper HTML formatting
 */
export function formatResponse(text: string): string {
  if (!text) return ''

  // Remove markdown formatting
  let formatted = text
    // Remove markdown code blocks but keep content
    .replace(/```[\w]*\n?([\s\S]*?)```/g, '$1')
    // Remove markdown bold/italic markers
    .replace(/\*\*\*(.*?)\*\*\*/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    .replace(/_(.*?)_/g, '$1') // Remove italic, keep text
    // Remove markdown headers
    .replace(/^#{1,6}\s+(.*)$/gm, '<strong>$1</strong>')
    // Remove markdown links but keep text
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    // Remove markdown lists
    .replace(/^[\*\-\+]\s+(.*)$/gm, '$1')
    .replace(/^\d+\.\s+(.*)$/gm, '$1')
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  // Convert to proper paragraphs
  const paragraphs = formatted.split(/\n\n+/).filter(p => p.trim())
  
  return paragraphs
    .map(para => {
      // Convert single line breaks to <br> within paragraphs
      const withBreaks = para.replace(/\n/g, '<br>')
      // Wrap in paragraph tag with styling for bold
      return `<p class="mb-2">${withBreaks}</p>`
    })
    .join('')
}

/**
 * Formats response for plain text display (removes all markdown)
 */
export function formatPlainText(text: string): string {
  if (!text) return ''

  return text
    .replace(/```[\w]*\n?([\s\S]*?)```/g, '$1')
    .replace(/\*\*\*(.*?)\*\*\*/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[\*\-\+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .trim()
}

