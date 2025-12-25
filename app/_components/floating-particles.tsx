'use client'

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'

interface Particle {
  delay: number
  duration: number
  id: number
  left: string
  size: number
}

const PARTICLE_COUNT = 20
const PARTICLE_COUNT_MOBILE = 10

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    delay: Math.random() * 5,
    duration: 10 + Math.random() * 10,
    id: i,
    left: `${Math.random() * 100}%`,
    size: 4 + Math.random() * 8,
  }))
}

function getIsMobile(): boolean {
  return typeof window !== 'undefined' && window.innerWidth < 768
}

export function FloatingParticles() {
  const shouldReduceMotion = useReducedMotion()
  const [isMobile, setIsMobile] = useState(getIsMobile)
  const [isVisible, setIsVisible] = useState(true)

  // Generate particles based on maximum count
  const particleCount = isMobile ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT
  const [particles] = useState<Particle[]>(() => generateParticles(PARTICLE_COUNT))

  useEffect(() => {
    // Adjust particle count based on screen size
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    window.addEventListener('resize', handleResize)

    // Pause animations when page is not visible
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Don't render particles if reduced motion is preferred
  if (shouldReduceMotion) {
    return null
  }

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {particles.slice(0, particleCount).map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-primary/20"
          style={{
            height: particle.size,
            left: particle.left,
            top: '100%',
            width: particle.size,
          }}
          animate={
            isVisible
              ? {
                  opacity: [0, 0.6, 0],
                  y: ['0vh', '-120vh'],
                }
              : {}
          }
          transition={{
            delay: particle.delay,
            duration: particle.duration,
            ease: 'linear',
            repeat: Infinity,
          }}
        />
      ))}
    </div>
  )
}
