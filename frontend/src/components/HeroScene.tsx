import { Canvas, type ThreeEvent, useFrame, useThree } from '@react-three/fiber'
import { Html, Line, OrbitControls, Sparkles, Stars } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

type HeroSceneProps = {
  activeIndex: number
  selectedIndex: number | null
  onSelectPlanet: (index: number) => void
  onClearSelection: () => void
}

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
  poles?: string
  cloud?: string
  rings?: string
  moon?: string
}

const J2000_UNIX_MS = Date.UTC(2000, 0, 1, 12, 0, 0, 0)
const ORBIT_SCALE = 1.12
const SUN_POSITION = new THREE.Vector3(0, 0, 0)
const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0, 8.6, 21.5)
const DEFAULT_CAMERA_TARGET = new THREE.Vector3(0, 0, 0)

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
    color: '#a8adb7',
    emissive: '#252b36',
    band: '#cfd5de',
    halo: '#b6c0d7',
    poles: '#8c939d',
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
    color: '#dcb77c',
    emissive: '#6f4d21',
    band: '#fff0cc',
    halo: '#ffd99f',
    cloud: '#f3d8a3',
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
    color: '#3f7eff',
    emissive: '#173f77',
    band: '#6ed27f',
    halo: '#7fb3ff',
    cloud: '#e9f3ff',
    moon: '#d8dce6',
  },
  {
    subsystem: 'Bias',
    planet: 'Mars',
    siderealDays: 686.98,
    semimajorAxisAu: 1.52366231,
    eccentricity: 0.09341233,
    inclinationDeg: 1.85061,
    ascendingNodeDeg: 49.57854,
    longitudeOfPerihelionDeg: 336.04084,
    meanLongitudeDeg: 355.45332,
    size: 0.28,
    color: '#c96846',
    emissive: '#6d2719',
    band: '#e9b097',
    halo: '#f3a07e',
    poles: '#f2dfd3',
    moon: '#f2e7dc',
  },
  {
    subsystem: 'Monitoring',
    planet: 'Jupiter',
    siderealDays: 4332.589,
    semimajorAxisAu: 5.20336301,
    eccentricity: 0.04839266,
    inclinationDeg: 1.3053,
    ascendingNodeDeg: 100.55615,
    longitudeOfPerihelionDeg: 14.75385,
    meanLongitudeDeg: 34.40438,
    size: 0.62,
    color: '#cba274',
    emissive: '#6a4822',
    band: '#f5e4c9',
    halo: '#e8bf8d',
    cloud: '#b67453',
  },
  {
    subsystem: 'Hallucination',
    planet: 'Saturn',
    siderealDays: 10759.22,
    semimajorAxisAu: 9.53707032,
    eccentricity: 0.0541506,
    inclinationDeg: 2.48446,
    ascendingNodeDeg: 113.71504,
    longitudeOfPerihelionDeg: 92.43194,
    meanLongitudeDeg: 49.94432,
    size: 0.56,
    color: '#d5bf86',
    emissive: '#5b4721',
    band: '#fef1c4',
    halo: '#f0d7a0',
    cloud: '#e6d29e',
    rings: '#ccb27a',
    moon: '#ebe2cb',
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

function getElapsedDaysSinceJ2000() {
  return (Date.now() - J2000_UNIX_MS) / 86400000
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
    const sampleCount = 320
    return Array.from({ length: sampleCount + 1 }, (_, index) => {
      const elapsedDays = (planet.siderealDays * index) / sampleCount
      return getOrbitalPosition(planet, elapsedDays)
    })
  }, [planet])

  return (
    <Line
      points={points}
      color={active ? '#e5f3ff' : '#243140'}
      transparent
      opacity={active ? 0.82 : 0.2}
      lineWidth={active ? 1.4 : 0.8}
    />
  )
}

function DeepField() {
  const galaxies = useMemo(
    () =>
      Array.from({ length: 18 }, () => ({
        position: [(Math.random() - 0.5) * 120, (Math.random() - 0.5) * 72, -28 - Math.random() * 36] as [
          number,
          number,
          number,
        ],
        scale: [1.2 + Math.random() * 2.6, 0.25 + Math.random() * 0.45, 1] as [number, number, number],
        rotation: Math.random() * Math.PI,
        color: ['#dbeafe', '#f8fafc', '#fde68a', '#bfdbfe'][Math.floor(Math.random() * 4)],
      })),
    [],
  )

  return (
    <group>
      {galaxies.map((galaxy, index) => (
        <mesh key={index} position={galaxy.position} rotation={[0, 0, galaxy.rotation]} scale={galaxy.scale}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color={galaxy.color} transparent opacity={0.08} />
        </mesh>
      ))}
      <Sparkles count={64} scale={[48, 28, 18]} size={2.8} speed={0.12} opacity={0.35} color="#f8fbff" />
    </group>
  )
}

function AsteroidBelt() {
  const groupRef = useRef<THREE.Group>(null)
  const asteroids = useMemo(
    () =>
      Array.from({ length: 240 }, (_, index) => {
        const angle = (index / 240) * Math.PI * 2
        const radius = 3.05 + Math.random() * 0.9
        const y = (Math.random() - 0.5) * 0.24
        const size = 0.015 + Math.random() * 0.05
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
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.016
    }
  })

  return (
    <group ref={groupRef}>
      {asteroids.map((asteroid, index) => (
        <mesh key={index} position={asteroid.position} rotation={asteroid.rotation} scale={asteroid.scale}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#6c7686" emissive="#0f1319" roughness={0.94} metalness={0.04} />
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
    const earthPosition = getOrbitalPosition(earth, getElapsedDaysSinceJ2000())
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

function Comets() {
  const groupRef = useRef<THREE.Group>(null)
  const comets = useMemo(
    () => [
      { offset: 0, radius: 16, speed: 0.045, tail: '#dbeafe' },
      { offset: Math.PI, radius: 20, speed: 0.032, tail: '#e0f2fe' },
    ],
    [],
  )

  useFrame((state) => {
    if (!groupRef.current) return
    groupRef.current.children.forEach((child, index) => {
      const comet = comets[index]
      const t = state.clock.getElapsedTime() * comet.speed + comet.offset
      child.position.set(Math.cos(t) * comet.radius, Math.sin(t * 0.7) * 4.2, Math.sin(t) * comet.radius * 0.42 - 14)
      child.lookAt(child.position.clone().add(new THREE.Vector3(-Math.sin(t), 0, Math.cos(t))))
    })
  })

  return (
    <group ref={groupRef}>
      {comets.map((comet, index) => (
        <group key={index}>
          <mesh>
            <sphereGeometry args={[0.11, 16, 16]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.92} />
          </mesh>
          <mesh position={[-0.75, 0, 0]} scale={[2.8, 0.12, 0.12]}>
            <sphereGeometry args={[1, 24, 24]} />
            <meshBasicMaterial color={comet.tail} transparent opacity={0.18} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function CameraRig({ selectedIndex }: { selectedIndex: number | null }) {
  const { camera } = useThree()
  const controlsRef = useRef<any>(null)
  const targetPosition = useRef(DEFAULT_CAMERA_POSITION.clone())
  const targetLookAt = useRef(DEFAULT_CAMERA_TARGET.clone())

  useEffect(() => {
    if (selectedIndex === null) {
      targetPosition.current.copy(DEFAULT_CAMERA_POSITION)
      targetLookAt.current.copy(DEFAULT_CAMERA_TARGET)
      return
    }

    const planet = PLANETS[selectedIndex]
    const position = getOrbitalPosition(planet, getElapsedDaysSinceJ2000())
    const offset = position
      .clone()
      .sub(SUN_POSITION)
      .normalize()
      .multiplyScalar(Math.max(planet.size * 8.5, 3.2))
      .add(new THREE.Vector3(0, planet.size * 1.8 + 0.7, 0))

    targetLookAt.current.copy(position)
    targetPosition.current.copy(position.clone().add(offset))
  }, [selectedIndex])

  useFrame(() => {
    camera.position.lerp(targetPosition.current, 0.055)
    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetLookAt.current, 0.07)
      controlsRef.current.update()
    } else {
      camera.lookAt(targetLookAt.current)
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enableZoom={false}
      enablePan={false}
      enableRotate={false}
      autoRotate={selectedIndex === null}
      autoRotateSpeed={0.08}
    />
  )
}

function PlanetBody({
  planet,
  index,
  activeIndex,
  selectedIndex,
  onSelectPlanet,
}: {
  planet: SubsystemPlanet
  index: number
  activeIndex: number
  selectedIndex: number | null
  onSelectPlanet: (index: number) => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const bandRef = useRef<THREE.Mesh>(null)
  const cloudRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const moonOrbitRef = useRef<THREE.Group>(null)
  const active = index === activeIndex
  const selected = index === selectedIndex

  useFrame((state) => {
    const position = getOrbitalPosition(planet, getElapsedDaysSinceJ2000())
    const t = state.clock.getElapsedTime()

    if (groupRef.current) {
      groupRef.current.position.copy(position)
      groupRef.current.rotation.y = t * 0.35
      groupRef.current.scale.setScalar(selected ? 1.2 : active ? 1.12 : 1)
    }

    if (bandRef.current) {
      bandRef.current.rotation.y = t * 0.34
    }

    if (cloudRef.current) {
      cloudRef.current.rotation.y = -t * 0.22
    }

    if (ringRef.current) {
      ringRef.current.rotation.set(Math.PI * 0.42, t * 0.14, Math.PI * 0.14)
    }

    if (moonOrbitRef.current) {
      moonOrbitRef.current.rotation.y = t * 1.35
      moonOrbitRef.current.rotation.x = 0.5
    }
  })

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    onSelectPlanet(index)
  }

  return (
    <>
      <OrbitPath planet={planet} active={active || selected} />
      <group ref={groupRef} onPointerDown={handleClick}>
        <mesh scale={selected ? 1.65 : 1.28}>
          <sphereGeometry args={[planet.size * 1.2, 32, 32]} />
          <meshBasicMaterial color={planet.halo} transparent opacity={selected ? 0.16 : 0.08} />
        </mesh>
        <mesh ref={bandRef} scale={[1.02, 1.02, 1.02]}>
          <sphereGeometry args={[planet.size * 1.01, 48, 48]} />
          <meshStandardMaterial
            color={planet.band}
            emissive={planet.band}
            emissiveIntensity={selected ? 0.28 : 0.14}
            transparent
            opacity={planet.planet === 'Jupiter' || planet.planet === 'Saturn' ? 0.3 : 0.16}
            roughness={0.44}
            metalness={0.02}
          />
        </mesh>
        {planet.cloud ? (
          <mesh ref={cloudRef} scale={[1.035, 1.035, 1.035]}>
            <sphereGeometry args={[planet.size, 48, 48]} />
            <meshStandardMaterial
              color={planet.cloud}
              emissive={planet.cloud}
              emissiveIntensity={0.08}
              transparent
              opacity={planet.planet === 'Earth' ? 0.22 : 0.14}
              roughness={0.48}
              metalness={0.01}
            />
          </mesh>
        ) : null}
        <mesh>
          <sphereGeometry args={[planet.size, 56, 56]} />
          <meshStandardMaterial
            color={planet.color}
            emissive={planet.emissive}
            emissiveIntensity={selected ? 1.28 : active ? 0.92 : 0.68}
            roughness={0.42}
            metalness={planet.planet === 'Mercury' ? 0.12 : 0.04}
          />
        </mesh>
        {planet.poles ? (
          <>
            <mesh position={[0, planet.size * 0.82, 0]} scale={[0.78, 0.2, 0.78]}>
              <sphereGeometry args={[planet.size * 0.34, 24, 24]} />
              <meshStandardMaterial color={planet.poles} emissive={planet.poles} emissiveIntensity={0.1} />
            </mesh>
            <mesh position={[0, -planet.size * 0.82, 0]} scale={[0.78, 0.2, 0.78]}>
              <sphereGeometry args={[planet.size * 0.34, 24, 24]} />
              <meshStandardMaterial color={planet.poles} emissive={planet.poles} emissiveIntensity={0.08} />
            </mesh>
          </>
        ) : null}
        {planet.rings ? (
          <mesh ref={ringRef}>
            <torusGeometry args={[planet.size * 1.72, planet.size * 0.12, 20, 140]} />
            <meshStandardMaterial
              color={planet.rings}
              emissive={planet.rings}
              emissiveIntensity={selected ? 0.34 : 0.18}
              transparent
              opacity={0.76}
              roughness={0.5}
              metalness={0.04}
            />
          </mesh>
        ) : null}
        {planet.moon ? (
          <group ref={moonOrbitRef}>
            <mesh position={[planet.size * 1.95, 0, 0]}>
              <sphereGeometry args={[planet.size * 0.18, 24, 24]} />
              <meshStandardMaterial
                color={planet.moon}
                emissive={planet.moon}
                emissiveIntensity={selected ? 0.24 : 0.1}
                roughness={0.52}
                metalness={0.02}
              />
            </mesh>
          </group>
        ) : null}
        <Html distanceFactor={10} center>
          <div className={`scene-label ${active || selected ? 'scene-label--active' : ''}`}>
            {planet.subsystem} · {planet.planet}
          </div>
        </Html>
      </group>
    </>
  )
}

function SolarCore({
  activeIndex,
  selectedIndex,
  onSelectPlanet,
}: {
  activeIndex: number
  selectedIndex: number | null
  onSelectPlanet: (index: number) => void
}) {
  const sunRef = useRef<THREE.Mesh>(null)
  const coronaRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
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
    <group>
      <mesh ref={coronaRef} position={SUN_POSITION}>
        <sphereGeometry args={[1.75, 56, 56]} />
        <meshBasicMaterial color="#79d7ff" transparent opacity={0.08} />
      </mesh>
      <mesh position={SUN_POSITION}>
        <sphereGeometry args={[2.6, 56, 56]} />
        <meshBasicMaterial color="#ffba59" transparent opacity={0.05} />
      </mesh>
      <mesh ref={sunRef} position={SUN_POSITION}>
        <sphereGeometry args={[1.38, 64, 64]} />
        <meshStandardMaterial color="#ffd07e" emissive="#ff8f3a" emissiveIntensity={2.4} roughness={0.16} metalness={0.02} />
      </mesh>
      <mesh position={SUN_POSITION} scale={0.54}>
        <sphereGeometry args={[1.38, 48, 48]} />
        <meshBasicMaterial color="#fff7cf" transparent opacity={0.38} />
      </mesh>
      <ISSOrbit />
      {PLANETS.map((planet, index) => (
        <PlanetBody
          key={planet.planet}
          planet={planet}
          index={index}
          activeIndex={activeIndex}
          selectedIndex={selectedIndex}
          onSelectPlanet={onSelectPlanet}
        />
      ))}
      <AsteroidBelt />
    </group>
  )
}

export function HeroScene({ activeIndex, selectedIndex, onSelectPlanet, onClearSelection }: HeroSceneProps) {
  return (
    <Canvas className="hero-canvas" camera={{ position: DEFAULT_CAMERA_POSITION.toArray() as [number, number, number], fov: 34 }} onPointerMissed={onClearSelection}>
      <color attach="background" args={['#020611']} />
      <fog attach="fog" args={['#020611', 12, 46]} />
      <ambientLight intensity={0.24} />
      <pointLight position={[0, 0, 0]} intensity={125} color="#ffb84d" />
      <pointLight position={[8, 5, 7]} intensity={26} color="#76dcff" />
      <pointLight position={[-8, -4, 8]} intensity={12} color="#6ca7ff" />
      <spotLight position={[0, 12, 10]} angle={0.42} penumbra={1} intensity={26} color="#ffffff" />
      <Stars radius={140} depth={92} count={9000} factor={5.8} saturation={0.06} fade speed={0.5} />
      <DeepField />
      <Comets />
      <Suspense fallback={null}>
        <SolarCore activeIndex={activeIndex} selectedIndex={selectedIndex} onSelectPlanet={onSelectPlanet} />
      </Suspense>
      <CameraRig selectedIndex={selectedIndex} />
    </Canvas>
  )
}
