import { NextRequest, NextResponse } from 'next/server'
import { MATE_PROFILE } from '@/lib/mate-profile'
import { formatPlainText } from '@/lib/format-response'
import { getClaudeClient, handleClaudeError } from '@/lib/claude-client'

export async function POST(req: NextRequest) {
  try {
    const { metrics } = await req.json()

    if (!metrics || metrics.length === 0) {
      return NextResponse.json(
        { error: 'No metrics provided' },
        { status: 400 }
      )
    }

    // Calculate averages and trends
    const avgRecovery =
      metrics.reduce((sum: number, m: any) => sum + m.recovery, 0) /
      metrics.length
    const avgStrain =
      metrics.reduce((sum: number, m: any) => sum + m.strain, 0) /
      metrics.length
    const avgSleep =
      metrics.reduce((sum: number, m: any) => sum + m.sleep, 0) / metrics.length

    const recoveryTrend =
      metrics[metrics.length - 1].recovery > metrics[0].recovery
        ? 'improving'
        : 'declining'
    const strainTrend =
      metrics[metrics.length - 1].strain > metrics[0].strain
        ? 'increasing'
        : 'decreasing'

    const prompt = `${MATE_PROFILE}

I am analyzing my own Whoop health data. Here's my data:

${JSON.stringify(metrics, null, 2)}

Key metrics:
- Average Recovery: ${avgRecovery.toFixed(1)}%
- Average Strain: ${avgStrain.toFixed(1)}
- Average Sleep: ${avgSleep.toFixed(1)} hours
- Recovery Trend: ${recoveryTrend}
- Strain Trend: ${strainTrend}

I provide personalized health insights for myself. I am specific, actionable, and consider my own personality (I'm driven, love learning, want to optimize everything). 

IMPORTANT: In all text fields, use proper paragraph breaks (double line breaks for new paragraphs). NEVER use markdown formatting like *** or ** or __. Write naturally in plain text.

Format your response as JSON with:
{
  "summary": "A brief 2-3 sentence summary of overall health status",
  "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"],
  "trends": "Analysis of trends and patterns in the data"
}`

    const claude = getClaudeClient()
    const response = await claude.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '{}'

    // Try to parse JSON from the response
    let insights
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/)
      const jsonText = jsonMatch ? jsonMatch[0].replace(/```json\n?/g, '').replace(/```/g, '') : text
      insights = JSON.parse(jsonText)
      
      // Format all text fields
      if (insights.summary) insights.summary = formatPlainText(insights.summary)
      if (insights.trends) insights.trends = formatPlainText(insights.trends)
      if (insights.recommendations) {
        insights.recommendations = insights.recommendations.map((r: string) => formatPlainText(r))
      }
    } catch (e) {
      // Fallback if JSON parsing fails
      const cleanText = formatPlainText(text)
      insights = {
        summary: cleanText.substring(0, 200),
        recommendations: [
          'Maintain consistent sleep schedule',
          'Monitor recovery trends',
          'Balance strain with adequate rest',
        ],
        trends: cleanText.substring(200, 400),
      }
      
      // Format the insights
      if (insights.summary) insights.summary = formatPlainText(insights.summary)
      if (insights.trends) insights.trends = formatPlainText(insights.trends)
      if (insights.recommendations) {
        insights.recommendations = insights.recommendations.map((r: string) => formatPlainText(r))
      }
    }

    return NextResponse.json({ insights })
  } catch (error: any) {
    const { message } = handleClaudeError(error)
    return NextResponse.json(
      {
        insights: {
          summary: `Unable to generate insights: ${message}. Please check your API key.`,
          recommendations: [
            'Check your API key in .env.local',
            'Ensure you have recent Whoop data',
            'Try refreshing the data',
          ],
          trends: 'Data analysis unavailable',
        },
      },
      { status: 200 }
    )
  }
}

