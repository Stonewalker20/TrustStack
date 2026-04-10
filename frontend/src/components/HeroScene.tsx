import { Canvas, useFrame } from '@react-three/fiber'
import { Html, OrbitControls, Sparkles, Stars } from '@react-three/drei'
import { Suspense, useMemo, useRef } from 'react'
import * as THREE from 'three'

type HeroSceneProps = { activeIndex: number }

type PlanetConfig = {
  label: string
  radius: number
  speed: number
  phase: number
  tilt: [number, number, number]
  size: number
  color: string
  emissive: string
  band: string
  halo: string
  rings?: string
  moon?: string
}

const PLANETS: PlanetConfig[] = [
  {
    label: 'Safety',
    radius: 4.8,
    speed: 0.42,
    phase: 0.4,
    tilt: [0.22, 0.1, 0.35],
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
    tilt: [-0.28, 0.18, -0.22],
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
    tilt: [0.3, -0.14, 0.18],
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
    tilt: [-0.24, 0.22, 0.3],
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
    tilt: [0.16, -0.3, -0.24],
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
    tilt: [0.12, 0.28, -0.33],
    size: 0.36,
    color: '#7bb2ff',
    emissive: '#1b3e86',
    band: '#d5e6ff',
    halo: '#7bb2ff',
    moon: '#c5d9ff',
  },
]

function OrbitPlane({ radius, rotation, active }: { radius: number; rotation: [number, number, number]; active: boolean }) {
  const orbitRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!orbitRef.current) return
    const material = orbitRef.current.material as THREE.MeshBasicMaterial
    material.opacity = active ? 0.78 + Math.sin(state.clock.elapsedTime * 2) * 0.05 : 0.22
  })

  return (
    <mesh ref={orbitRef} rotation={rotation}>
      <torusGeometry args={[radius, 0.024, 16, 260]} />
      <meshBasicMaterial color={active ? '#d5efff' : '#304355'} transparent opacity={active ? 0.78 : 0.22} />
    </mesh>
  )
}

function AsteroidBelt() {
  const groupRef = useRef<THREE.Group>(null)
  const asteroids = useMemo(
    () =>
      Array.from({ length: 180 }, (_, index) => {
        const angle = (index / 180) * Math.PI * 2
        const radius = 9.6 + Math.random() * 1.6
        const y = (Math.random() - 0.5) * 0.35
        const size = 0.03 + Math.random() * 0.08
        return {
          position: [Math.cos(angle) * radius, y, Math.sin(angle) * radius] as [number, number, number],
          rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI] as [
            number,
            number,
            number,
          ],
          scale: [size * 1.6, size, size * 1.2] as [number, number, number],
        }
      }),
    [],
  )

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.x = 0.62
      groupRef.current.rotation.z = 0.16
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.028
    }
  })

  return (
    <group ref={groupRef}>
      {asteroids.map((asteroid, index) => (
        <mesh key={index} position={asteroid.position} rotation={asteroid.rotation} scale={asteroid.scale}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#7d8593" emissive="#0f1319" roughness={0.9} metalness={0.06} />
        </mesh>
      ))}
    </group>
  )
}

function ISSOrbit() {
  const orbitRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!orbitRef.current) return
    const t = state.clock.getElapsedTime()
    orbitRef.current.rotation.x = 0.46
    orbitRef.current.rotation.z = -0.34
    orbitRef.current.rotation.y = t * 0.74
  })

  return (
    <group ref={orbitRef}>
      <group position={[3.2, 0.08, 0]}>
        <mesh>
          <boxGeometry args={[0.18, 0.08, 0.08]} />
          <meshStandardMaterial color="#cfd7e3" emissive="#293241" metalness={0.65} roughness={0.34} />
        </mesh>
        <mesh position={[-0.2, 0, 0]}>
          <boxGeometry args={[0.18, 0.03, 0.16]} />
          <meshStandardMaterial color="#5ea3ff" emissive="#173f77" metalness={0.4} roughness={0.28} />
        </mesh>
        <mesh position={[0.2, 0, 0]}>
          <boxGeometry args={[0.18, 0.03, 0.16]} />
          <meshStandardMaterial color="#5ea3ff" emissive="#173f77" metalness={0.4} roughness={0.28} />
        </mesh>
        <mesh position={[0, 0.07, 0]}>
          <boxGeometry args={[0.06, 0.04, 0.04]} />
          <meshStandardMaterial color="#eef5ff" emissive="#40556d" metalness={0.55} roughness={0.2} />
        </mesh>
      </group>
    </group>
  )
}

function BackgroundStars() {
  const starsRef = useRef<THREE.Group>(null)
  const stars = useMemo(
    () =>
      Array.from({ length: 70 }, () => ({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 80,
          (Math.random() - 0.5) * 46,
          -12 - Math.random() * 24,
        ),
        scale: 0.04 + Math.random() * 0.08,
      })),
    [],
  )

  useFrame((state) => {
    if (starsRef.current) {
      starsRef.current.rotation.y = state.clock.getElapsedTime() * 0.01
    }
  })

  return (
    <group ref={starsRef}>
      {stars.map((star, index) => (
        <mesh key={index} position={star.position}>
          <sphereGeometry args={[star.scale, 12, 12]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
        </mesh>
      ))}
    </group>
  )
}

function Planet({ planet, index, activeIndex }: { planet: PlanetConfig; index: number; activeIndex: number }) {
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
      orbitRef.current.rotation.y = planet.tilt[1] + t * planet.speed
      orbitRef.current.rotation.z = planet.tilt[2]
    }

    if (planetRef.current) {
      planetRef.current.position.set(planet.radius, Math.sin(t * planet.speed * 1.8 + planet.phase) * 0.18, 0)
      planetRef.current.rotation.y = t * 1.3
      planetRef.current.rotation.z = 0.2
      planetRef.current.scale.setScalar(active ? 1.18 : 1)
    }

    if (glowRef.current && planetRef.current) {
      glowRef.current.position.copy(planetRef.current.position)
      glowRef.current.scale.setScalar(active ? 1.5 : 1.12)
    }

    if (bandRef.current && planetRef.current) {
      bandRef.current.position.copy(planetRef.current.position)
      bandRef.current.rotation.copy(planetRef.current.rotation)
      bandRef.current.scale.setScalar(active ? 1.16 : 1)
    }

    if (ringRef.current && planetRef.current) {
      ringRef.current.position.copy(planetRef.current.position)
      ringRef.current.rotation.set(Math.PI * 0.4, t * 0.3, Math.PI * 0.15)
      ringRef.current.scale.setScalar(active ? 1.08 : 1)
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
          <sphereGeometry args={[planet.size * 1.78, 32, 32]} />
          <meshBasicMaterial color={planet.halo} transparent opacity={active ? 0.16 : 0.08} />
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
  const coronaRef = useRef<THREE.Mesh>(null)

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

    if (coronaRef.current) {
      coronaRef.current.scale.setScalar(1.26 + Math.sin(t * 0.9) * 0.05)
      coronaRef.current.rotation.y = -t * 0.18
    }
  })

  return (
    <group ref={systemRef}>
      <mesh ref={coronaRef}>
        <sphereGeometry args={[2.7, 56, 56]} />
        <meshBasicMaterial color="#79d7ff" transparent opacity={0.08} />
      </mesh>
      <mesh>
        <sphereGeometry args={[3.7, 56, 56]} />
        <meshBasicMaterial color="#ffba59" transparent opacity={0.05} />
      </mesh>
      <mesh ref={sunRef}>
        <sphereGeometry args={[2.12, 64, 64]} />
        <meshStandardMaterial
          color={activeIndex % 2 === 0 ? '#fbd38d' : '#ffe79a'}
          emissive={activeIndex % 2 === 0 ? '#ff8f3a' : '#ffb347'}
          emissiveIntensity={2.2}
          roughness={0.16}
          metalness={0.04}
        />
      </mesh>
      <mesh scale={0.52}>
        <sphereGeometry args={[2.12, 48, 48]} />
        <meshBasicMaterial color="#fff7cf" transparent opacity={0.38} />
      </mesh>
      <ISSOrbit />
      {PLANETS.map((planet, index) => (
        <Planet key={planet.label} planet={planet} index={index} activeIndex={activeIndex} />
      ))}
      <AsteroidBelt />
    </group>
  )
}

export function HeroScene({ activeIndex }: HeroSceneProps) {
  return (
    <Canvas className="hero-canvas" dpr={[1, 1.5]} camera={{ position: [0, 0, 15.5], fov: 34 }}>
      <color attach="background" args={['#020611']} />
      <fog attach="fog" args={['#020611', 11, 34]} />
      <ambientLight intensity={0.26} />
      <pointLight position={[0, 0, 0]} intensity={120} color="#ffb84d" />
      <pointLight position={[8, 5, 7]} intensity={28} color="#76dcff" />
      <pointLight position={[-8, -4, 8]} intensity={14} color="#6ca7ff" />
      <spotLight position={[0, 10, 10]} angle={0.4} penumbra={1} intensity={28} color="#ffffff" />
      <Stars radius={110} depth={84} count={5200} factor={4.8} saturation={0.06} fade speed={0.55} />
      <Sparkles count={42} scale={[34, 18, 12]} size={2.4} speed={0.18} opacity={0.32} color="#f8fbff" />
      <BackgroundStars />
      <Suspense fallback={null}>
        <SolarCore activeIndex={activeIndex} />
      </Suspense>
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.14} />
    </Canvas>
  )
}
