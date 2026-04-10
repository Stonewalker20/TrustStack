import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react'

const HeroScene = lazy(() => import('./HeroScene').then((module) => ({ default: module.HeroScene })))

type TourNode = {
  id: string
  subsystem: string
  planet: string
  title: string
  summary: string
  guideTitle: string
  guideMessage: string
}

type TrustHeroProps = {
  nodes: TourNode[]
  activeIndex: number
  guideEnabled: boolean
  detailPanel: ReactNode
  onActiveIndexChange: (index: number) => void
  onGuideEnabledChange: (enabled: boolean) => void
}

export function TrustHero({
  nodes,
  activeIndex,
  guideEnabled,
  detailPanel,
  onActiveIndexChange,
  onGuideEnabledChange,
}: TrustHeroProps) {
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false)
  const [sceneUnavailable, setSceneUnavailable] = useState(false)
  const [sceneSelectedIndex, setSceneSelectedIndex] = useState<number | null>(null)
  const [dismissedGuideIds, setDismissedGuideIds] = useState<string[]>([])
  const activeNode = nodes[activeIndex]
  const showGuidePopup = guideEnabled && !sceneUnavailable && !shouldReduceMotion && !dismissedGuideIds.includes(activeNode.id)
  const overviewMode = sceneSelectedIndex === null

  const setFocusedPlanet = (index: number) => {
    setSceneSelectedIndex(index)
    onActiveIndexChange(index)
  }

  const handleNext = () => {
    const nextIndex = (activeIndex + 1) % nodes.length
    setFocusedPlanet(nextIndex)
  }

  const handlePrevious = () => {
    const previousIndex = (activeIndex - 1 + nodes.length) % nodes.length
    setFocusedPlanet(previousIndex)
  }

  const handleDismissGuide = () => {
    setDismissedGuideIds((current) => (current.includes(activeNode.id) ? current : [...current, activeNode.id]))
  }

  const guideToggleId = useMemo(() => `guide-toggle-${activeNode.id}`, [activeNode.id])

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
                  setFocusedPlanet(index)
                }}
                onClearSelection={() => setSceneSelectedIndex(null)}
                onRendererLost={() => setSceneUnavailable(true)}
              />
            )}
          </Suspense>
        </div>
      </div>

      <div className="hero-grid hero-grid--guided">
        <header className={`hero-header hero-header--guided ${overviewMode ? '' : 'hero-header--hidden'}`}>
          <div className="eyebrow">Solar Trust Map</div>
          <h1>Start in full-system view, then enter the TrustStack planetary tour when you are ready.</h1>
          <p>
            The landing page stays in a solar-system overview until you focus a planet. Each world hosts one TrustStack
            stage, and Pluto remains reserved for author recognition.
          </p>
        </header>

        <div className="hero-journey-card panel panel--glass">
          <div className="framework-node-topline">
            <span>{activeNode?.planet ?? 'Journey'}</span>
            <strong>{guideEnabled ? 'Guide enabled' : 'Guide hidden'}</strong>
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

        {showGuidePopup ? (
          <aside className="hero-guide-popup panel panel--glass" role="dialog" aria-live="polite" aria-label="Guided tour message">
            <button type="button" className="hero-guide-close" aria-label="Dismiss guided tour message" onClick={handleDismissGuide}>
              x
            </button>
            <div className="eyebrow">Mission Prompt</div>
            <h3>{activeNode.guideTitle}</h3>
            <p>{activeNode.guideMessage}</p>
          </aside>
        ) : null}

        <div className="hero-actions-bar">
          <div className="hero-actions">
            <button className="primary primary--glow" onClick={() => setFocusedPlanet(activeIndex)}>
              Guided Tour
            </button>
            <button className="secondary" onClick={handlePrevious}>
              Previous Planet
            </button>
            <button className="secondary" onClick={handleNext}>
              Next Planet
            </button>
          </div>
        </div>

        <div className="hero-guide-toggle panel panel--glass">
          <label className="guide-switch" htmlFor={guideToggleId}>
            <input
              id={guideToggleId}
              type="checkbox"
              checked={guideEnabled}
              onChange={(event) => onGuideEnabledChange(event.target.checked)}
            />
            <span className="guide-switch-track" aria-hidden="true">
              <span className="guide-switch-thumb" />
            </span>
            <span className="guide-switch-copy">
              <strong>Guide</strong>
              <small>{guideEnabled ? 'Space prompts on' : 'Space prompts off'}</small>
            </span>
          </label>
        </div>

        <div className="hero-node-ring" aria-label="Subsystem planets">
          {nodes.map((node, index) => (
            <button
              key={node.id}
              type="button"
              className={`hero-node hero-node--orbital ${activeIndex === index ? 'hero-node--active hero-node--selected' : ''}`}
              onClick={() => setFocusedPlanet(index)}
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
