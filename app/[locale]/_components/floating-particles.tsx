"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

interface Particle {
  delay: number;
  duration: number;
  id: number;
  left: string;
  size: number;
}

const PARTICLE_COUNT = 20;
const PARTICLE_COUNT_MOBILE = 10;

function generateParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    delay: Math.random() * 5,
    duration: 10 + Math.random() * 10,
    id: i,
    left: `${Math.random() * 100}%`,
    size: 4 + Math.random() * 8,
  }));
}

export function FloatingParticles() {
  const shouldReduceMotion = useReducedMotion();
  // Start with desktop count, will adjust on client
  const [particleCount, setParticleCount] = useState(PARTICLE_COUNT);
  const [isVisible, setIsVisible] = useState(true);
  const [particles, setParticles] = useState<Particle[] | null>(null);

  useEffect(() => {
    // Generate particles only on client side to avoid hydration mismatch
    setParticles(generateParticles());
    // Adjust particle count based on screen size
    const updateParticleCount = () => {
      setParticleCount(
        window.innerWidth < 768 ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT
      );
    };

    // Initial check and set up resize listener
    updateParticleCount();
    window.addEventListener("resize", updateParticleCount);

    // Pause animations when page is not visible
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("resize", updateParticleCount);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Don't render if reduced motion is preferred or particles not yet generated
  if (shouldReduceMotion || !particles) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {particles.slice(0, particleCount).map((particle) => (
        <motion.div
          animate={
            isVisible
              ? {
                  opacity: [0, 0.6, 0],
                  y: ["0vh", "-120vh"],
                }
              : {}
          }
          className="absolute rounded-full bg-primary/20"
          key={particle.id}
          style={{
            height: particle.size,
            left: particle.left,
            top: "100%",
            width: particle.size,
          }}
          transition={{
            delay: particle.delay,
            duration: particle.duration,
            ease: "linear",
            repeat: Number.POSITIVE_INFINITY,
          }}
        />
      ))}
    </div>
  );
}
