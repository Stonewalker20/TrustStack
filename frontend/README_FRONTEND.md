# TrustStack Frontend Notes

## New visual stack
- React + Vite
- Motion for scroll-linked and reveal animation
- React Three Fiber on top of three.js for the hero scene
- Drei helpers for stars, labels, lines, and controls

## Install
```bash
npm install
npm run dev
```

## Recommended demo flow
1. Land on the hero section and explain the trust engine.
2. Scroll into the framework explorer and click through stages.
3. Jump into the operations console.
4. Upload documents.
5. Run one strong supported query and one weak query.
6. Show the confidence gauge, risk flags, evidence cards, and results panel.

## Performance guardrails already reflected in the design
- one primary 3D scene above the fold
- reduced-motion fallback for the hero
- no WebGL charts inside the main dashboard
- standard DOM for evidence and results views

## Main files changed
- src/App.tsx
- src/components/TrustHero.tsx
- src/components/HeroScene.tsx
- src/components/FrameworkExplorer.tsx
- src/components/ResultsSection.tsx
- src/components/MethodologySection.tsx
- existing dashboard components restyled and upgraded
- src/styles.css
- package.json
