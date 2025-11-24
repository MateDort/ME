'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface HealthMetric {
  date: string
  recovery: number
  strain: number
  sleep: number
  heartRate: {
    resting: number
    max: number
    avg: number
  }
  // Extended data
  recovery?: {
    score: number
    restingHeartRate: number
    hrv: number
    skinTempCelsius: number
    spo2: number
    state: string
    recoveryRate: number
  }
  cycle?: {
    strain: number
    kilojoule: number
    averageHeartRate: number
    maxHeartRate: number
    zoneZeroDuration: number
    zoneOneDuration: number
    zoneTwoDuration: number
    zoneThreeDuration: number
    zoneFourDuration: number
    zoneFiveDuration: number
  }
  sleep?: {
    totalSleepTimeMs: number
    totalSleepTimeHours: number
    sleepNeedFromSleepDebt: number
    sleepNeedFromRecentStrain: number
    sleepNeedFromRecentNap: number
    sleepConsistency: number
    sleepEfficiency: number
    respiratoryRate: number
    sleepPerformance: number
    sleepDebt: number
    naps: any[]
  }
  workouts?: Array<{
    id: string
    sport: string
    score: number
    averageHeartRate: number
    maxHeartRate: number
    kilojoule: number
    duration: number
    distance: number
    altitude: number
  }>
}

interface HealthSummary {
  totalDays: number
  dateRange: {
    start: string
    end: string
  }
  totalWorkouts: number
  averageRecovery: number
  averageStrain: number
  averageSleep: number
}

interface HealthInsight {
  summary: string
  recommendations: string[]
  trends: string
}

export default function HealthApp() {
  const [metrics, setMetrics] = useState<HealthMetric[]>([])
  const [insights, setInsights] = useState<HealthInsight | null>(null)
  const [summary, setSummary] = useState<HealthSummary | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [bodyMeasurements, setBodyMeasurements] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  
  useEffect(() => {
    // Check localStorage first
    const storedAuth = localStorage.getItem('whoop_authenticated')
    if (storedAuth === 'true') {
      // If we have stored auth, check if it's still valid
      checkAuth()
      return
    }
    
    // Check if we just came back from Whoop auth (non-popup flow)
    const urlParams = new URLSearchParams(window.location.search)
    const whoopAuth = urlParams.get('whoop_auth')
    const error = urlParams.get('error')
    
    // Clean up URL params
    if (whoopAuth || error) {
      window.history.replaceState({}, '', window.location.pathname)
    }
    
    // If there's an error, show it
    if (error) {
      console.error('Whoop auth error:', error)
      setIsCheckingAuth(false)
      setIsAuthenticated(false)
      localStorage.removeItem('whoop_authenticated')
      return
    }
    
    // If we just authenticated (non-popup), wait a moment for cookies to be set, then check
    if (whoopAuth === 'success') {
      console.log('Whoop auth successful, waiting for cookies...')
      setTimeout(() => {
        checkAuth()
      }, 1000)
    } else {
      checkAuth()
    }
  }, [])

  const checkAuth = async () => {
    setIsCheckingAuth(true)
    try {
      const response = await fetch('/api/whoop/data')
      if (response.ok) {
        console.log('Whoop auth check: Success')
        setIsAuthenticated(true)
        localStorage.setItem('whoop_authenticated', 'true')
        fetchHealthData()
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.log('Whoop auth check: Failed', errorData)
        setIsAuthenticated(false)
        localStorage.removeItem('whoop_authenticated')
      }
    } catch (error) {
      console.error('Whoop auth check error:', error)
      setIsAuthenticated(false)
      localStorage.removeItem('whoop_authenticated')
    } finally {
      setIsCheckingAuth(false)
    }
  }

  const handleConnect = () => {
    // Open OAuth in a popup window to avoid redirect loops
    const width = 600
    const height = 700
    const left = (window.screen.width - width) / 2
    const top = (window.screen.height - height) / 2
    
    const popup = window.open(
      '/api/whoop/auth?popup=true',
      'whoop-auth',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
    )

    if (!popup) {
      alert('Please allow popups for this site to connect to Whoop')
      return
    }

    // Listen for postMessage from callback
    const messageHandler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data.type === 'whoop_auth_success') {
        console.log('Received whoop_auth_success message')
        clearInterval(checkClosed)
        try {
          if (!popup.closed) {
            popup.close()
          }
        } catch (e) {
          console.log('Popup already closed')
        }
        window.removeEventListener('message', messageHandler)
        // Wait a bit longer for cookies to be fully set
        setTimeout(() => {
          checkAuth()
        }, 1500)
      }
    }
    window.addEventListener('message', messageHandler)

    // Also check if popup was closed manually
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed)
        window.removeEventListener('message', messageHandler)
        // Check auth in case user completed auth and closed popup
        // Wait a bit to ensure cookies are set
        setTimeout(() => {
          checkAuth()
        }, 1500)
      }
    }, 500)
    
    // Cleanup on unmount
    return () => {
      clearInterval(checkClosed)
      window.removeEventListener('message', messageHandler)
    }
  }

  const fetchHealthData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/whoop/data')
      if (response.ok) {
        const data = await response.json()
        if (data.metrics) {
          setMetrics(data.metrics)
        }
        if (data.summary) {
          setSummary(data.summary)
        }
        if (data.profile) {
          setProfile(data.profile)
        }
        if (data.bodyMeasurements) {
          setBodyMeasurements(data.bodyMeasurements)
        }
      }
    } catch (error) {
      console.error('Error fetching health data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateInsights = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/health/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics }),
      })

      const data = await response.json()
      if (data.insights) {
        setInsights(data.insights)
      }
    } catch (error) {
      console.error('Error generating insights:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isCheckingAuth) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-amber-900 via-orange-800 to-red-900 text-white">
        <div className="text-center p-8 bg-amber-950/50 border-4 border-amber-600 rounded-lg max-w-md">
          <div className="text-8xl mb-6">💊</div>
          <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: 'monospace', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>CHECKING AUTH...</h2>
          <p className="text-amber-200 text-lg" style={{ fontFamily: 'monospace' }}>
            Verifying connection...
          </p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-amber-900 via-orange-800 to-red-900 text-white">
        <div className="text-center p-8 bg-amber-950/50 border-4 border-amber-600 rounded-lg max-w-md">
          <div className="text-8xl mb-6">💊</div>
          <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: 'monospace', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>WHOOP HEALTH MONITOR</h2>
          <p className="text-amber-200 mb-6 text-lg" style={{ fontFamily: 'monospace' }}>
            Connect your Whoop account to view your health metrics in retro style
          </p>
          <button
            onClick={handleConnect}
            disabled={isLoading}
            className="px-8 py-4 bg-amber-600 hover:bg-amber-500 border-4 border-amber-800 rounded-lg font-bold text-xl transition-all transform hover:scale-105 disabled:opacity-50"
            style={{ fontFamily: 'monospace', boxShadow: '4px 4px 8px rgba(0,0,0,0.3)' }}
          >
            {isLoading ? 'CONNECTING...' : 'CONNECT WHOOP'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-amber-900 via-orange-800 to-red-900 text-white" style={{ fontFamily: 'monospace' }}>
      {/* Header - 1970s style */}
      <div className="bg-amber-950 border-b-4 border-amber-600 p-4" style={{ boxShadow: '0 4px 8px rgba(0,0,0,0.3)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>💊 WHOOP HEALTH MONITOR</h2>
          <div className="flex gap-2">
            <button
              onClick={fetchHealthData}
              disabled={isLoading}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 border-2 border-amber-800 rounded font-bold disabled:opacity-50 transition-all"
              style={{ boxShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}
            >
              {isLoading ? 'LOADING...' : '🔄 REFRESH'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {metrics.length === 0 && !insights ? (
          <div className="flex flex-col items-center justify-center h-full text-amber-200">
            <div className="text-8xl mb-4">💊</div>
            <p className="text-2xl mb-2 font-bold">NO DATA AVAILABLE</p>
            <p className="text-lg">Click REFRESH to load health metrics</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Stats */}
            {summary && (
              <div className="bg-amber-950/80 rounded-lg p-6 border-4 border-amber-600" style={{ boxShadow: '4px 4px 12px rgba(0,0,0,0.4)' }}>
                <h3 className="text-2xl font-bold mb-4 text-amber-200" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>📈 SUMMARY</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-amber-900 rounded p-3 border-2 border-amber-700">
                    <div className="text-xs text-amber-300 mb-1 font-bold">TOTAL DAYS</div>
                    <div className="text-2xl font-bold text-amber-200">{summary.totalDays}</div>
                  </div>
                  <div className="bg-amber-900 rounded p-3 border-2 border-amber-700">
                    <div className="text-xs text-amber-300 mb-1 font-bold">TOTAL WORKOUTS</div>
                    <div className="text-2xl font-bold text-orange-400">{summary.totalWorkouts}</div>
                  </div>
                  <div className="bg-amber-900 rounded p-3 border-2 border-amber-700">
                    <div className="text-xs text-amber-300 mb-1 font-bold">AVG RECOVERY</div>
                    <div className="text-2xl font-bold text-green-400">{Math.round(summary.averageRecovery)}%</div>
                  </div>
                  <div className="bg-amber-900 rounded p-3 border-2 border-amber-700">
                    <div className="text-xs text-amber-300 mb-1 font-bold">AVG SLEEP</div>
                    <div className="text-2xl font-bold text-blue-400">{summary.averageSleep.toFixed(1)}H</div>
                  </div>
                </div>
              </div>
            )}

            {/* Profile & Body Measurements */}
            {(profile || bodyMeasurements) && (
              <div className="bg-amber-950/80 rounded-lg p-6 border-4 border-amber-600" style={{ boxShadow: '4px 4px 12px rgba(0,0,0,0.4)' }}>
                <h3 className="text-2xl font-bold mb-4 text-amber-200" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>👤 PROFILE</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profile && (
                    <div className="bg-amber-900 rounded p-4 border-2 border-amber-700">
                      <div className="space-y-2 text-sm">
                        {profile.first_name && <div><span className="font-bold text-amber-200">Name:</span> {profile.first_name} {profile.last_name}</div>}
                        {profile.email && <div><span className="font-bold text-amber-200">Email:</span> {profile.email}</div>}
                        {profile.height_meter && <div><span className="font-bold text-amber-200">Height:</span> {(profile.height_meter * 100).toFixed(0)} cm</div>}
                        {profile.weight_kg && <div><span className="font-bold text-amber-200">Weight:</span> {profile.weight_kg.toFixed(1)} kg</div>}
                      </div>
                    </div>
                  )}
                  {bodyMeasurements && Object.keys(bodyMeasurements).length > 0 && (
                    <div className="bg-amber-900 rounded p-4 border-2 border-amber-700">
                      <div className="space-y-2 text-sm">
                        <div className="font-bold text-amber-200 mb-2">BODY MEASUREMENTS</div>
                        {bodyMeasurements.height_meter && <div><span className="font-bold">Height:</span> {(bodyMeasurements.height_meter * 100).toFixed(0)} cm</div>}
                        {bodyMeasurements.weight_kg && <div><span className="font-bold">Weight:</span> {bodyMeasurements.weight_kg.toFixed(1)} kg</div>}
                        {bodyMeasurements.max_heart_rate && <div><span className="font-bold">Max HR:</span> {bodyMeasurements.max_heart_rate} bpm</div>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Metrics Overview - 1970s style */}
            {metrics.length > 0 && (
              <div className="bg-amber-950/80 rounded-lg p-6 border-4 border-amber-600" style={{ boxShadow: '4px 4px 12px rgba(0,0,0,0.4)' }}>
                <h3 className="text-2xl font-bold mb-4 text-amber-200" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>📊 HEALTH METRICS ({metrics.length} DAYS)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {metrics.slice(-30).map((metric, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-amber-900 rounded-lg p-4 border-2 border-amber-700"
                      style={{ boxShadow: '2px 2px 6px rgba(0,0,0,0.3)' }}
                    >
                      <div className="text-xs text-amber-300 mb-2 font-bold">
                        {new Date(metric.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-amber-200">RECOVERY:</span>
                          <span
                            className={`text-lg font-bold ${
                              metric.recovery >= 67
                                ? 'text-green-400'
                                : metric.recovery >= 34
                                ? 'text-yellow-400'
                                : 'text-red-400'
                            }`}
                            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
                          >
                            {Math.round(metric.recovery)}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-amber-200">STRAIN:</span>
                          <span className="text-lg font-bold text-orange-400" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                            {Math.round(metric.strain)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-amber-200">SLEEP:</span>
                          <span className="text-lg font-bold text-blue-400" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                            {metric.sleep.toFixed(1)}H
                          </span>
                        </div>
                        {metric.recovery?.hrv && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-amber-200">HRV:</span>
                            <span className="text-sm font-bold text-purple-400">
                              {Math.round(metric.recovery.hrv)}ms
                            </span>
                          </div>
                        )}
                        {metric.workouts && metric.workouts.length > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-amber-200">WORKOUTS:</span>
                            <span className="text-sm font-bold text-red-400">
                              {metric.workouts.length}
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed Workouts */}
            {metrics.some(m => m.workouts && m.workouts.length > 0) && (
              <div className="bg-amber-950/80 rounded-lg p-6 border-4 border-amber-600" style={{ boxShadow: '4px 4px 12px rgba(0,0,0,0.4)' }}>
                <h3 className="text-2xl font-bold mb-4 text-amber-200" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>🏃 WORKOUTS</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {metrics
                    .filter(m => m.workouts && m.workouts.length > 0)
                    .flatMap(m => m.workouts!.map(w => ({ ...w, date: m.date })))
                    .slice(-20)
                    .reverse()
                    .map((workout, idx) => (
                      <div key={idx} className="bg-amber-900 rounded p-4 border-2 border-amber-700">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-bold text-amber-200">{workout.sport}</div>
                            <div className="text-xs text-amber-300">{workout.date}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-orange-400">Strain: {workout.score}</div>
                            {workout.duration > 0 && (
                              <div className="text-xs text-amber-300">
                                {(workout.duration / 60000).toFixed(0)} min
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          {workout.averageHeartRate > 0 && (
                            <div>
                              <span className="text-amber-300">Avg HR:</span> {workout.averageHeartRate} bpm
                            </div>
                          )}
                          {workout.maxHeartRate > 0 && (
                            <div>
                              <span className="text-amber-300">Max HR:</span> {workout.maxHeartRate} bpm
                            </div>
                          )}
                          {workout.kilojoule > 0 && (
                            <div>
                              <span className="text-amber-300">Energy:</span> {workout.kilojoule.toFixed(0)} kJ
                            </div>
                          )}
                          {workout.distance > 0 && (
                            <div>
                              <span className="text-amber-300">Distance:</span> {(workout.distance / 1000).toFixed(2)} km
                            </div>
                          )}
                          {workout.altitude > 0 && (
                            <div>
                              <span className="text-amber-300">Elevation:</span> {workout.altitude.toFixed(0)} m
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* AI Insights - 1970s style */}
            {insights ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-amber-950/80 rounded-lg p-6 border-4 border-amber-600"
                style={{ boxShadow: '4px 4px 12px rgba(0,0,0,0.4)' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-amber-200" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>🤖 AI ANALYSIS</h3>
                  <button
                    onClick={generateInsights}
                    disabled={isLoading || metrics.length === 0}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-500 border-2 border-amber-800 rounded font-bold text-sm disabled:opacity-50 transition-all"
                    style={{ boxShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}
                  >
                    🔄 REFRESH
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-amber-300 mb-2 text-lg">SUMMARY</h4>
                    <p className="text-amber-100 leading-relaxed" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                      {insights.summary}
                    </p>
                  </div>

                  {insights.recommendations.length > 0 && (
                    <div>
                      <h4 className="font-bold text-amber-300 mb-2 text-lg">
                        RECOMMENDATIONS
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-amber-100" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                        {insights.recommendations.map((rec, idx) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {insights.trends && (
                    <div>
                      <h4 className="font-bold text-amber-300 mb-2 text-lg">TRENDS</h4>
                      <p className="text-amber-100 leading-relaxed" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                        {insights.trends}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : metrics.length > 0 ? (
              <div className="bg-amber-950/80 rounded-lg p-6 border-4 border-amber-600 text-center" style={{ boxShadow: '4px 4px 12px rgba(0,0,0,0.4)' }}>
                <p className="text-amber-200 mb-4 text-lg font-bold">
                  READY TO GENERATE AI INSIGHTS
                </p>
                <button
                  onClick={generateInsights}
                  disabled={isLoading}
                  className="px-6 py-3 bg-amber-600 hover:bg-amber-500 border-2 border-amber-800 rounded-lg font-bold text-lg transition-all transform hover:scale-105 disabled:opacity-50"
                  style={{ boxShadow: '4px 4px 8px rgba(0,0,0,0.3)' }}
                >
                  {isLoading ? 'ANALYZING...' : '✨ GENERATE INSIGHTS'}
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

