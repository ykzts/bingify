import { Features } from './_components/features'
import { FloatingParticles } from './_components/floating-particles'
import { Hero } from './_components/hero'

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background font-sans">
      <FloatingParticles />
      <main>
        <Hero />
        <Features />
      </main>
    </div>
  )
}
