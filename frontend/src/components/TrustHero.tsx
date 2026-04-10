import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'

const HeroScene = lazy(() => import('./HeroScene').then((module) => ({ default: module.HeroScene })))

type TourNode = {
  id: string
  subsystem: string
  planet: string
  title: string
  summary: string
}

type TrustHeroProps = {
  nodes: TourNode[]
  activeIndex: number
  autoTour: boolean
  detailPanel: ReactNode
  onActiveIndexChange: (index: number) => void
  onToggleAutoTour: () => void
  onNext: () => void
  onPrevious: () => void
}

export function TrustHero({
  nodes,
  activeIndex,
  autoTour,
  detailPanel,
  onActiveIndexChange,
  onToggleAutoTour,
  onNext,
  onPrevious,
}: TrustHeroProps) {
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false)
  const [sceneUnavailable, setSceneUnavailable] = useState(false)
  const [sceneSelectedIndex, setSceneSelectedIndex] = useState<number | null>(activeIndex)
  const activeNode = nodes[activeIndex]

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setShouldReduceMotion(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (autoTour) {
      setSceneSelectedIndex(activeIndex)
    }
  }, [activeIndex, autoTour])

  return (
    <section className="hero-shell hero-shell--guided">
      <div className="hero-backdrop" />

      <div className="hero-visual">
        <div className="hero-visual-frame">
          <div className="hero-visual-overlay" />
          <Suspense fallback={<div className="scene-fallback">Loading trust core…</div>}>
            {sceneUnavailable ? (
              <div className="scene-fallback">
                The solar system renderer lost its WebGL context. The guided TrustStack flow remains available.
              </div>
            ) : shouldReduceMotion ? (
              <div className="scene-fallback">3D scene paused to respect reduced motion settings.</div>
            ) : (
              <HeroScene
                activeIndex={activeIndex}
                selectedIndex={sceneSelectedIndex}
                onSelectPlanet={(index) => {
                  setSceneSelectedIndex(index)
                  onActiveIndexChange(index)
                }}
                onClearSelection={() => setSceneSelectedIndex(null)}
                onRendererLost={() => setSceneUnavailable(true)}
              />
            )}
          </Suspense>
        </div>
      </div>

      <div className="hero-grid hero-grid--guided">
        <header className="hero-header hero-header--guided">
          <div className="eyebrow">Solar Trust Map</div>
          <h1>TrustStack turns the landing page into a guided planetary tour.</h1>
          <p>
            The process no longer depends on scrolling. Each planet hosts a distinct part of the framework, and Pluto
            closes the journey with author recognition.
          </p>
        </header>

        <div className="hero-journey-card panel panel--glass">
          <div className="framework-node-topline">
            <span>{activeNode?.planet ?? 'Journey'}</span>
            <strong>{autoTour ? 'Auto tour' : 'Manual tour'}</strong>
          </div>
          <h3>{activeNode ? activeNode.title : 'Select a planet to begin'}</h3>
          <p className="muted muted--large">{activeNode?.summary ?? 'Follow the planets to move through the TrustStack flow.'}</p>
          <div className="pill-grid">
            <span className="data-pill">{activeNode?.subsystem ?? 'TrustStack'}</span>
            <span className="data-pill">{activeIndex + 1} / {nodes.length}</span>
          </div>
        </div>

        <div className="hero-stage-panel">
          <div className="hero-stage-panel-head">
            <div>
              <div className="eyebrow">{activeNode?.subsystem ?? 'TrustStack'}</div>
              <h2>{activeNode ? activeNode.title : 'TrustStack journey'}</h2>
            </div>
            <div className="badge badge--bright">
              {activeIndex + 1} / {nodes.length}
            </div>
          </div>
          <div className="hero-stage-panel-body">{detailPanel}</div>
        </div>

        <div className="hero-actions-bar">
          <div className="hero-actions">
            <button className="primary primary--glow" onClick={onToggleAutoTour}>
              {autoTour ? 'Pause Tour' : 'Resume Tour'}
            </button>
            <button className="secondary" onClick={onPrevious}>
              Previous Planet
            </button>
            <button className="secondary" onClick={onNext}>
              Next Planet
            </button>
          </div>
        </div>

        <div className="hero-node-ring" aria-label="Subsystem planets">
          {nodes.map((node, index) => (
            <button
              key={node.id}
              type="button"
              className={`hero-node hero-node--orbital ${activeIndex === index ? 'hero-node--active hero-node--selected' : ''}`}
              onClick={() => {
                setSceneSelectedIndex(index)
                onActiveIndexChange(index)
              }}
            >
              <span className="hero-node-dot" />
              <div>
                <strong>{node.planet}</strong>
                <small>
                  {node.subsystem}
                  {activeIndex === index ? ' selected' : ''}
                </small>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
