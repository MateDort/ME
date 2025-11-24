import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

export async function POST(req: NextRequest) {
  try {
    const { apiKey } = await req.json()

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 400 }
      )
    }

    // Fetch Whoop data
    // Note: This is a placeholder - you'll need to use the actual Whoop API endpoints
    // The Whoop API typically requires OAuth, so this is a simplified version
    try {
      // Example: Fetch recovery, strain, and sleep data
      // Replace with actual Whoop API endpoints
      const today = new Date()
      const metrics = []

      // Generate sample data for demonstration
      // In production, replace this with actual Whoop API calls
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        metrics.push({
          date: date.toISOString().split('T')[0],
          recovery: Math.floor(Math.random() * 40) + 50, // 50-90%
          strain: Math.floor(Math.random() * 10) + 10, // 10-20
          sleep: Math.floor(Math.random() * 3) + 6, // 6-9 hours
          heartRate: {
            resting: Math.floor(Math.random() * 10) + 45, // 45-55 bpm
            max: Math.floor(Math.random() * 30) + 160, // 160-190 bpm
            avg: Math.floor(Math.random() * 20) + 60, // 60-80 bpm
          },
        })
      }

      return NextResponse.json({ metrics })
    } catch (error: any) {
      console.error('Whoop API error:', error)
      // Return sample data if API fails (for development)
      const today = new Date()
      const metrics = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        metrics.push({
          date: date.toISOString().split('T')[0],
          recovery: Math.floor(Math.random() * 40) + 50,
          strain: Math.floor(Math.random() * 10) + 10,
          sleep: Math.floor(Math.random() * 3) + 6,
          heartRate: {
            resting: Math.floor(Math.random() * 10) + 45,
            max: Math.floor(Math.random() * 30) + 160,
            avg: Math.floor(Math.random() * 20) + 60,
          },
        })
      }
      return NextResponse.json({ metrics })
    }
  } catch (error) {
    console.error('Health analyze error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze health data' },
      { status: 500 }
    )
  }
}

