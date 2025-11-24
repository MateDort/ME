import { NextRequest, NextResponse } from 'next/server'

async function getAccessToken(req: NextRequest): Promise<string | null> {
  return req.cookies.get('whoop_access_token')?.value || null
}

export async function GET(req: NextRequest) {
  const accessToken = await getAccessToken(req)

  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    // Fetch last 30 days of data
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)
    const endDate = new Date()
    const startISO = startDate.toISOString()
    const endISO = endDate.toISOString()

    // Fetch all available data in parallel
    const [
      recoveryResponse,
      cycleResponse,
      sleepResponse,
      workoutResponse,
      profileResponse,
      bodyMeasurementResponse,
    ] = await Promise.all([
      fetch(
        `https://api.prod.whoop.com/developer/v1/recovery?start=${startISO}&end=${endISO}`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      ),
      fetch(
        `https://api.prod.whoop.com/developer/v1/cycle?start=${startISO}&end=${endISO}`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      ),
      fetch(
        `https://api.prod.whoop.com/developer/v1/sleep?start=${startISO}&end=${endISO}`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      ),
      fetch(
        `https://api.prod.whoop.com/developer/v1/workout?start=${startISO}&end=${endISO}`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      ),
      fetch(
        `https://api.prod.whoop.com/developer/v1/user/profile/basic`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      ),
      fetch(
        `https://api.prod.whoop.com/developer/v1/user/measurement/body`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      ),
    ])

    // Parse all responses
    const [
      recoveryData,
      cycleData,
      sleepData,
      workoutData,
      profileData,
      bodyMeasurementData,
    ] = await Promise.all([
      recoveryResponse.json().catch(() => ({ records: [] })),
      cycleResponse.json().catch(() => ({ records: [] })),
      sleepResponse.json().catch(() => ({ records: [] })),
      workoutResponse.json().catch(() => ({ records: [] })),
      profileResponse.json().catch(() => ({})),
      bodyMeasurementResponse.json().catch(() => ({})),
    ])

    // Extract all records
    const recoveryRecords = recoveryData.records || []
    const cycleRecords = cycleData.records || []
    const sleepRecords = sleepData.records || []
    const workoutRecords = workoutData.records || []
    const profile = profileData || {}
    const bodyMeasurements = bodyMeasurementData || {}

    // Combine all data by date
    const dateMap = new Map<string, any>()

    // Process recovery data
    recoveryRecords.forEach((recovery: any) => {
      const date = recovery.created_at?.split('T')[0]
      if (!date) return
      
      if (!dateMap.has(date)) {
        dateMap.set(date, { date })
      }
      
      const dayData = dateMap.get(date)
      dayData.recovery = {
        score: recovery.score?.recovery_score || 0,
        restingHeartRate: recovery.score?.resting_heart_rate || 0,
        hrv: recovery.score?.hrv_rmssd_milli || 0,
        skinTempCelsius: recovery.score?.skin_temp_celsius || 0,
        spo2: recovery.score?.spo2_percentage || 0,
        state: recovery.score?.state || 'unknown',
        recoveryRate: recovery.score?.recovery_rate || 0,
        full: recovery, // Store full object for detailed view
      }
    })

    // Process cycle data
    cycleRecords.forEach((cycle: any) => {
      const date = cycle.created_at?.split('T')[0]
      if (!date) return
      
      if (!dateMap.has(date)) {
        dateMap.set(date, { date })
      }
      
      const dayData = dateMap.get(date)
      dayData.cycle = {
        strain: cycle.score?.strain || 0,
        kilojoule: cycle.score?.kilojoule || 0,
        averageHeartRate: cycle.score?.average_heart_rate || 0,
        maxHeartRate: cycle.score?.max_heart_rate || 0,
        zoneZeroDuration: cycle.score?.zone_zero_duration_milli || 0,
        zoneOneDuration: cycle.score?.zone_one_duration_milli || 0,
        zoneTwoDuration: cycle.score?.zone_two_duration_milli || 0,
        zoneThreeDuration: cycle.score?.zone_three_duration_milli || 0,
        zoneFourDuration: cycle.score?.zone_four_duration_milli || 0,
        zoneFiveDuration: cycle.score?.zone_five_duration_milli || 0,
        full: cycle,
      }
    })

    // Process sleep data
    sleepRecords.forEach((sleep: any) => {
      const date = sleep.created_at?.split('T')[0]
      if (!date) return
      
      if (!dateMap.has(date)) {
        dateMap.set(date, { date })
      }
      
      const dayData = dateMap.get(date)
      dayData.sleep = {
        totalSleepTimeMs: sleep.score?.total_sleep_time_ms || 0,
        totalSleepTimeHours: (sleep.score?.total_sleep_time_ms || 0) / 3600000,
        sleepNeedFromSleepDebt: sleep.score?.sleep_needed_from_sleep_debt_ms || 0,
        sleepNeedFromRecentStrain: sleep.score?.sleep_needed_from_recent_strain_ms || 0,
        sleepNeedFromRecentNap: sleep.score?.sleep_needed_from_recent_nap_ms || 0,
        sleepConsistency: sleep.score?.sleep_consistency || 0,
        sleepEfficiency: sleep.score?.sleep_efficiency_percentage || 0,
        respiratoryRate: sleep.score?.respiratory_rate || 0,
        sleepPerformance: sleep.score?.sleep_performance_percentage || 0,
        sleepDebt: sleep.score?.sleep_debt_ms || 0,
        naps: sleep.naps || [],
        full: sleep,
      }
    })

    // Process workout data
    workoutRecords.forEach((workout: any) => {
      const date = workout.created_at?.split('T')[0]
      if (!date) return
      
      if (!dateMap.has(date)) {
        dateMap.set(date, { date })
      }
      
      const dayData = dateMap.get(date)
      if (!dayData.workouts) {
        dayData.workouts = []
      }
      
      dayData.workouts.push({
        id: workout.id,
        sport: workout.sport?.name || 'Unknown',
        score: workout.score?.strain || 0,
        averageHeartRate: workout.score?.average_heart_rate || 0,
        maxHeartRate: workout.score?.max_heart_rate || 0,
        kilojoule: workout.score?.kilojoule || 0,
        duration: workout.score?.duration_milli || 0,
        distance: workout.score?.distance_meter || 0,
        altitude: workout.score?.altitude_gain_meter || 0,
        full: workout,
      })
    })

    // Convert map to array and sort by date
    const metrics = Array.from(dateMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((dayData) => ({
        ...dayData,
        // Legacy format for backward compatibility
        recovery: dayData.recovery?.score || 0,
        strain: dayData.cycle?.strain || 0,
        sleep: dayData.sleep?.totalSleepTimeHours || 0,
        heartRate: {
          resting: dayData.recovery?.restingHeartRate || 0,
          max: dayData.cycle?.maxHeartRate || 0,
          avg: dayData.cycle?.averageHeartRate || 0,
        },
      }))

    return NextResponse.json({
      metrics,
      profile,
      bodyMeasurements,
      summary: {
        totalDays: metrics.length,
        dateRange: {
          start: metrics[0]?.date,
          end: metrics[metrics.length - 1]?.date,
        },
        totalWorkouts: workoutRecords.length,
        averageRecovery: metrics.reduce((sum, m) => sum + (m.recovery || 0), 0) / metrics.length || 0,
        averageStrain: metrics.reduce((sum, m) => sum + (m.strain || 0), 0) / metrics.length || 0,
        averageSleep: metrics.reduce((sum, m) => sum + (m.sleep || 0), 0) / metrics.length || 0,
      },
    })
  } catch (error) {
    console.error('Whoop data fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}

