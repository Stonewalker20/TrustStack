import { lazy, Suspense, useEffect, useMemo, useState } from 'react'

const HeroScene = lazy(() => import('./HeroScene').then((module) => ({ default: module.HeroScene })))

const NODES = [
  { subsystem: 'Safety', planet: 'Mercury' },
  { subsystem: 'Robustness', planet: 'Venus' },
  { subsystem: 'Privacy', planet: 'Earth' },
  { subsystem: 'Bias', planet: 'Mars' },
  { subsystem: 'Monitoring', planet: 'Jupiter' },
  { subsystem: 'Hallucination', planet: 'Saturn' },
]

type TrustHeroProps = {
  onRunEvaluation: () => void
  onExploreFramework: () => void
}

export function TrustHero({ onRunEvaluation, onExploreFramework }: TrustHeroProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setShouldReduceMotion(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (selectedIndex !== null) {
      setActiveIndex(selectedIndex)
      return
    }
    const id = window.setInterval(() => setActiveIndex((current) => (current + 1) % NODES.length), 2400)
    return () => window.clearInterval(id)
  }, [selectedIndex])

  const metrics = useMemo(
    () => [
      { label: 'Prompt probes', value: '128' },
      { label: 'Policy gates', value: '24' },
      { label: 'Confidence sync', value: '97%' },
    ],
    [],
  )

  const focusPlanet = (index: number) => {
    setSelectedIndex((current) => (current === index ? null : index))
    setActiveIndex(index)
  }

  return (
    <section className="hero-shell">
      <div className="hero-backdrop" />

      <div className="hero-visual">
        <div className="hero-visual-frame">
          <div className="hero-visual-overlay" />
          <Suspense fallback={<div className="scene-fallback">Loading trust core…</div>}>
            {!shouldReduceMotion ? (
              <HeroScene
                activeIndex={activeIndex}
                selectedIndex={selectedIndex}
                onSelectPlanet={(index) => focusPlanet(index)}
                onClearSelection={() => setSelectedIndex(null)}
              />
            ) : (
              <div className="scene-fallback">3D scene paused to respect reduced motion settings.</div>
            )}
          </Suspense>
        </div>
      </div>

      <div className="hero-grid">
        <header className="hero-header">
          <div className="eyebrow">Solar Trust Map</div>
          <h1>TrustStack turns the landing page into a living universe.</h1>
          <p>
            Each subsystem now occupies a real planetary role. Select a world to lock the camera onto its orbit, or
            click open space to return to the full system view.
          </p>
        </header>

        <div className="hero-actions-bar">
          <div className="hero-actions">
            <button className="primary primary--glow" onClick={onRunEvaluation}>
              Run Evaluation
            </button>
            <button className="secondary" onClick={onExploreFramework}>
              Explore Framework
            </button>
          </div>
        </div>

        <aside className="hero-metrics-rail" aria-label="Trust metrics">
          {metrics.map((metric) => (
            <div className="hero-metric-card" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </div>
          ))}
        </aside>

        <div className="hero-node-ring" aria-label="Subsystem planets">
          {NODES.map((node, index) => (
            <button
              key={node.subsystem}
              type="button"
              className={`hero-node hero-node--orbital ${index === activeIndex ? 'hero-node--active' : ''} ${
                selectedIndex === index ? 'hero-node--selected' : ''
              }`}
              onClick={() => focusPlanet(index)}
            >
              <span className="hero-node-dot" />
              <div>
                <strong>{node.subsystem}</strong>
                <small>
                  {node.planet} {selectedIndex === index ? 'selected' : 'orbit'}
                </small>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
