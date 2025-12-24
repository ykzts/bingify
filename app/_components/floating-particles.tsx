'use client'

import { useState } from 'react'
import { motion } from 'motion/react'

interface Particle {
  id: number
  left: string
  size: number
  delay: number
  duration: number
}

function generateParticles(): Particle[] {
  return Array.from({ length: 20 }, (_, i) => ({
    delay: Math.random() * 5,
    duration: 10 + Math.random() * 10,
    id: i,
    left: `${Math.random() * 100}%`,
    size: 4 + Math.random() * 8,
  }))
}

export function FloatingParticles() {
  const [particles] = useState<Particle[]>(generateParticles)

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-primary/20"
          style={{
            height: particle.size,
            left: particle.left,
            top: '100%',
            width: particle.size,
          }}
          animate={{
            opacity: [0, 0.6, 0],
            y: ['0vh', '-120vh'],
          }}
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
