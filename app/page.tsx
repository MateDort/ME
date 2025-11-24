'use client'

import { useState, useEffect } from 'react'
import BootAnimation from '@/components/BootAnimation'
import OSDesktop from '@/components/OSDesktop'

export default function Home() {
  const [isBooting, setIsBooting] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsBooting(false)
    }, 5000) // 5 second boot animation

    return () => clearTimeout(timer)
  }, [])

  if (isBooting) {
    return <BootAnimation />
  }

  return <OSDesktop />
}

