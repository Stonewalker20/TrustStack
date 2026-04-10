import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'

const HeroScene = lazy(() => import('./HeroScene').then((module) => ({ default: module.HeroScene })))

const NODES = ['Safety', 'Robustness', 'Hallucination', 'Bias', 'Privacy', 'Monitoring']

type TrustHeroProps = {
  onRunEvaluation: () => void
  onExploreFramework: () => void
}

export function TrustHero({ onRunEvaluation, onExploreFramework }: TrustHeroProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const tiltX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), { stiffness: 110, damping: 20 })
  const tiltY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), { stiffness: 110, damping: 20 })

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setShouldReduceMotion(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => setActiveIndex((current) => (current + 1) % NODES.length), 2200)
    return () => window.clearInterval(id)
  }, [])

  const metrics = useMemo(
    () => [
      { label: 'Prompt probes', value: '128' },
      { label: 'Policy gates', value: '24' },
      { label: 'Confidence sync', value: '97%' },
    ],
    [],
  )

  return (
    <section
      className="hero-shell"
      onMouseMove={(event) => {
        const bounds = (event.currentTarget as HTMLDivElement).getBoundingClientRect()
        const x = (event.clientX - bounds.left) / bounds.width - 0.5
        const y = (event.clientY - bounds.top) / bounds.height - 0.5
        mouseX.set(x)
        mouseY.set(y)
      }}
    >
      <div className="hero-backdrop" />

      <div className="hero-visual">
        <div className="hero-visual-frame">
          <div className="hero-visual-overlay" />
          <Suspense fallback={<div className="scene-fallback">Loading trust core…</div>}>
            {!shouldReduceMotion ? (
              <HeroScene activeIndex={activeIndex} />
            ) : (
              <div className="scene-fallback">3D scene paused to respect reduced motion settings.</div>
            )}
          </Suspense>
        </div>
      </div>

      <motion.div className="hero-grid" style={shouldReduceMotion ? undefined : { rotateX: tiltX, rotateY: tiltY }}>
        <div className="hero-copy">
          <div className="eyebrow">Inside the Trust Engine</div>
          <h1>Visualize how AI outputs earn trust before they earn action.</h1>
          <p>
            TrustStack turns evaluation into an interactive operations console. Watch evidence move through retrieval,
            policy checks, red-team probes, and scoring until the system commits to a final risk verdict.
          </p>

          <div className="hero-actions">
            <button className="primary primary--glow" onClick={onRunEvaluation}>
              Run Evaluation
            </button>
            <button className="secondary" onClick={onExploreFramework}>
              Explore Framework
            </button>
          </div>

          <div className="hero-metrics">
            {metrics.map((metric) => (
              <div className="hero-metric-card" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-node-rail">
          {NODES.map((node, index) => (
            <button
              key={node}
              type="button"
              className={`hero-node ${index === activeIndex ? 'hero-node--active' : ''}`}
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
            >
              <span className="hero-node-dot" />
              <div>
                <strong>{node}</strong>
                <small>{index === activeIndex ? 'Orbit in focus' : 'Inspect orbit'}</small>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </section>
  )
}
