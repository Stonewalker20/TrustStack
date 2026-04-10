import { Canvas, useFrame } from '@react-three/fiber'
import { Html, OrbitControls, Sparkles, Stars } from '@react-three/drei'
import { Suspense, useMemo, useRef } from 'react'
import * as THREE from 'three'

type HeroSceneProps = { activeIndex: number }

type SubsystemPlanet = {
  subsystem: string
  planet: string
  siderealDays: number
  semimajorAxisAu: number
  eccentricity: number
  inclinationDeg: number
  ascendingNodeDeg: number
  longitudeOfPerihelionDeg: number
  meanLongitudeDeg: number
  size: number
  color: string
  emissive: string
  band: string
  halo: string
  rings?: string
  moon?: string
}

const J2000_UNIX_MS = Date.UTC(2000, 0, 1, 12, 0, 0, 0)
const ORBIT_SCALE = 1.12

const PLANETS: SubsystemPlanet[] = [
  {
    subsystem: 'Safety',
    planet: 'Mercury',
    siderealDays: 87.969,
    semimajorAxisAu: 0.38709893,
    eccentricity: 0.20563069,
    inclinationDeg: 7.00487,
    ascendingNodeDeg: 48.33167,
    longitudeOfPerihelionDeg: 77.45645,
    meanLongitudeDeg: 252.25084,
    size: 0.2,
    color: '#b8c1cf',
    emissive: '#30394a',
    band: '#dbe3f0',
    halo: '#b6c0d7',
  },
  {
    subsystem: 'Robustness',
    planet: 'Venus',
    siderealDays: 224.701,
    semimajorAxisAu: 0.72333199,
    eccentricity: 0.00677323,
    inclinationDeg: 3.39471,
    ascendingNodeDeg: 76.68069,
    longitudeOfPerihelionDeg: 131.53298,
    meanLongitudeDeg: 181.97973,
    size: 0.31,
    color: '#e4c88d',
    emissive: '#6f4d21',
    band: '#fff0cc',
    halo: '#ffd99f',
  },
  {
    subsystem: 'Privacy',
    planet: 'Earth',
    siderealDays: 365.256,
    semimajorAxisAu: 1.00000011,
    eccentricity: 0.01671022,
    inclinationDeg: 0.00005,
    ascendingNodeDeg: -11.26064,
    longitudeOfPerihelionDeg: 102.94719,
    meanLongitudeDeg: 100.46435,
    size: 0.34,
    color: '#6aa2ff',
    emissive: '#173f77',
    band: '#d8ebff',
    halo: '#7fb3ff',
    moon: '#d8dce6',
  },
  {
    subsystem: 'Bias',
    planet: 'Mars',
    siderealDays: 686.980,
    semimajorAxisAu: 1.52366231,
    eccentricity: 0.09341233,
    inclinationDeg: 1.85061,
    ascendingNodeDeg: 49.57854,
    longitudeOfPerihelionDeg: 336.04084,
    meanLongitudeDeg: 355.45332,
    size: 0.28,
    color: '#d9835f',
    emissive: '#6d2719',
    band: '#ffd6c2',
    halo: '#f3a07e',
    moon: '#f2e7dc',
  },
  {
    subsystem: 'Monitoring',
    planet: 'Jupiter',
    siderealDays: 4332.589,
    semimajorAxisAu: 5.20336301,
    eccentricity: 0.04839266,
    inclinationDeg: 1.30530,
    ascendingNodeDeg: 100.55615,
    longitudeOfPerihelionDeg: 14.75385,
    meanLongitudeDeg: 34.40438,
    size: 0.62,
    color: '#d3ae7e',
    emissive: '#6a4822',
    band: '#fff0d4',
    halo: '#e8bf8d',
  },
  {
    subsystem: 'Hallucination',
    planet: 'Saturn',
    siderealDays: 10759.22,
    semimajorAxisAu: 9.53707032,
    eccentricity: 0.05415060,
    inclinationDeg: 2.48446,
    ascendingNodeDeg: 113.71504,
    longitudeOfPerihelionDeg: 92.43194,
    meanLongitudeDeg: 49.94432,
    size: 0.56,
    color: '#d9c58e',
    emissive: '#5b4721',
    band: '#fef1c4',
    halo: '#f0d7a0',
    rings: '#ccb27a',
  },
]

function toRadians(value: number) {
  return (value * Math.PI) / 180
}

function normalizeAngle(angle: number) {
  return ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
}

function solveEccentricAnomaly(meanAnomaly: number, eccentricity: number) {
  let eccentricAnomaly = meanAnomaly
  for (let iteration = 0; iteration < 6; iteration += 1) {
    eccentricAnomaly -=
      (eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - meanAnomaly) /
      (1 - eccentricity * Math.cos(eccentricAnomaly))
  }
  return eccentricAnomaly
}

function getOrbitalPosition(planet: SubsystemPlanet, elapsedDaysSinceJ2000: number) {
  const semimajor = planet.semimajorAxisAu * ORBIT_SCALE
  const eccentricity = planet.eccentricity
  const inclination = toRadians(planet.inclinationDeg)
  const ascendingNode = toRadians(planet.ascendingNodeDeg)
  const longitudeOfPerihelion = toRadians(planet.longitudeOfPerihelionDeg)
  const argumentOfPerihelion = longitudeOfPerihelion - ascendingNode
  const initialMeanAnomaly = normalizeAngle(toRadians(planet.meanLongitudeDeg - planet.longitudeOfPerihelionDeg))
  const meanMotion = (Math.PI * 2) / planet.siderealDays
  const meanAnomaly = normalizeAngle(initialMeanAnomaly + elapsedDaysSinceJ2000 * meanMotion)
  const eccentricAnomaly = solveEccentricAnomaly(meanAnomaly, eccentricity)

  const xPrime = semimajor * (Math.cos(eccentricAnomaly) - eccentricity)
  const zPrime = semimajor * Math.sqrt(1 - eccentricity * eccentricity) * Math.sin(eccentricAnomaly)
  const position = new THREE.Vector3(xPrime, 0, zPrime)

  position.applyAxisAngle(new THREE.Vector3(0, 1, 0), argumentOfPerihelion)
  position.applyAxisAngle(new THREE.Vector3(0, 0, 1), inclination)
  position.applyAxisAngle(new THREE.Vector3(0, 1, 0), ascendingNode)

  return position
}

function OrbitPath({ planet, active }: { planet: SubsystemPlanet; active: boolean }) {
  const points = useMemo(() => {
    const sampleCount = 240
    return Array.from({ length: sampleCount + 1 }, (_, index) => {
      const elapsedDays = (planet.siderealDays * index) / sampleCount
      const point = getOrbitalPosition(planet, elapsedDays)
      return [point.x, point.y, point.z] as [number, number, number]
    })
  }, [planet])

  const geometry = useMemo(() => {
    const orbitGeometry = new THREE.BufferGeometry()
    orbitGeometry.setFromPoints(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)))
    return orbitGeometry
  }, [points])

  return (
    <line geometry={geometry}>
      <lineBasicMaterial color={active ? '#d5efff' : '#324555'} transparent opacity={active ? 0.8 : 0.26} />
    </line>
  )
}

function AsteroidBelt() {
  const groupRef = useRef<THREE.Group>(null)
  const asteroids = useMemo(
    () =>
      Array.from({ length: 180 }, (_, index) => {
        const angle = (index / 180) * Math.PI * 2
        const radius = 3.2 + Math.random() * 0.75
        const y = (Math.random() - 0.5) * 0.22
        const size = 0.02 + Math.random() * 0.05
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
      groupRef.current.rotation.x = 0.36
      groupRef.current.rotation.z = 0.08
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.018
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
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    const earth = PLANETS.find((planet) => planet.planet === 'Earth')
    if (!groupRef.current || !earth) return
    const elapsedDays = (Date.now() - J2000_UNIX_MS) / 86400000
    const earthPosition = getOrbitalPosition(earth, elapsedDays)
    const t = state.clock.getElapsedTime()
    groupRef.current.position.copy(earthPosition)
    groupRef.current.rotation.y = t * 1.8
    groupRef.current.rotation.x = 0.44
  })

  return (
    <group ref={groupRef}>
      <mesh position={[0.24, 0.02, 0]}>
        <boxGeometry args={[0.08, 0.035, 0.035]} />
        <meshStandardMaterial color="#d4dde8" emissive="#2d3948" metalness={0.66} roughness={0.3} />
      </mesh>
      <mesh position={[0.12, 0.02, 0]}>
        <boxGeometry args={[0.1, 0.012, 0.072]} />
        <meshStandardMaterial color="#5ea3ff" emissive="#173f77" metalness={0.4} roughness={0.28} />
      </mesh>
      <mesh position={[0.36, 0.02, 0]}>
        <boxGeometry args={[0.1, 0.012, 0.072]} />
        <meshStandardMaterial color="#5ea3ff" emissive="#173f77" metalness={0.4} roughness={0.28} />
      </mesh>
    </group>
  )
}

function BackgroundStars() {
  const starsRef = useRef<THREE.Group>(null)
  const stars = useMemo(
    () =>
      Array.from({ length: 80 }, () => ({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 96,
          (Math.random() - 0.5) * 56,
          -14 - Math.random() * 28,
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
          <meshBasicMaterial color="#ffffff" transparent opacity={0.82} />
        </mesh>
      ))}
    </group>
  )
}

function PlanetBody({ planet, index, activeIndex }: { planet: SubsystemPlanet; index: number; activeIndex: number }) {
  const groupRef = useRef<THREE.Group>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const bandRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const moonOrbitRef = useRef<THREE.Group>(null)
  const active = index === activeIndex

  useFrame((state) => {
    const elapsedDays = (Date.now() - J2000_UNIX_MS) / 86400000
    const position = getOrbitalPosition(planet, elapsedDays)
    const t = state.clock.getElapsedTime()

    if (groupRef.current) {
      groupRef.current.position.copy(position)
      groupRef.current.rotation.y = t * 0.35
      groupRef.current.scale.setScalar(active ? 1.15 : 1)
    }

    if (glowRef.current) {
      glowRef.current.scale.setScalar(active ? 1.56 : 1.18)
    }

    if (bandRef.current) {
      bandRef.current.rotation.y = t * 0.4
    }

    if (ringRef.current) {
      ringRef.current.rotation.set(Math.PI * 0.42, t * 0.16, Math.PI * 0.14)
    }

    if (moonOrbitRef.current) {
      moonOrbitRef.current.rotation.y = t * 1.6
      moonOrbitRef.current.rotation.x = 0.5
    }
  })

  return (
    <>
      <OrbitPath planet={planet} active={active} />
      <group ref={groupRef}>
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
        <mesh>
          <sphereGeometry args={[planet.size, 48, 48]} />
          <meshStandardMaterial
            color={planet.color}
            emissive={planet.emissive}
            emissiveIntensity={active ? 1.2 : 0.72}
            roughness={0.32}
            metalness={0.08}
          />
          <Html distanceFactor={10} center>
            <div className={`scene-label ${active ? 'scene-label--active' : ''}`}>
              {planet.subsystem} · {planet.planet}
            </div>
          </Html>
        </mesh>
        {planet.rings ? (
          <mesh ref={ringRef}>
            <torusGeometry args={[planet.size * 1.62, planet.size * 0.12, 20, 120]} />
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
            <mesh position={[planet.size * 1.9, 0, 0]}>
              <sphereGeometry args={[planet.size * 0.2, 24, 24]} />
              <meshStandardMaterial
                color={planet.moon}
                emissive={planet.moon}
                emissiveIntensity={active ? 0.22 : 0.12}
                roughness={0.42}
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
    const pointerX = state.pointer.x * 0.28
    const pointerY = state.pointer.y * 0.14

    if (systemRef.current) {
      systemRef.current.rotation.y = pointerX
      systemRef.current.rotation.x = pointerY
    }

    if (sunRef.current) {
      const pulse = 1 + Math.sin(t * 1.4) * 0.03
      sunRef.current.scale.setScalar(pulse)
      sunRef.current.rotation.y = t * 0.22
    }

    if (coronaRef.current) {
      coronaRef.current.scale.setScalar(1.24 + Math.sin(t * 0.8) * 0.05)
      coronaRef.current.rotation.y = -t * 0.15
    }
  })

  return (
    <group ref={systemRef}>
      <mesh ref={coronaRef}>
        <sphereGeometry args={[1.7, 56, 56]} />
        <meshBasicMaterial color="#79d7ff" transparent opacity={0.08} />
      </mesh>
      <mesh>
        <sphereGeometry args={[2.4, 56, 56]} />
        <meshBasicMaterial color="#ffba59" transparent opacity={0.05} />
      </mesh>
      <mesh ref={sunRef}>
        <sphereGeometry args={[1.35, 64, 64]} />
        <meshStandardMaterial
          color={activeIndex % 2 === 0 ? '#fbd38d' : '#ffe79a'}
          emissive={activeIndex % 2 === 0 ? '#ff8f3a' : '#ffb347'}
          emissiveIntensity={2.2}
          roughness={0.16}
          metalness={0.04}
        />
      </mesh>
      <mesh scale={0.52}>
        <sphereGeometry args={[1.35, 48, 48]} />
        <meshBasicMaterial color="#fff7cf" transparent opacity={0.38} />
      </mesh>
      <ISSOrbit />
      {PLANETS.map((planet, index) => (
        <PlanetBody key={planet.planet} planet={planet} index={index} activeIndex={activeIndex} />
      ))}
      <AsteroidBelt />
    </group>
  )
}

export function HeroScene({ activeIndex }: HeroSceneProps) {
  return (
    <Canvas className="hero-canvas" dpr={[1, 1.5]} camera={{ position: [0, 7, 20], fov: 34 }}>
      <color attach="background" args={['#020611']} />
      <fog attach="fog" args={['#020611', 12, 40]} />
      <ambientLight intensity={0.24} />
      <pointLight position={[0, 0, 0]} intensity={120} color="#ffb84d" />
      <pointLight position={[8, 5, 7]} intensity={26} color="#76dcff" />
      <pointLight position={[-8, -4, 8]} intensity={12} color="#6ca7ff" />
      <spotLight position={[0, 12, 10]} angle={0.42} penumbra={1} intensity={26} color="#ffffff" />
      <Stars radius={120} depth={86} count={5200} factor={4.8} saturation={0.06} fade speed={0.55} />
      <Sparkles count={42} scale={[38, 22, 14]} size={2.4} speed={0.18} opacity={0.32} color="#f8fbff" />
      <BackgroundStars />
      <Suspense fallback={null}>
        <SolarCore activeIndex={activeIndex} />
      </Suspense>
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.05} maxPolarAngle={1.4} minPolarAngle={1.1} />
    </Canvas>
  )
}
