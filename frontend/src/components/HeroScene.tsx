import { Canvas, useFrame } from '@react-three/fiber'
import { Html, OrbitControls, Stars } from '@react-three/drei'
import { Suspense, useRef } from 'react'
import * as THREE from 'three'

type HeroSceneProps = { activeIndex: number }

const PLANETS = [
  {
    label: 'Safety',
    radius: 4.8,
    speed: 0.42,
    phase: 0.4,
    tilt: [0.22, 0.1, 0.35] as [number, number, number],
    size: 0.34,
    color: '#8ae7ff',
    emissive: '#0f5b76',
    band: '#d8fbff',
    halo: '#7de8ff',
  },
  {
    label: 'Robustness',
    radius: 6.1,
    speed: 0.3,
    phase: 2.1,
    tilt: [-0.28, 0.18, -0.22] as [number, number, number],
    size: 0.42,
    color: '#f7d17a',
    emissive: '#6d4314',
    band: '#fff1bf',
    halo: '#ffd27d',
    rings: '#d8b068',
  },
  {
    label: 'Hallucination',
    radius: 7.5,
    speed: 0.22,
    phase: 3.4,
    tilt: [0.3, -0.14, 0.18] as [number, number, number],
    size: 0.38,
    color: '#b7a6ff',
    emissive: '#372a82',
    band: '#d9d2ff',
    halo: '#b7a6ff',
  },
  {
    label: 'Bias',
    radius: 5.5,
    speed: 0.36,
    phase: 4.6,
    tilt: [-0.24, 0.22, 0.3] as [number, number, number],
    size: 0.31,
    color: '#ff9ba9',
    emissive: '#6f1d3b',
    band: '#ffd0d7',
    halo: '#ff9ba9',
    moon: '#ffe4ea',
  },
  {
    label: 'Privacy',
    radius: 8.6,
    speed: 0.18,
    phase: 1.2,
    tilt: [0.16, -0.3, -0.24] as [number, number, number],
    size: 0.47,
    color: '#91f2c5',
    emissive: '#145b43',
    band: '#d5ffe8',
    halo: '#91f2c5',
  },
  {
    label: 'Monitoring',
    radius: 6.8,
    speed: 0.27,
    phase: 5.3,
    tilt: [0.12, 0.28, -0.33] as [number, number, number],
    size: 0.36,
    color: '#7bb2ff',
    emissive: '#1b3e86',
    band: '#d5e6ff',
    halo: '#7bb2ff',
    moon: '#c5d9ff',
  },
]

function OrbitPlane({
  radius,
  rotation,
  active,
}: {
  radius: number
  rotation: [number, number, number]
  active: boolean
}) {
  const orbitRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!orbitRef.current) return
    const material = orbitRef.current.material as THREE.MeshBasicMaterial
    material.opacity = active ? 0.78 + Math.sin(state.clock.elapsedTime * 2) * 0.05 : 0.32
  })

  return (
    <mesh ref={orbitRef} rotation={rotation}>
      <torusGeometry args={[radius, 0.026, 16, 220]} />
      <meshBasicMaterial color={active ? '#d5efff' : '#385067'} transparent opacity={active ? 0.78 : 0.32} />
    </mesh>
  )
}

function Planet({
  planet,
  index,
  activeIndex,
}: {
  planet: (typeof PLANETS)[number]
  index: number
  activeIndex: number
}) {
  const orbitRef = useRef<THREE.Group>(null)
  const planetRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const bandRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const moonOrbitRef = useRef<THREE.Group>(null)
  const active = index === activeIndex

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (orbitRef.current) {
      orbitRef.current.rotation.x = planet.tilt[0]
      orbitRef.current.rotation.y = planet.tilt[1]
      orbitRef.current.rotation.z = planet.tilt[2]
      orbitRef.current.rotation.y += t * planet.speed
    }

    if (planetRef.current) {
      planetRef.current.position.set(planet.radius, Math.sin(t * planet.speed * 1.8 + planet.phase) * 0.18, 0)
      planetRef.current.rotation.y = t * 1.3
      planetRef.current.rotation.z = 0.2
      planetRef.current.scale.setScalar(active ? 1.18 : 1)
    }

    if (glowRef.current && planetRef.current) {
      glowRef.current.position.copy(planetRef.current.position)
      glowRef.current.scale.setScalar(active ? 1.45 : 1.12)
    }

    if (bandRef.current && planetRef.current) {
      bandRef.current.position.copy(planetRef.current.position)
      bandRef.current.rotation.copy(planetRef.current.rotation)
      bandRef.current.scale.setScalar(active ? 1.16 : 1)
    }

    if (ringRef.current && planetRef.current) {
      ringRef.current.position.copy(planetRef.current.position)
      ringRef.current.rotation.set(Math.PI * 0.4, t * 0.3, Math.PI * 0.15)
      ringRef.current.scale.setScalar(active ? 1.06 : 1)
    }

    if (moonOrbitRef.current && planetRef.current) {
      moonOrbitRef.current.position.copy(planetRef.current.position)
      moonOrbitRef.current.rotation.y = t * 1.6
      moonOrbitRef.current.rotation.x = 0.5
    }
  })

  return (
    <>
      <OrbitPlane radius={planet.radius} rotation={planet.tilt} active={active} />
      <group ref={orbitRef} rotation={planet.tilt}>
        <mesh ref={glowRef}>
          <sphereGeometry args={[planet.size * 1.75, 32, 32]} />
          <meshBasicMaterial color={planet.halo} transparent opacity={active ? 0.14 : 0.08} />
        </mesh>
        <mesh ref={bandRef} scale={[1.02, 1.02, 1.02]}>
          <sphereGeometry args={[planet.size * 1.01, 48, 48]} />
          <meshStandardMaterial
            color={planet.band}
            emissive={planet.band}
            emissiveIntensity={active ? 0.24 : 0.14}
            transparent
            opacity={0.18}
            roughness={0.42}
            metalness={0.04}
          />
        </mesh>
        <mesh ref={planetRef}>
          <sphereGeometry args={[planet.size, 48, 48]} />
          <meshStandardMaterial
            color={planet.color}
            emissive={planet.emissive}
            emissiveIntensity={active ? 1.2 : 0.72}
            roughness={0.3}
            metalness={0.08}
          />
          <Html distanceFactor={10} center>
            <div className={`scene-label ${active ? 'scene-label--active' : ''}`}>{planet.label}</div>
          </Html>
        </mesh>
        {planet.rings ? (
          <mesh ref={ringRef}>
            <torusGeometry args={[planet.size * 1.56, planet.size * 0.12, 20, 120]} />
            <meshStandardMaterial
              color={planet.rings}
              emissive={planet.rings}
              emissiveIntensity={active ? 0.32 : 0.18}
              transparent
              opacity={0.72}
              roughness={0.44}
              metalness={0.06}
            />
          </mesh>
        ) : null}
        {planet.moon ? (
          <group ref={moonOrbitRef}>
            <mesh position={[planet.size * 1.85, 0, 0]}>
              <sphereGeometry args={[planet.size * 0.22, 24, 24]} />
              <meshStandardMaterial
                color={planet.moon}
                emissive={planet.moon}
                emissiveIntensity={active ? 0.26 : 0.12}
                roughness={0.4}
                metalness={0.04}
              />
            </mesh>
          </group>
        ) : null}
      </group>
    </>
  )
}

function SolarCore({ activeIndex }: { activeIndex: number }) {
  const systemRef = useRef<THREE.Group>(null)
  const sunRef = useRef<THREE.Mesh>(null)
  const shellRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    const pointerX = state.pointer.x * 0.4
    const pointerY = state.pointer.y * 0.2

    if (systemRef.current) {
      systemRef.current.rotation.y = t * 0.05 + pointerX
      systemRef.current.rotation.x = pointerY
    }

    if (sunRef.current) {
      const pulse = 1 + Math.sin(t * 1.4) * 0.035
      sunRef.current.scale.setScalar(pulse)
      sunRef.current.rotation.y = t * 0.25
    }

    if (shellRef.current) {
      shellRef.current.scale.setScalar(1.25 + Math.sin(t * 0.9) * 0.04)
      shellRef.current.rotation.y = -t * 0.18
    }
  })

  return (
    <group ref={systemRef}>
      <mesh ref={shellRef}>
        <sphereGeometry args={[2.7, 56, 56]} />
        <meshBasicMaterial color="#79d7ff" transparent opacity={0.08} />
      </mesh>
      <mesh ref={sunRef}>
        <sphereGeometry args={[2.12, 64, 64]} />
        <meshStandardMaterial
          color={activeIndex % 2 === 0 ? '#fbd38d' : '#ffe79a'}
          emissive={activeIndex % 2 === 0 ? '#ff8f3a' : '#ffb347'}
          emissiveIntensity={2.1}
          roughness={0.16}
          metalness={0.04}
        />
      </mesh>
      <mesh scale={0.52}>
        <sphereGeometry args={[2.12, 48, 48]} />
        <meshBasicMaterial color="#fff7cf" transparent opacity={0.38} />
      </mesh>
      {PLANETS.map((planet, index) => (
        <Planet key={planet.label} planet={planet} index={index} activeIndex={activeIndex} />
      ))}
    </group>
  )
}

export function HeroScene({ activeIndex }: HeroSceneProps) {
  return (
    <Canvas className="hero-canvas" dpr={[1, 1.5]} camera={{ position: [0, 0, 15], fov: 34 }}>
      <color attach="background" args={['#020611']} />
      <fog attach="fog" args={['#020611', 10, 26]} />
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 0, 0]} intensity={95} color="#ffb84d" />
      <pointLight position={[8, 5, 7]} intensity={28} color="#76dcff" />
      <pointLight position={[-8, -4, 8]} intensity={14} color="#6ca7ff" />
      <Stars radius={110} depth={80} count={3400} factor={4.4} saturation={0.08} fade speed={0.7} />
      <Suspense fallback={null}>
        <SolarCore activeIndex={activeIndex} />
      </Suspense>
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.18} />
    </Canvas>
  )
}
