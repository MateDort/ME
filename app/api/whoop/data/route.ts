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
    // Fetch last 30 days of data + 1 day into future to ensure we get today
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 1) // Add 1 day to include today
    const startISO = startDate.toISOString()
    const endISO = endDate.toISOString()

    console.log('Fetching WHOOP data from', startISO, 'to', endISO)

    // Fetch cycles first to get cycle IDs
    const cycleResponse = await fetch(
      `https://api.prod.whoop.com/developer/v1/cycle?start=${startISO}&end=${endISO}`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    )
    
    const cycleData = await cycleResponse.json().catch((e) => { 
      console.error('Cycle parse error:', e); 
      return { records: [] }
    })
    
    const cycleRecords = cycleData.records || []
    console.log(`Fetched ${cycleRecords.length} cycles`)
    
    // Now fetch recovery and sleep for each cycle
    const recoveryPromises = cycleRecords.map((cycle: any) =>
      fetch(
        `https://api.prod.whoop.com/developer/v1/cycle/${cycle.id}/recovery`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      ).then(async r => {
        console.log(`Recovery for cycle ${cycle.id}: ${r.status}`)
        if (!r.ok) return null
        return r.json()
      }).catch((e) => { 
        console.error(`Recovery fetch error for cycle ${cycle.id}:`, e)
        return null
      })
    )
    
    const sleepPromises = cycleRecords.map((cycle: any) =>
      fetch(
        `https://api.prod.whoop.com/developer/v1/cycle/${cycle.id}/sleep`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      ).then(async r => {
        console.log(`Sleep for cycle ${cycle.id}: ${r.status}`)
        if (!r.ok) return null
        return r.json()
      }).catch((e) => {
        console.error(`Sleep fetch error for cycle ${cycle.id}:`, e)
        return null
      })
    )
    
    // Fetch workouts and profile data in parallel with recovery/sleep
    const [
      profileResponse,
      bodyMeasurementResponse,
      ...recoveryResults
    ] = await Promise.all([
      fetch(
        `https://api.prod.whoop.com/developer/v1/user/profile/basic`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      ),
      fetch(
        `https://api.prod.whoop.com/developer/v1/user/measurement/body`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      ),
      ...recoveryPromises,
    ])
    
    const sleepResults = await Promise.all(sleepPromises)
    
    console.log('Recovery results sample:', recoveryResults[0])
    console.log('Sleep results sample:', sleepResults[0])
    
    console.log('WHOOP API Response Status:', {
      cycle: cycleResponse.status,
      profile: profileResponse.status,
      bodyMeasurement: bodyMeasurementResponse.status,
      recoveryFetches: recoveryResults.length,
      sleepFetches: sleepResults.length,
    })

    // Parse remaining responses
    const [
      profileData,
      bodyMeasurementData,
    ] = await Promise.all([
      profileResponse.json().catch((e) => { console.error('Profile parse error:', e); return {} }),
      bodyMeasurementResponse.json().catch((e) => { console.error('Body measurement parse error:', e); return {} }),
    ])

    // Build recovery and sleep records with cycle association
    const recoveryRecords = recoveryResults
      .map((recovery, idx) => recovery ? { ...recovery, cycle_id: cycleRecords[idx].id } : null)
      .filter(Boolean)
    
    const sleepRecords = sleepResults
      .map((sleep, idx) => sleep ? { ...sleep, cycle_id: cycleRecords[idx].id } : null)
      .filter(Boolean)
    
    console.log('Filtered recovery records:', recoveryRecords.length)
    console.log('Filtered sleep records:', sleepRecords.length)
    
    // Workouts - fetch separately since endpoint seems different
    let workoutRecords: any[] = []
    try {
      const workoutResp = await fetch(
        `https://api.prod.whoop.com/developer/v1/workout?start=${startISO}&end=${endISO}`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      )
      console.log('Workout API status:', workoutResp.status)
      if (workoutResp.ok) {
        const workoutData = await workoutResp.json()
        workoutRecords = workoutData.records || []
      }
    } catch (e) {
      console.error('Workout fetch error:', e)
    }
    
    const profile = profileData || {}
    const bodyMeasurements = bodyMeasurementData || {}

    // Debug: Log what we received
    console.log('WHOOP Data Summary:', {
      recoveryCount: recoveryRecords.length,
      cycleCount: cycleRecords.length,
      sleepCount: sleepRecords.length,
      workoutCount: workoutRecords.length,
      sampleRecovery: recoveryRecords[0],
      sampleCycle: cycleRecords[0],
      sampleSleep: sleepRecords[0],
    })

    // Combine all data by date - use cycle_id to link recovery and sleep to cycle
    const dateMap = new Map<string, any>()

    // First, process cycles to establish the date structure
    cycleRecords.forEach((cycle: any) => {
      // Use the cycle start date as the primary date
      const date = cycle.start?.split('T')[0] || cycle.created_at?.split('T')[0]
      if (!date) return
      
      if (!dateMap.has(date)) {
        dateMap.set(date, { date, cycleId: cycle.id })
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

    // Process recovery data - match by cycle_id or date
    recoveryRecords.forEach((recovery: any) => {
      // Try to find matching cycle
      let dayData = null
      
      if (recovery.cycle_id) {
        // Find by cycle_id
        for (const [date, data] of dateMap.entries()) {
          if (data.cycleId === recovery.cycle_id) {
            dayData = data
            break
          }
        }
      }
      
      // Fallback to date matching
      if (!dayData) {
        const date = recovery.created_at?.split('T')[0]
        if (date) {
          if (!dateMap.has(date)) {
            dateMap.set(date, { date })
          }
          dayData = dateMap.get(date)
        }
      }
      
      if (dayData) {
        dayData.recovery = {
          score: recovery.score?.recovery_score || 0,
          restingHeartRate: recovery.score?.resting_heart_rate || 0,
          hrv: recovery.score?.hrv_rmssd_milli || 0,
          skinTempCelsius: recovery.score?.skin_temp_celsius || 0,
          spo2: recovery.score?.spo2_percentage || 0,
          state: recovery.score_state || 'unknown',
          recoveryRate: recovery.score?.recovery_rate || 0,
          full: recovery,
        }
      }
    })

    // Process sleep data - match by sleep_id or cycle_id or date
    sleepRecords.forEach((sleep: any) => {
      // Try to find matching cycle
      let dayData = null
      
      // Sleep end date is usually the day it belongs to
      const date = sleep.end?.split('T')[0] || sleep.created_at?.split('T')[0]
      
      if (date) {
        if (!dateMap.has(date)) {
          dateMap.set(date, { date })
        }
        dayData = dateMap.get(date)
      }
      
      if (dayData) {
        const totalSleepMs = sleep.score?.stage_summary?.total_sleep_need_milli || 
                           sleep.score?.stage_summary?.total_in_bed_time_milli || 
                           0
        
        dayData.sleep = {
          totalSleepTimeMs: totalSleepMs,
          totalSleepTimeHours: totalSleepMs / 3600000,
          sleepNeedFromSleepDebt: sleep.score?.sleep_needed?.need_from_sleep_debt_milli || 0,
          sleepNeedFromRecentStrain: sleep.score?.sleep_needed?.need_from_recent_strain_milli || 0,
          sleepNeedFromRecentNap: sleep.score?.sleep_needed?.need_from_recent_nap_milli || 0,
          sleepConsistency: sleep.score?.sleep_consistency_percentage || 0,
          sleepEfficiency: sleep.score?.sleep_efficiency_percentage || 0,
          respiratoryRate: sleep.score?.respiratory_rate || 0,
          sleepPerformance: sleep.score?.sleep_performance_percentage || 0,
          sleepDebt: sleep.score?.sleep_needed?.need_from_sleep_debt_milli || 0,
          naps: sleep.naps || [],
          full: sleep,
        }
      }
    })

    // Process workout data
    workoutRecords.forEach((workout: any) => {
      const date = workout.start?.split('T')[0] || workout.created_at?.split('T')[0]
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
        sport: workout.sport_name || workout.sport?.name || 'Unknown',
        score: workout.score?.strain || 0,
        averageHeartRate: workout.score?.average_heart_rate || 0,
        maxHeartRate: workout.score?.max_heart_rate || 0,
        kilojoule: workout.score?.kilojoule || 0,
        duration: workout.end && workout.start ? new Date(workout.end).getTime() - new Date(workout.start).getTime() : 0,
        distance: workout.score?.distance_meter || 0,
        altitude: workout.score?.altitude_gain_meter || 0,
        full: workout,
      })
    })

    // Convert map to array and sort by date
    const metrics = Array.from(dateMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((dayData) => ({
        date: dayData.date,
        // Legacy format for backward compatibility
        recovery: dayData.recovery?.score || 0,
        strain: dayData.cycle?.strain || 0,
        sleep: dayData.sleep?.totalSleepTimeHours || 0,
        heartRate: {
          resting: dayData.recovery?.restingHeartRate || 0,
          max: dayData.cycle?.maxHeartRate || 0,
          avg: dayData.cycle?.averageHeartRate || 0,
        },
        // Detailed data
        recoveryDetails: dayData.recovery ? {
          score: dayData.recovery.score,
          restingHeartRate: dayData.recovery.restingHeartRate,
          hrv: dayData.recovery.hrv,
          skinTempCelsius: dayData.recovery.skinTempCelsius,
          spo2: dayData.recovery.spo2,
          state: dayData.recovery.state,
          recoveryRate: dayData.recovery.recoveryRate,
        } : undefined,
        cycleDetails: dayData.cycle ? {
          strain: dayData.cycle.strain,
          kilojoule: dayData.cycle.kilojoule,
          averageHeartRate: dayData.cycle.averageHeartRate,
          maxHeartRate: dayData.cycle.maxHeartRate,
          zoneZeroDuration: dayData.cycle.zoneZeroDuration,
          zoneOneDuration: dayData.cycle.zoneOneDuration,
          zoneTwoDuration: dayData.cycle.zoneTwoDuration,
          zoneThreeDuration: dayData.cycle.zoneThreeDuration,
          zoneFourDuration: dayData.cycle.zoneFourDuration,
          zoneFiveDuration: dayData.cycle.zoneFiveDuration,
        } : undefined,
        sleepDetails: dayData.sleep ? {
          totalSleepTimeMs: dayData.sleep.totalSleepTimeMs,
          totalSleepTimeHours: dayData.sleep.totalSleepTimeHours,
          sleepNeedFromSleepDebt: dayData.sleep.sleepNeedFromSleepDebt,
          sleepNeedFromRecentStrain: dayData.sleep.sleepNeedFromRecentStrain,
          sleepNeedFromRecentNap: dayData.sleep.sleepNeedFromRecentNap,
          sleepConsistency: dayData.sleep.sleepConsistency,
          sleepEfficiency: dayData.sleep.sleepEfficiency,
          respiratoryRate: dayData.sleep.respiratoryRate,
          sleepPerformance: dayData.sleep.sleepPerformance,
          sleepDebt: dayData.sleep.sleepDebt,
          naps: dayData.sleep.naps,
        } : undefined,
        workouts: dayData.workouts || [],
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

