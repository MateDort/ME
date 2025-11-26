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
  recoveryDetails?: {
    score: number
    restingHeartRate: number
    hrv: number
    skinTempCelsius: number
    spo2: number
    state: string
    recoveryRate: number
  }
  cycleDetails?: {
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
  sleepDetails?: {
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

export default function HealthApp() {
  const [metrics, setMetrics] = useState<HealthMetric[]>([])
  const [summary, setSummary] = useState<HealthSummary | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [bodyMeasurements, setBodyMeasurements] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [currentTime, setCurrentTime] = useState('')
  const [selectedMetric, setSelectedMetric] = useState<HealthMetric | null>(null)
  
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('en-US', { 
        month: 'short',
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      }))
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])
  
  useEffect(() => {
    const storedAuth = localStorage.getItem('whoop_authenticated')
    if (storedAuth === 'true') {
      checkAuth()
      return
    }
    
    const urlParams = new URLSearchParams(window.location.search)
    const whoopAuth = urlParams.get('whoop_auth')
    const error = urlParams.get('error')
    
    if (whoopAuth || error) {
      window.history.replaceState({}, '', window.location.pathname)
    }
    
    if (error) {
      console.error('Whoop auth error:', error)
      setIsCheckingAuth(false)
      setIsAuthenticated(false)
      localStorage.removeItem('whoop_authenticated')
      return
    }
    
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
        setTimeout(() => {
          checkAuth()
        }, 1500)
      }
    }
    window.addEventListener('message', messageHandler)

    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed)
        window.removeEventListener('message', messageHandler)
        setTimeout(() => {
          checkAuth()
        }, 1500)
      }
    }, 500)
    
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

  // Get the latest metrics for header display
  const latestMetric = metrics.length > 0 ? metrics[metrics.length - 1] : null

  if (isCheckingAuth) {
    return (
      <div 
        className="h-full flex items-center justify-center"
        style={{
          background: 'linear-gradient(180deg, #e8e8f0 0%, #d8d8e8 100%)',
        }}
      >
        <div 
          className="text-center p-8 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(245,245,255,0.95) 100%)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.8)',
            border: '1px solid rgba(255,255,255,0.6)',
          }}
        >
          <div className="text-6xl mb-4">💊</div>
          <h2 
            className="text-2xl font-bold mb-2"
            style={{ 
              fontFamily: '"Lucida Grande", sans-serif',
              color: '#333',
            }}
          >
            Checking Authentication...
          </h2>
          <p 
            className="text-sm"
            style={{ 
              fontFamily: '"Lucida Grande", sans-serif',
              color: '#666',
            }}
          >
            Verifying your WHOOP connection
          </p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div 
        className="h-full flex items-center justify-center"
        style={{
          background: 'linear-gradient(180deg, #e8e8f0 0%, #d8d8e8 100%)',
        }}
      >
        <div 
          className="text-center p-12 rounded-2xl max-w-md"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(245,245,255,0.95) 100%)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.8)',
            border: '1px solid rgba(255,255,255,0.6)',
          }}
        >
          <div className="text-8xl mb-6">💊</div>
          <h2 
            className="text-3xl font-bold mb-4"
            style={{ 
              fontFamily: '"Lucida Grande", sans-serif',
              color: '#333',
            }}
          >
            WHOOP Health
          </h2>
          <p 
            className="mb-8 text-base"
            style={{ 
              fontFamily: '"Lucida Grande", sans-serif',
              color: '#666',
            }}
          >
            Connect your WHOOP account to view your health metrics
          </p>
          <button
            onClick={handleConnect}
            disabled={isLoading}
            className="px-8 py-3 rounded-full font-bold text-base transition-all disabled:opacity-50"
            style={{
              fontFamily: '"Lucida Grande", sans-serif',
              background: isLoading 
                ? 'linear-gradient(180deg, #ccc 0%, #aaa 100%)' 
                : 'linear-gradient(180deg, #5195E5 0%, #3A7FD5 100%)',
              color: 'white',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.5)',
              border: '1px solid rgba(255,255,255,0.3)',
            }}
          >
            {isLoading ? 'Connecting...' : 'Connect WHOOP'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="h-full flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #e8e8f0 0%, #d8d8e8 100%)',
      }}
    >
      {/* Header with latest metrics - Aqua style */}
      <div 
        className="px-6 py-3 flex items-center justify-between"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(240,240,255,0.9) 100%)',
          borderBottom: '1px solid rgba(0,0,0,0.1)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)',
        }}
      >
        <div className="flex items-center gap-4">
          <div 
            className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
            style={{
              background: 'linear-gradient(135deg, #E06C9F 0%, #C44B8A 100%)',
              boxShadow: '0 4px 12px rgba(224,108,159,0.4), inset 0 1px 0 rgba(255,255,255,0.5)',
              border: '1px solid rgba(255,255,255,0.3)',
            }}
          >
            💊
          </div>
          <div>
            <h2 
              className="font-bold text-xl"
              style={{ 
                fontFamily: '"Lucida Grande", sans-serif',
                color: '#333',
              }}
            >
              WHOOP Health
            </h2>
            <p 
              className="text-xs"
              style={{ 
                fontFamily: '"Lucida Grande", sans-serif',
                color: '#666',
              }}
            >
              {currentTime}
              {latestMetric && (
                <span className="ml-3 font-bold" style={{ color: '#5195E5' }}>
                  {Math.round(latestMetric.recovery)}% • {latestMetric.sleep.toFixed(1)}H • {latestMetric.strain.toFixed(1)}
                </span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={fetchHealthData}
          disabled={isLoading}
          className="px-5 py-2 rounded-full font-bold text-sm transition-all disabled:opacity-50"
          style={{
            fontFamily: '"Lucida Grande", sans-serif',
            background: isLoading 
              ? 'linear-gradient(180deg, #ccc 0%, #aaa 100%)' 
              : 'linear-gradient(180deg, #5195E5 0%, #3A7FD5 100%)',
            color: 'white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.5)',
            border: '1px solid rgba(255,255,255,0.3)',
          }}
        >
          {isLoading ? '⏳ Loading...' : '🔄 Refresh'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {metrics.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div 
              className="text-center p-12 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(245,245,255,0.95) 100%)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8)',
                border: '1px solid rgba(255,255,255,0.6)',
              }}
            >
              <div className="text-8xl mb-4">💊</div>
              <p 
                className="text-xl font-bold mb-2"
                style={{ 
                  fontFamily: '"Lucida Grande", sans-serif',
                  color: '#333',
                }}
              >
                No Data Available
              </p>
              <p 
                className="text-base"
                style={{ 
                  fontFamily: '"Lucida Grande", sans-serif',
                  color: '#666',
                }}
              >
                Click Refresh to load your health metrics
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Stats - Aqua Style */}
            {summary && (
              <div 
                className="rounded-2xl p-6"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(245,245,255,0.95) 100%)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8)',
                  border: '1px solid rgba(255,255,255,0.6)',
                }}
              >
                <h3 
                  className="text-lg font-bold mb-4"
                  style={{ 
                    fontFamily: '"Lucida Grande", sans-serif',
                    color: '#333',
                  }}
                >
                  📊 Summary ({summary.totalDays} days)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div 
                    className="rounded-xl p-4"
                    style={{
                      background: 'linear-gradient(135deg, #8FD6E1 0%, #6FC5D8 100%)',
                      boxShadow: '0 3px 10px rgba(143,214,225,0.4), inset 0 1px 0 rgba(255,255,255,0.5)',
                      border: '1px solid rgba(255,255,255,0.3)',
                    }}
                  >
                    <div 
                      className="text-xs font-bold mb-1"
                      style={{ 
                        fontFamily: '"Lucida Grande", sans-serif',
                        color: 'rgba(0,0,0,0.6)',
                      }}
                    >
                      Days Tracked
                    </div>
                    <div 
                      className="text-3xl font-bold"
                      style={{ color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
                    >
                      {summary.totalDays}
                    </div>
                  </div>
                  <div 
                    className="rounded-xl p-4"
                    style={{
                      background: 'linear-gradient(135deg, #FFB347 0%, #FF9D21 100%)',
                      boxShadow: '0 3px 10px rgba(255,179,71,0.4), inset 0 1px 0 rgba(255,255,255,0.5)',
                      border: '1px solid rgba(255,255,255,0.3)',
                    }}
                  >
                    <div 
                      className="text-xs font-bold mb-1"
                      style={{ 
                        fontFamily: '"Lucida Grande", sans-serif',
                        color: 'rgba(0,0,0,0.6)',
                      }}
                    >
                      Workouts
                    </div>
                    <div 
                      className="text-3xl font-bold"
                      style={{ color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
                    >
                      {summary.totalWorkouts}
                    </div>
                  </div>
                  <div 
                    className="rounded-xl p-4"
                    style={{
                      background: 'linear-gradient(135deg, #90EE90 0%, #6FD86F 100%)',
                      boxShadow: '0 3px 10px rgba(144,238,144,0.4), inset 0 1px 0 rgba(255,255,255,0.5)',
                      border: '1px solid rgba(255,255,255,0.3)',
                    }}
                  >
                    <div 
                      className="text-xs font-bold mb-1"
                      style={{ 
                        fontFamily: '"Lucida Grande", sans-serif',
                        color: 'rgba(0,0,0,0.6)',
                      }}
                    >
                      Avg Recovery
                    </div>
                    <div 
                      className="text-3xl font-bold"
                      style={{ color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
                    >
                      {Math.round(summary.averageRecovery)}%
                    </div>
                  </div>
                  <div 
                    className="rounded-xl p-4"
                    style={{
                      background: 'linear-gradient(135deg, #B19CD9 0%, #9B7FC9 100%)',
                      boxShadow: '0 3px 10px rgba(177,156,217,0.4), inset 0 1px 0 rgba(255,255,255,0.5)',
                      border: '1px solid rgba(255,255,255,0.3)',
                    }}
                  >
                    <div 
                      className="text-xs font-bold mb-1"
                      style={{ 
                        fontFamily: '"Lucida Grande", sans-serif',
                        color: 'rgba(0,0,0,0.6)',
                      }}
                    >
                      Avg Sleep
                    </div>
                    <div 
                      className="text-3xl font-bold"
                      style={{ color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
                    >
                      {summary.averageSleep.toFixed(1)}H
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Profile - Aqua Style */}
            {(profile || bodyMeasurements) && (
              <div 
                className="rounded-2xl p-6"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(245,245,255,0.95) 100%)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8)',
                  border: '1px solid rgba(255,255,255,0.6)',
                }}
              >
                <h3 
                  className="text-lg font-bold mb-4"
                  style={{ 
                    fontFamily: '"Lucida Grande", sans-serif',
                    color: '#333',
                  }}
                >
                  👤 Profile
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profile && (
                    <div 
                      className="rounded-xl p-4"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(240,240,255,0.8) 100%)',
                        border: '1px solid rgba(0,0,0,0.1)',
                      }}
                    >
                      <div 
                        className="space-y-2 text-sm"
                        style={{ 
                          fontFamily: '"Lucida Grande", sans-serif',
                          color: '#333',
                        }}
                      >
                        {profile.first_name && <div><span className="font-bold">Name:</span> {profile.first_name} {profile.last_name}</div>}
                        {profile.email && <div><span className="font-bold">Email:</span> {profile.email}</div>}
                        {profile.height_meter && <div><span className="font-bold">Height:</span> {(profile.height_meter * 100).toFixed(0)} cm</div>}
                        {profile.weight_kg && <div><span className="font-bold">Weight:</span> {profile.weight_kg.toFixed(1)} kg</div>}
                      </div>
                    </div>
                  )}
                  {bodyMeasurements && Object.keys(bodyMeasurements).length > 0 && (
                    <div 
                      className="rounded-xl p-4"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(240,240,255,0.8) 100%)',
                        border: '1px solid rgba(0,0,0,0.1)',
                      }}
                    >
                      <div 
                        className="space-y-2 text-sm"
                        style={{ 
                          fontFamily: '"Lucida Grande", sans-serif',
                          color: '#333',
                        }}
                      >
                        <div className="font-bold mb-2">Body Measurements</div>
                        {bodyMeasurements.height_meter && <div><span className="font-bold">Height:</span> {(bodyMeasurements.height_meter * 100).toFixed(0)} cm</div>}
                        {bodyMeasurements.weight_kg && <div><span className="font-bold">Weight:</span> {bodyMeasurements.weight_kg.toFixed(1)} kg</div>}
                        {bodyMeasurements.max_heart_rate && <div><span className="font-bold">Max HR:</span> {bodyMeasurements.max_heart_rate} bpm</div>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Daily Metrics - Aqua Style with prominent recovery/sleep/strain */}
            {metrics.length > 0 && (
              <div 
                className="rounded-2xl p-6"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(245,245,255,0.95) 100%)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8)',
                  border: '1px solid rgba(255,255,255,0.6)',
                }}
              >
                <h3 
                  className="text-lg font-bold mb-4"
                  style={{ 
                    fontFamily: '"Lucida Grande", sans-serif',
                    color: '#333',
                  }}
                >
                  📈 Daily Metrics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {metrics.slice(-30).reverse().map((metric, idx) => (
                    <motion.button
                      key={idx}
                      onClick={() => setSelectedMetric(metric)}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="rounded-xl p-4 text-left w-full cursor-pointer"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(245,245,255,0.9) 100%)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)',
                        border: '1px solid rgba(255,255,255,0.5)',
                      }}
                    >
                      <div 
                        className="text-xs font-bold mb-3 pb-2"
                        style={{ 
                          fontFamily: '"Lucida Grande", sans-serif',
                          color: '#5195E5',
                          borderBottom: '1px solid rgba(0,0,0,0.1)',
                        }}
                      >
                        {new Date(metric.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span 
                            className="text-xs font-bold"
                            style={{ 
                              fontFamily: '"Lucida Grande", sans-serif',
                              color: '#666',
                            }}
                          >
                            Recovery:
                          </span>
                          <span
                            className="text-2xl font-bold"
                            style={{
                              fontFamily: '"Lucida Grande", sans-serif',
                              color: metric.recovery >= 67 ? '#6FD86F' : metric.recovery >= 34 ? '#FFB347' : '#FF6B6B',
                              textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            }}
                          >
                            {Math.round(metric.recovery)}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span 
                            className="text-xs font-bold"
                            style={{ 
                              fontFamily: '"Lucida Grande", sans-serif',
                              color: '#666',
                            }}
                          >
                            Sleep:
                          </span>
                          <span 
                            className="text-2xl font-bold"
                            style={{ 
                              fontFamily: '"Lucida Grande", sans-serif',
                              color: '#9B7FC9',
                              textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            }}
                          >
                            {metric.sleep.toFixed(1)}H
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span 
                            className="text-xs font-bold"
                            style={{ 
                              fontFamily: '"Lucida Grande", sans-serif',
                              color: '#666',
                            }}
                          >
                            Strain:
                          </span>
                          <span 
                            className="text-2xl font-bold"
                            style={{ 
                              fontFamily: '"Lucida Grande", sans-serif',
                              color: '#FF9D21',
                              textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            }}
                          >
                            {metric.strain.toFixed(1)}
                          </span>
                        </div>
                        {metric.recoveryDetails?.hrv && (
                          <div className="flex justify-between items-center pt-2" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                            <span 
                              className="text-xs"
                              style={{ 
                                fontFamily: '"Lucida Grande", sans-serif',
                                color: '#888',
                              }}
                            >
                              HRV:
                            </span>
                            <span 
                              className="text-sm font-bold"
                              style={{ 
                                fontFamily: '"Lucida Grande", sans-serif',
                                color: '#5195E5',
                              }}
                            >
                              {Math.round(metric.recoveryDetails.hrv)}ms
                            </span>
                          </div>
                        )}
                        {metric.workouts && metric.workouts.length > 0 && (
                          <div className="flex justify-between items-center">
                            <span 
                              className="text-xs"
                              style={{ 
                                fontFamily: '"Lucida Grande", sans-serif',
                                color: '#888',
                              }}
                            >
                              Workouts:
                            </span>
                            <span 
                              className="text-sm font-bold"
                              style={{ 
                                fontFamily: '"Lucida Grande", sans-serif',
                                color: '#FF6B6B',
                              }}
                            >
                              {metric.workouts.length}
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed Workouts - Aqua Style */}
            {metrics.some(m => m.workouts && m.workouts.length > 0) && (
              <div 
                className="rounded-2xl p-6"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(245,245,255,0.95) 100%)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8)',
                  border: '1px solid rgba(255,255,255,0.6)',
                }}
              >
                <h3 
                  className="text-lg font-bold mb-4"
                  style={{ 
                    fontFamily: '"Lucida Grande", sans-serif',
                    color: '#333',
                  }}
                >
                  🏃 Recent Workouts
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {metrics
                    .filter(m => m.workouts && m.workouts.length > 0)
                    .flatMap(m => m.workouts!.map(w => ({ ...w, date: m.date })))
                    .slice(-20)
                    .reverse()
                    .map((workout, idx) => (
                      <div 
                        key={idx} 
                        className="rounded-xl p-4"
                        style={{
                          background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(245,245,255,0.8) 100%)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          border: '1px solid rgba(0,0,0,0.08)',
                        }}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div 
                              className="font-bold text-base"
                              style={{ 
                                fontFamily: '"Lucida Grande", sans-serif',
                                color: '#333',
                              }}
                            >
                              {workout.sport}
                            </div>
                            <div 
                              className="text-xs"
                              style={{ 
                                fontFamily: '"Lucida Grande", sans-serif',
                                color: '#888',
                              }}
                            >
                              {new Date(workout.date).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div 
                              className="text-xl font-bold"
                              style={{ 
                                fontFamily: '"Lucida Grande", sans-serif',
                                color: '#FF9D21',
                              }}
                            >
                              {workout.score.toFixed(1)}
                            </div>
                            {workout.duration > 0 && (
                              <div 
                                className="text-xs"
                                style={{ 
                                  fontFamily: '"Lucida Grande", sans-serif',
                                  color: '#888',
                                }}
                              >
                                {(workout.duration / 60000).toFixed(0)} min
                              </div>
                            )}
                          </div>
                        </div>
                        <div 
                          className="grid grid-cols-3 gap-2 text-xs"
                          style={{ 
                            fontFamily: '"Lucida Grande", sans-serif',
                            color: '#666',
                          }}
                        >
                          {workout.averageHeartRate > 0 && (
                            <div>
                              <span className="font-bold">Avg HR:</span> {workout.averageHeartRate}
                            </div>
                          )}
                          {workout.maxHeartRate > 0 && (
                            <div>
                              <span className="font-bold">Max HR:</span> {workout.maxHeartRate}
                            </div>
                          )}
                          {workout.kilojoule > 0 && (
                            <div>
                              <span className="font-bold">Energy:</span> {workout.kilojoule.toFixed(0)} kJ
                            </div>
                          )}
                          {workout.distance > 0 && (
                            <div>
                              <span className="font-bold">Distance:</span> {(workout.distance / 1000).toFixed(2)} km
                            </div>
                          )}
                          {workout.altitude > 0 && (
                            <div>
                              <span className="font-bold">Elevation:</span> {workout.altitude.toFixed(0)} m
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detailed Modal - Aqua Style */}
      {selectedMetric && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50"
          style={{ backdropFilter: 'blur(8px)' }}
          onClick={() => setSelectedMetric(null)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(245,245,255,0.98) 100%)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.9)',
              border: '1px solid rgba(255,255,255,0.6)',
            }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6 pb-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
              <div>
                <h3 
                  className="text-2xl font-bold"
                  style={{ 
                    fontFamily: '"Lucida Grande", sans-serif',
                    color: '#333',
                  }}
                >
                  {new Date(selectedMetric.date).toLocaleDateString('en-US', { 
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h3>
                <p 
                  className="text-sm mt-1"
                  style={{ 
                    fontFamily: '"Lucida Grande", sans-serif',
                    color: '#666',
                  }}
                >
                  Complete health metrics for this day
                </p>
              </div>
              <button
                onClick={() => setSelectedMetric(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: 'linear-gradient(135deg, #FF5F52 0%, #FF3B30 100%)',
                  boxShadow: '0 2px 8px rgba(255,95,82,0.4), inset 0 1px 0 rgba(255,255,255,0.5)',
                  border: '0.5px solid rgba(0,0,0,0.2)',
                  color: 'white',
                }}
              >
                ✕
              </button>
            </div>

            {/* Main Metrics */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div 
                className="rounded-xl p-4 text-center"
                style={{
                  background: 'linear-gradient(135deg, #90EE90 0%, #6FD86F 100%)',
                  boxShadow: '0 4px 12px rgba(144,238,144,0.4), inset 0 1px 0 rgba(255,255,255,0.5)',
                  border: '1px solid rgba(255,255,255,0.3)',
                }}
              >
                <div 
                  className="text-xs font-bold mb-1"
                  style={{ color: 'rgba(0,0,0,0.6)' }}
                >
                  Recovery
                </div>
                <div 
                  className="text-4xl font-bold"
                  style={{ color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                >
                  {Math.round(selectedMetric.recovery)}%
                </div>
              </div>
              <div 
                className="rounded-xl p-4 text-center"
                style={{
                  background: 'linear-gradient(135deg, #B19CD9 0%, #9B7FC9 100%)',
                  boxShadow: '0 4px 12px rgba(177,156,217,0.4), inset 0 1px 0 rgba(255,255,255,0.5)',
                  border: '1px solid rgba(255,255,255,0.3)',
                }}
              >
                <div 
                  className="text-xs font-bold mb-1"
                  style={{ color: 'rgba(0,0,0,0.6)' }}
                >
                  Sleep
                </div>
                <div 
                  className="text-4xl font-bold"
                  style={{ color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                >
                  {selectedMetric.sleep.toFixed(1)}H
                </div>
              </div>
              <div 
                className="rounded-xl p-4 text-center"
                style={{
                  background: 'linear-gradient(135deg, #FFB347 0%, #FF9D21 100%)',
                  boxShadow: '0 4px 12px rgba(255,179,71,0.4), inset 0 1px 0 rgba(255,255,255,0.5)',
                  border: '1px solid rgba(255,255,255,0.3)',
                }}
              >
                <div 
                  className="text-xs font-bold mb-1"
                  style={{ color: 'rgba(0,0,0,0.6)' }}
                >
                  Strain
                </div>
                <div 
                  className="text-4xl font-bold"
                  style={{ color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                >
                  {selectedMetric.strain.toFixed(1)}
                </div>
              </div>
            </div>

            {/* Recovery Details */}
            {selectedMetric.recoveryDetails && (
              <div 
                className="rounded-xl p-4 mb-4"
                style={{
                  background: 'rgba(144,238,144,0.1)',
                  border: '1px solid rgba(144,238,144,0.3)',
                }}
              >
                <h4 
                  className="text-base font-bold mb-3"
                  style={{ 
                    fontFamily: '"Lucida Grande", sans-serif',
                    color: '#6FD86F',
                  }}
                >
                  💚 Recovery Details
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm" style={{ fontFamily: '"Lucida Grande", sans-serif' }}>
                  <div>
                    <span className="font-bold" style={{ color: '#666' }}>Resting HR:</span>
                    <div className="text-lg font-bold" style={{ color: '#333' }}>{selectedMetric.recoveryDetails.restingHeartRate} bpm</div>
                  </div>
                  <div>
                    <span className="font-bold" style={{ color: '#666' }}>HRV:</span>
                    <div className="text-lg font-bold" style={{ color: '#333' }}>{Math.round(selectedMetric.recoveryDetails.hrv)} ms</div>
                  </div>
                  <div>
                    <span className="font-bold" style={{ color: '#666' }}>SpO2:</span>
                    <div className="text-lg font-bold" style={{ color: '#333' }}>{selectedMetric.recoveryDetails.spo2.toFixed(1)}%</div>
                  </div>
                  <div>
                    <span className="font-bold" style={{ color: '#666' }}>Skin Temp:</span>
                    <div className="text-lg font-bold" style={{ color: '#333' }}>{selectedMetric.recoveryDetails.skinTempCelsius.toFixed(1)}°C</div>
                  </div>
                  <div>
                    <span className="font-bold" style={{ color: '#666' }}>State:</span>
                    <div className="text-lg font-bold" style={{ color: '#333' }}>{selectedMetric.recoveryDetails.state}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Sleep Details */}
            {selectedMetric.sleepDetails && (
              <div 
                className="rounded-xl p-4 mb-4"
                style={{
                  background: 'rgba(177,156,217,0.1)',
                  border: '1px solid rgba(177,156,217,0.3)',
                }}
              >
                <h4 
                  className="text-base font-bold mb-3"
                  style={{ 
                    fontFamily: '"Lucida Grande", sans-serif',
                    color: '#9B7FC9',
                  }}
                >
                  💜 Sleep Details
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm" style={{ fontFamily: '"Lucida Grande", sans-serif' }}>
                  <div>
                    <span className="font-bold" style={{ color: '#666' }}>Total Sleep:</span>
                    <div className="text-lg font-bold" style={{ color: '#333' }}>{selectedMetric.sleepDetails.totalSleepTimeHours.toFixed(1)}H</div>
                  </div>
                  <div>
                    <span className="font-bold" style={{ color: '#666' }}>Efficiency:</span>
                    <div className="text-lg font-bold" style={{ color: '#333' }}>{selectedMetric.sleepDetails.sleepEfficiency.toFixed(0)}%</div>
                  </div>
                  <div>
                    <span className="font-bold" style={{ color: '#666' }}>Performance:</span>
                    <div className="text-lg font-bold" style={{ color: '#333' }}>{selectedMetric.sleepDetails.sleepPerformance.toFixed(0)}%</div>
                  </div>
                  <div>
                    <span className="font-bold" style={{ color: '#666' }}>Consistency:</span>
                    <div className="text-lg font-bold" style={{ color: '#333' }}>{selectedMetric.sleepDetails.sleepConsistency.toFixed(0)}%</div>
                  </div>
                  <div>
                    <span className="font-bold" style={{ color: '#666' }}>Respiratory Rate:</span>
                    <div className="text-lg font-bold" style={{ color: '#333' }}>{selectedMetric.sleepDetails.respiratoryRate.toFixed(1)} bpm</div>
                  </div>
                  <div>
                    <span className="font-bold" style={{ color: '#666' }}>Sleep Debt:</span>
                    <div className="text-lg font-bold" style={{ color: '#333' }}>{(selectedMetric.sleepDetails.sleepDebt / 3600000).toFixed(1)}H</div>
                  </div>
                </div>
              </div>
            )}

            {/* Cycle/Strain Details */}
            {selectedMetric.cycleDetails && (
              <div 
                className="rounded-xl p-4 mb-4"
                style={{
                  background: 'rgba(255,179,71,0.1)',
                  border: '1px solid rgba(255,179,71,0.3)',
                }}
              >
                <h4 
                  className="text-base font-bold mb-3"
                  style={{ 
                    fontFamily: '"Lucida Grande", sans-serif',
                    color: '#FF9D21',
                  }}
                >
                  🧡 Strain Details
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm" style={{ fontFamily: '"Lucida Grande", sans-serif' }}>
                  <div>
                    <span className="font-bold" style={{ color: '#666' }}>Avg HR:</span>
                    <div className="text-lg font-bold" style={{ color: '#333' }}>{selectedMetric.cycleDetails.averageHeartRate} bpm</div>
                  </div>
                  <div>
                    <span className="font-bold" style={{ color: '#666' }}>Max HR:</span>
                    <div className="text-lg font-bold" style={{ color: '#333' }}>{selectedMetric.cycleDetails.maxHeartRate} bpm</div>
                  </div>
                  <div>
                    <span className="font-bold" style={{ color: '#666' }}>Energy:</span>
                    <div className="text-lg font-bold" style={{ color: '#333' }}>{selectedMetric.cycleDetails.kilojoule.toFixed(0)} kJ</div>
                  </div>
                  <div className="col-span-2 md:col-span-3">
                    <span className="font-bold mb-2 block" style={{ color: '#666' }}>Heart Rate Zones:</span>
                    <div className="grid grid-cols-6 gap-2 text-xs">
                      {[0, 1, 2, 3, 4, 5].map((zone) => {
                        const duration = selectedMetric.cycleDetails?.[`zone${['Zero', 'One', 'Two', 'Three', 'Four', 'Five'][zone]}Duration` as keyof typeof selectedMetric.cycleDetails] as number || 0
                        return (
                          <div key={zone} className="text-center">
                            <div className="font-bold" style={{ color: '#999' }}>Z{zone}</div>
                            <div className="font-bold" style={{ color: '#333' }}>{(duration / 60000).toFixed(0)}m</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Workouts */}
            {selectedMetric.workouts && selectedMetric.workouts.length > 0 && (
              <div 
                className="rounded-xl p-4"
                style={{
                  background: 'rgba(255,107,107,0.1)',
                  border: '1px solid rgba(255,107,107,0.3)',
                }}
              >
                <h4 
                  className="text-base font-bold mb-3"
                  style={{ 
                    fontFamily: '"Lucida Grande", sans-serif',
                    color: '#FF6B6B',
                  }}
                >
                  🏃 Workouts ({selectedMetric.workouts.length})
                </h4>
                <div className="space-y-3">
                  {selectedMetric.workouts.map((workout, idx) => (
                    <div 
                      key={idx} 
                      className="rounded-lg p-3"
                      style={{
                        background: 'rgba(255,255,255,0.5)',
                        border: '1px solid rgba(0,0,0,0.05)',
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold" style={{ fontFamily: '"Lucida Grande", sans-serif', color: '#333' }}>
                          {workout.sport}
                        </div>
                        <div className="text-lg font-bold" style={{ fontFamily: '"Lucida Grande", sans-serif', color: '#FF6B6B' }}>
                          {workout.score.toFixed(1)}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs" style={{ fontFamily: '"Lucida Grande", sans-serif', color: '#666' }}>
                        {workout.duration > 0 && <div><span className="font-bold">Duration:</span> {(workout.duration / 60000).toFixed(0)}m</div>}
                        {workout.averageHeartRate > 0 && <div><span className="font-bold">Avg HR:</span> {workout.averageHeartRate}</div>}
                        {workout.maxHeartRate > 0 && <div><span className="font-bold">Max HR:</span> {workout.maxHeartRate}</div>}
                        {workout.kilojoule > 0 && <div><span className="font-bold">Energy:</span> {workout.kilojoule.toFixed(0)} kJ</div>}
                        {workout.distance > 0 && <div><span className="font-bold">Distance:</span> {(workout.distance / 1000).toFixed(2)} km</div>}
                        {workout.altitude > 0 && <div><span className="font-bold">Elevation:</span> {workout.altitude.toFixed(0)} m</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
