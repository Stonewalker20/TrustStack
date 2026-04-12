import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'

const HeroScene = lazy(() => import('./HeroScene').then((module) => ({ default: module.HeroScene })))

type TourNode = {
  id: string
  subsystem: string
  planet: string
  title: string
  summary: string
  reportSection?: string
  reportFigureCaption?: string
  guideTitle?: string
  guideMessage?: string
}

type TrustHeroProps = {
  nodes: TourNode[]
  activeIndex: number
  detailPanel: ReactNode
  missionControlPanel?: ReactNode
  missionControlOpen?: boolean
  onActiveIndexChange: (index: number) => void
  onMissionControlOpenChange?: (open: boolean) => void
}

export function TrustHero({
  nodes,
  activeIndex,
  detailPanel,
  missionControlPanel,
  missionControlOpen = false,
  onActiveIndexChange,
  onMissionControlOpenChange,
}: TrustHeroProps) {
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false)
  const [sceneUnavailable, setSceneUnavailable] = useState(false)
  const [sceneSelectedIndex, setSceneSelectedIndex] = useState<number | null>(null)
  const activeNode = nodes[activeIndex]
  const isPlutoView = activeNode?.planet === 'Pluto'
  const overviewMode = sceneSelectedIndex === null
  const showMissionControlOverlay = missionControlOpen && Boolean(missionControlPanel)
  const missionControlLabel = overviewMode ? 'Open Mission Control' : 'Open standard suite'

  const setFocusedPlanet = (index: number) => {
    setSceneSelectedIndex(index)
    onActiveIndexChange(index)
  }

  const handlePlanetButtonClick = (index: number) => {
    if (sceneSelectedIndex === index) {
      setSceneSelectedIndex(null)
      return
    }
    setFocusedPlanet(index)
  }

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setShouldReduceMotion(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (sceneSelectedIndex !== null) {
      setSceneSelectedIndex(activeIndex)
    }
  }, [activeIndex, sceneSelectedIndex])

  return (
    <section className={`hero-shell hero-shell--presentation ${showMissionControlOverlay ? 'hero-shell--overlay-open' : ''}`}>
      <div className="hero-backdrop" />

      <div className="hero-visual">
        <div className="hero-visual-frame">
          <div className="hero-visual-overlay" />
          <Suspense fallback={<div className="scene-fallback">Loading trust core…</div>}>
            {sceneUnavailable ? (
              <div className="scene-fallback">
                The solar system renderer lost its WebGL context. The TrustStack presentation shell remains available.
              </div>
            ) : shouldReduceMotion ? (
              <div className="scene-fallback">3D scene paused to respect reduced motion settings.</div>
            ) : (
              <HeroScene
                activeIndex={activeIndex}
                selectedIndex={sceneSelectedIndex}
                onSelectPlanet={(index) => {
                  setFocusedPlanet(index)
                }}
                onClearSelection={() => setSceneSelectedIndex(null)}
                onRendererLost={() => setSceneUnavailable(true)}
              />
            )}
          </Suspense>
        </div>
      </div>

      <div className="hero-grid hero-grid--presentation">
        <header className={`hero-header hero-header--presentation ${overviewMode ? '' : 'hero-header--hidden'}`}>
          <div className="eyebrow">TrustStack Mission Control</div>
          <h1>Turn evidence into conference-ready AI trust signals.</h1>
          <p>
            TrustStack packages ingestion, evaluation, score breakdowns, and report-ready methodology into a
            presentation-first system for grounded AI review.
          </p>
        </header>

        <button
          type="button"
          data-testid="mission-control-open"
          className={`hero-mission-cta panel panel--glass ${overviewMode ? 'hero-mission-cta--visible' : ''}`}
          onClick={() => onMissionControlOpenChange?.(true)}
        >
          <div className="eyebrow">Mission Control</div>
          <strong>{missionControlLabel}</strong>
          <span>Open the full evaluation console, final score, and breakdown overlay.</span>
        </button>

        <div className={`hero-journey-card ${overviewMode || isPlutoView ? 'hero-journey-card--hidden' : ''}`}>
          <div className="eyebrow">{activeNode?.planet ?? 'Journey'}</div>
          <h3>{activeNode ? activeNode.title : 'Select a planet to begin'}</h3>
          <p className="muted muted--large">
            {activeNode?.summary ?? 'Follow the planets to move through the TrustStack flow.'}
          </p>
          <div className="hero-journey-meta">
            <span>{activeNode?.subsystem ?? 'TrustStack'}</span>
            <strong>
              {activeIndex + 1} / {nodes.length}
            </strong>
          </div>
        </div>

        <div className={`hero-stage-cluster ${isPlutoView ? 'hero-stage-cluster--pluto' : ''} ${overviewMode ? 'hero-stage-cluster--hidden' : ''}`}>
          <div className={`hero-stage-panel ${isPlutoView ? 'hero-stage-panel--pluto' : ''}`}>
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
        </div>

        <div className="hero-node-ring" aria-label="Subsystem planets">
          {nodes.map((node, index) => (
            <button
              key={node.id}
              type="button"
              data-testid={`planet-button-${node.planet.toLowerCase()}`}
              className={`hero-node hero-node--orbital ${activeIndex === index ? 'hero-node--active hero-node--selected' : ''}`}
              onClick={() => handlePlanetButtonClick(index)}
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

        {showMissionControlOverlay ? (
          <div className="hero-mission-overlay" role="dialog" aria-modal="true" aria-label="Mission Control overlay">
            <button
              type="button"
              className="hero-mission-overlay-backdrop"
              aria-label="Close Mission Control overlay"
              onClick={() => onMissionControlOpenChange?.(false)}
            />
            <div className="hero-mission-overlay-panel panel panel--glass" data-testid="mission-control-panel">
              <div className="hero-mission-overlay-head">
                <div>
                  <div className="eyebrow">Mission Control</div>
                  <h2>Standardized test console</h2>
                </div>
                <button type="button" className="secondary" onClick={() => onMissionControlOpenChange?.(false)}>
                  Close
                </button>
              </div>
              <div className="hero-mission-overlay-body">{missionControlPanel}</div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
