import { Canvas, type ThreeEvent, useFrame, useThree } from '@react-three/fiber'
import { Line, OrbitControls, Sparkles, Stars } from '@react-three/drei'
import { Suspense, useMemo, useRef } from 'react'
import * as THREE from 'three'

type HeroSceneProps = {
  activeIndex: number | null
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
  moonCount: number
  diameterRatioEarth: number
  color: string
  emissive: string
  band: string
  halo: string
  poles?: string
  cloud?: string
  rings?: string
  moon?: string
}

type OrbitalBody = Pick<
  SubsystemPlanet,
  | 'siderealDays'
  | 'semimajorAxisAu'
  | 'eccentricity'
  | 'inclinationDeg'
  | 'ascendingNodeDeg'
  | 'longitudeOfPerihelionDeg'
  | 'meanLongitudeDeg'
>

type StellarBody = {
  distance: [number, number, number]
  diameterRatioSun: number
  color: string
}

const ORBIT_SCALE = 1.12
const SCREEN_ORBIT_SECONDS = 300
const EARTH_DIAMETER_KM = 12742
const SUN_DIAMETER_KM = 1392700
const SUN_DIAMETER_RATIO_EARTH = SUN_DIAMETER_KM / EARTH_DIAMETER_KM
const EARTH_VISUAL_DIAMETER = 0.01
const SUN_POSITION = new THREE.Vector3(0, 0, 0)
const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0, 16.6, 28.8)
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
    moonCount: 0,
    diameterRatioEarth: 0.383,
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
    moonCount: 0,
    diameterRatioEarth: 0.949,
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
    moonCount: 1,
    diameterRatioEarth: 1,
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
    moonCount: 2,
    diameterRatioEarth: 0.532,
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
    moonCount: 95,
    diameterRatioEarth: 11.21,
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
    moonCount: 274,
    diameterRatioEarth: 9.45,
    color: '#d5bf86',
    emissive: '#5b4721',
    band: '#fef1c4',
    halo: '#f0d7a0',
    cloud: '#e6d29e',
    rings: '#ccb27a',
    moon: '#ebe2cb',
  },
  {
    subsystem: 'Unassigned',
    planet: 'Uranus',
    siderealDays: 30685.4,
    semimajorAxisAu: 19.19126393,
    eccentricity: 0.04716771,
    inclinationDeg: 0.76986,
    ascendingNodeDeg: 74.22988,
    longitudeOfPerihelionDeg: 170.96424,
    meanLongitudeDeg: 313.23218,
    moonCount: 28,
    diameterRatioEarth: 4.01,
    color: '#9fd7df',
    emissive: '#235b66',
    band: '#c7eef4',
    halo: '#b8edf4',
    cloud: '#d7f6fa',
    rings: '#93c8cf',
    moon: '#d4e0e6',
  },
  {
    subsystem: 'Unassigned',
    planet: 'Neptune',
    siderealDays: 60189,
    semimajorAxisAu: 30.06896348,
    eccentricity: 0.00858587,
    inclinationDeg: 1.76917,
    ascendingNodeDeg: 131.72169,
    longitudeOfPerihelionDeg: 44.97135,
    meanLongitudeDeg: 304.88003,
    moonCount: 16,
    diameterRatioEarth: 3.88,
    color: '#456de6',
    emissive: '#17377e',
    band: '#8db2ff',
    halo: '#6b93ff',
    cloud: '#d6e4ff',
    moon: '#d3d8f2',
  },
  {
    subsystem: 'Unassigned',
    planet: 'Pluto',
    siderealDays: 90560,
    semimajorAxisAu: 39.48168677,
    eccentricity: 0.24880766,
    inclinationDeg: 17.14175,
    ascendingNodeDeg: 110.30347,
    longitudeOfPerihelionDeg: 224.06676,
    meanLongitudeDeg: 238.92881,
    moonCount: 5,
    diameterRatioEarth: 0.186,
    color: '#b9967d',
    emissive: '#4a2f22',
    band: '#dfc3ad',
    halo: '#c5a28d',
    poles: '#f1e1d3',
    moon: '#ddd4c8',
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

function getOrbitalPosition(planet: OrbitalBody, elapsedDaysSinceEpoch: number) {
  const semimajor = planet.semimajorAxisAu * ORBIT_SCALE
  const eccentricity = planet.eccentricity
  const inclination = toRadians(planet.inclinationDeg)
  const ascendingNode = toRadians(planet.ascendingNodeDeg)
  const longitudeOfPerihelion = toRadians(planet.longitudeOfPerihelionDeg)
  const argumentOfPerihelion = longitudeOfPerihelion - ascendingNode
  const initialMeanAnomaly = normalizeAngle(toRadians(planet.meanLongitudeDeg - planet.longitudeOfPerihelionDeg))
  const meanMotion = (Math.PI * 2) / planet.siderealDays
  const meanAnomaly = normalizeAngle(initialMeanAnomaly + elapsedDaysSinceEpoch * meanMotion)
  const eccentricAnomaly = solveEccentricAnomaly(meanAnomaly, eccentricity)

  const xPrime = semimajor * (Math.cos(eccentricAnomaly) - eccentricity)
  const zPrime = semimajor * Math.sqrt(1 - eccentricity * eccentricity) * Math.sin(eccentricAnomaly)
  const position = new THREE.Vector3(xPrime, 0, zPrime)

  position.applyAxisAngle(new THREE.Vector3(0, 1, 0), argumentOfPerihelion)
  position.applyAxisAngle(new THREE.Vector3(0, 0, 1), inclination)
  position.applyAxisAngle(new THREE.Vector3(0, 1, 0), ascendingNode)

  return position
}

function getSimulationDays(orbitalPeriodDays: number, elapsedSeconds: number) {
  return ((elapsedSeconds % SCREEN_ORBIT_SECONDS) / SCREEN_ORBIT_SECONDS) * orbitalPeriodDays
}

function getPlanetVisualSize(planet: SubsystemPlanet) {
  return planet.diameterRatioEarth * EARTH_VISUAL_DIAMETER
}

function getEarthDiameterScaled(diameterKm: number) {
  return (diameterKm / EARTH_DIAMETER_KM) * EARTH_VISUAL_DIAMETER
}

function getSunVisualDiameter() {
  return SUN_DIAMETER_RATIO_EARTH * EARTH_VISUAL_DIAMETER
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
  const sunVisualDiameter = getSunVisualDiameter()
  const galaxies = useMemo(
    () =>
      Array.from({ length: 36 }, (_, index) => ({
        position: [
          (Math.random() - 0.5) * 140,
          (Math.sin(index * 0.38) * 9 + (Math.random() - 0.5) * 10),
          -24 - Math.random() * 26,
        ] as [
          number,
          number,
          number,
        ],
        scale: [3.2 + Math.random() * 7.2, 0.32 + Math.random() * 0.74, 1] as [number, number, number],
        rotation: (Math.random() - 0.5) * 0.55,
        color: ['#dbeafe', '#f8fafc', '#fde68a', '#bfdbfe', '#e0f2fe'][Math.floor(Math.random() * 5)],
      })),
    [],
  )

  const stars = useMemo<StellarBody[]>(
    () =>
      Array.from({ length: 120 }, () => ({
        distance: [
          (Math.random() - 0.5) * 220,
          (Math.random() - 0.5) * 110,
          -80 - Math.random() * 90,
        ],
        diameterRatioSun: 0.15 + Math.random() * 8,
        color: ['#f8fafc', '#e0f2fe', '#dbeafe', '#fde68a'][Math.floor(Math.random() * 4)],
      })),
    [],
  )

  return (
    <group>
      <mesh position={[0, 1.2, -26]} rotation={[0, 0, -0.18]} scale={[120, 18, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#edf6ff" transparent opacity={0.05} />
      </mesh>
      <mesh position={[0, 1.2, -24]} rotation={[0, 0, -0.18]} scale={[128, 8, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#fff4c2" transparent opacity={0.06} />
      </mesh>
      {galaxies.map((galaxy, index) => (
        <mesh key={index} position={galaxy.position} rotation={[0, 0, galaxy.rotation]} scale={galaxy.scale}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color={galaxy.color} transparent opacity={0.12} />
        </mesh>
      ))}
      {stars.map((star, index) => (
        <mesh key={index} position={star.distance}>
          <sphereGeometry args={[(sunVisualDiameter * star.diameterRatioSun) / 2, 10, 10]} />
          <meshBasicMaterial color={star.color} transparent opacity={0.85} />
        </mesh>
      ))}
      <Sparkles count={180} scale={[84, 34, 26]} size={3.2} speed={0.16} opacity={0.58} color="#f8fbff" />
    </group>
  )
}

function AsteroidBelt() {
  const groupRef = useRef<THREE.Group>(null)
  const asteroids = useMemo(
    () =>
      Array.from({ length: 320 }, (_, index) => {
        const semimajorAxisAu = 2.1 + Math.random() * 1.2
        const eccentricity = 0.02 + Math.random() * 0.16
        const inclinationDeg = Math.random() * 16
        const ascendingNodeDeg = Math.random() * 360
        const longitudeOfPerihelionDeg = Math.random() * 360
        const meanLongitudeDeg = (index / 320) * 360
        const asteroidDiameterKm = 1 + Math.random() * 520
        const asteroidDiameter = getEarthDiameterScaled(asteroidDiameterKm)
        return {
          orbit: {
            siderealDays: 1680 + semimajorAxisAu * 260,
            semimajorAxisAu,
            eccentricity,
            inclinationDeg,
            ascendingNodeDeg,
            longitudeOfPerihelionDeg,
            meanLongitudeDeg,
          },
          rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI] as [
            number,
            number,
            number,
          ],
          scale: [asteroidDiameter * 0.8, asteroidDiameter * 0.5, asteroidDiameter * 0.65] as [number, number, number],
        }
      }),
    [],
  )

  useFrame((state) => {
    if (!groupRef.current) return
    groupRef.current.children.forEach((child, index) => {
      const asteroid = asteroids[index]
      const position = getOrbitalPosition(
        asteroid.orbit as OrbitalBody,
        getSimulationDays(asteroid.orbit.siderealDays, state.clock.getElapsedTime()),
      )
      child.position.copy(position)
    })
  })

  return (
    <group ref={groupRef}>
      {asteroids.map((asteroid, index) => (
        <mesh key={index} rotation={asteroid.rotation} scale={asteroid.scale}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#6c7686" emissive="#0f1319" roughness={0.94} metalness={0.04} />
        </mesh>
      ))}
    </group>
  )
}

function TrojanFields() {
  const groupRef = useRef<THREE.Group>(null)
  const jupiter = PLANETS.find((planet) => planet.planet === 'Jupiter')!
  const trojans = useMemo(
    () =>
      Array.from({ length: 280 }, (_, index) => {
        const clusterOffset = index < 140 ? 60 : -60
        const spread = (Math.random() - 0.5) * 22
        const semimajorAxisAu = jupiter.semimajorAxisAu + (Math.random() - 0.5) * 0.22
        const asteroidDiameterKm = 1 + Math.random() * 240
        const asteroidDiameter = getEarthDiameterScaled(asteroidDiameterKm)
        return {
          orbit: {
            siderealDays: jupiter.siderealDays + (Math.random() - 0.5) * 180,
            semimajorAxisAu,
            eccentricity: Math.max(0.01, jupiter.eccentricity + (Math.random() - 0.5) * 0.03),
            inclinationDeg: Math.max(0.2, jupiter.inclinationDeg + (Math.random() - 0.5) * 18),
            ascendingNodeDeg: jupiter.ascendingNodeDeg + (Math.random() - 0.5) * 18,
            longitudeOfPerihelionDeg: jupiter.longitudeOfPerihelionDeg + (Math.random() - 0.5) * 12,
            meanLongitudeDeg: jupiter.meanLongitudeDeg + clusterOffset + spread,
          },
          rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI] as [
            number,
            number,
            number,
          ],
          scale: [asteroidDiameter * 0.84, asteroidDiameter * 0.52, asteroidDiameter * 0.7] as [
            number,
            number,
            number,
          ],
        }
      }),
    [jupiter],
  )

  useFrame((state) => {
    if (!groupRef.current) return
    groupRef.current.children.forEach((child, index) => {
      const asteroid = trojans[index]
      const position = getOrbitalPosition(
        asteroid.orbit as OrbitalBody,
        getSimulationDays(asteroid.orbit.siderealDays, state.clock.getElapsedTime()),
      )
      child.position.copy(position)
    })
  })

  return (
    <group ref={groupRef}>
      {trojans.map((asteroid, index) => (
        <mesh key={index} rotation={asteroid.rotation} scale={asteroid.scale}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#7b6f63" emissive="#17110d" roughness={0.95} metalness={0.02} />
        </mesh>
      ))}
    </group>
  )
}

function ISSOrbit() {
  const groupRef = useRef<THREE.Group>(null)
  const earth = useMemo(() => PLANETS.find((planet) => planet.planet === 'Earth') ?? null, [])
  const earthSize = earth ? getPlanetVisualSize(earth) : EARTH_VISUAL_DIAMETER / 2
  const issOrbitRadius = earthSize * 1.07
  const issCoreLength = Math.max(earthSize * 0.095, 0.00018)
  const issCoreHeight = issCoreLength * 0.34
  const issPanelLength = issCoreLength * 1.55
  const issPanelHeight = issCoreLength * 0.18
  const issPanelWidth = issCoreLength * 0.86

  useFrame((state) => {
    if (!groupRef.current || !earth) return
    const earthPosition = getOrbitalPosition(earth, getSimulationDays(earth.siderealDays, state.clock.getElapsedTime()))
    const t = state.clock.getElapsedTime()
    groupRef.current.position.copy(earthPosition)
    groupRef.current.rotation.y = t * 3.6
    groupRef.current.rotation.x = 0.9
    groupRef.current.rotation.z = 0.22
  })

  return (
    <group ref={groupRef}>
      <mesh position={[issOrbitRadius, 0.00014, 0]}>
        <boxGeometry args={[issCoreLength, issCoreHeight, issCoreHeight]} />
        <meshStandardMaterial color="#d4dde8" emissive="#2d3948" metalness={0.66} roughness={0.3} />
      </mesh>
      <mesh position={[issOrbitRadius - issCoreLength * 0.88, 0.00014, 0]}>
        <boxGeometry args={[issPanelLength, issPanelHeight, issPanelWidth]} />
        <meshStandardMaterial color="#5ea3ff" emissive="#173f77" metalness={0.4} roughness={0.28} />
      </mesh>
      <mesh position={[issOrbitRadius + issCoreLength * 0.88, 0.00014, 0]}>
        <boxGeometry args={[issPanelLength, issPanelHeight, issPanelWidth]} />
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
  const focusCoverage = 0.4

  useFrame((state) => {
    if (selectedIndex === null) {
      targetPosition.current.copy(DEFAULT_CAMERA_POSITION)
      targetLookAt.current.copy(DEFAULT_CAMERA_TARGET)
    } else {
      const planet = PLANETS[selectedIndex]
      const planetSize = getPlanetVisualSize(planet)
      const position = getOrbitalPosition(planet, getSimulationDays(planet.siderealDays, state.clock.getElapsedTime()))
      const fovRadians = (((camera as THREE.PerspectiveCamera).fov ?? 34) * Math.PI) / 180
      const focusDistance = planetSize / (focusCoverage * Math.tan(fovRadians / 2))
      const offset = position
        .clone()
        .sub(SUN_POSITION)
        .normalize()
        .multiplyScalar(focusDistance)
        .add(new THREE.Vector3(0, planetSize * 0.16, 0))

      targetLookAt.current.copy(position)
      targetPosition.current.copy(position.clone().add(offset))
    }

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

function MoonSystem({ planet }: { planet: SubsystemPlanet }) {
  const groupRef = useRef<THREE.Group>(null)
  const planetSize = getPlanetVisualSize(planet)
  const isGasGiant = planet.planet === 'Jupiter' || planet.planet === 'Saturn'
  const isIceGiant = planet.planet === 'Uranus' || planet.planet === 'Neptune'
  const moons = useMemo(
    () =>
      Array.from({ length: planet.moonCount }, (_, index) => {
        const moonsPerBand = isGasGiant ? 18 : isIceGiant ? 10 : planet.planet === 'Mars' ? 2 : 4
        const band = Math.floor(index / moonsPerBand)
        const slot = index % moonsPerBand
        const baseRadiusMultiplier = planet.planet === 'Earth' ? 3.3 : planet.planet === 'Mars' ? 1.85 : isGasGiant ? 1.68 : isIceGiant ? 1.82 : 1.6
        const bandStepMultiplier = isGasGiant ? 0.078 : isIceGiant ? 0.11 : 0.22
        const slotStepMultiplier = isGasGiant ? 0.004 : isIceGiant ? 0.01 : 0.045
        const radius = planetSize * (baseRadiusMultiplier + band * bandStepMultiplier + slot * slotStepMultiplier)
        const angularVelocity = (isGasGiant ? 1.9 : isIceGiant ? 1.5 : planet.planet === 'Earth' ? 1.15 : 1.45) / Math.max(radius / planetSize, 1.2)
        const moonSizeScale = isGasGiant ? 0.0032 : isIceGiant ? 0.0044 : planet.planet === 'Earth' ? 0.0135 : 0.009

        return {
          phase: (index / Math.max(1, planet.moonCount)) * Math.PI * 2,
          radius,
          angularVelocity,
          inclination: ((index % 9) - 4) * planetSize * (isGasGiant ? 0.015 : isIceGiant ? 0.018 : 0.022),
          yOffset: ((index % 5) - 2) * planetSize * (isGasGiant ? 0.004 : 0.006),
          size: Math.max(planetSize * moonSizeScale, isGasGiant ? 0.00008 : isIceGiant ? 0.0001 : 0.00014),
        }
      }),
    [isGasGiant, isIceGiant, planet, planetSize],
  )

  useFrame((state) => {
    if (!groupRef.current) return
    groupRef.current.children.forEach((child, index) => {
      const moon = moons[index]
      const orbitAngle = ((state.clock.getElapsedTime() % SCREEN_ORBIT_SECONDS) / SCREEN_ORBIT_SECONDS) * Math.PI * 2 * moon.angularVelocity
      const angle = orbitAngle + moon.phase
      child.position.set(
        Math.cos(angle) * moon.radius,
        moon.yOffset + Math.sin(angle * 0.65) * moon.inclination,
        Math.sin(angle) * moon.radius,
      )
    })
  })

  if (planet.moonCount === 0 || !planet.moon) return null

  return (
    <group ref={groupRef}>
      {moons.map((moon, index) => (
        <mesh key={index}>
          <sphereGeometry args={[moon.size, 10, 10]} />
          <meshStandardMaterial color={planet.moon} emissive={planet.moon} emissiveIntensity={0.08} roughness={0.58} metalness={0.01} />
        </mesh>
      ))}
    </group>
  )
}

function PlanetBody({
  planet,
  index,
  activeIndex,
  selectedIndex,
  showOrbit,
  onSelectPlanet,
}: {
  planet: SubsystemPlanet
  index: number
  activeIndex: number | null
  selectedIndex: number | null
  showOrbit: boolean
  onSelectPlanet: (index: number) => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const bandRef = useRef<THREE.Mesh>(null)
  const cloudRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const active = activeIndex !== null && index === activeIndex
  const selected = index === selectedIndex
  const planetSize = getPlanetVisualSize(planet)

  useFrame((state) => {
    const position = getOrbitalPosition(planet, getSimulationDays(planet.siderealDays, state.clock.getElapsedTime()))
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
  })

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    onSelectPlanet(index)
  }

  return (
    <>
      {showOrbit ? <OrbitPath planet={planet} active={active || selected} /> : null}
      <group ref={groupRef} onPointerDown={handleClick}>
        <mesh ref={bandRef} scale={[1.02, 1.02, 1.02]}>
          <sphereGeometry args={[planetSize * 1.01, 48, 48]} />
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
            <sphereGeometry args={[planetSize, 48, 48]} />
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
          <sphereGeometry args={[planetSize, 56, 56]} />
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
            <mesh position={[0, planetSize * 0.82, 0]} scale={[0.78, 0.2, 0.78]}>
              <sphereGeometry args={[planetSize * 0.34, 24, 24]} />
              <meshStandardMaterial color={planet.poles} emissive={planet.poles} emissiveIntensity={0.1} />
            </mesh>
            <mesh position={[0, -planetSize * 0.82, 0]} scale={[0.78, 0.2, 0.78]}>
              <sphereGeometry args={[planetSize * 0.34, 24, 24]} />
              <meshStandardMaterial color={planet.poles} emissive={planet.poles} emissiveIntensity={0.08} />
            </mesh>
          </>
        ) : null}
        {planet.rings ? (
          <mesh ref={ringRef}>
            <torusGeometry args={[planetSize * 1.72, planetSize * 0.12, 20, 140]} />
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
        <MoonSystem planet={planet} />
      </group>
    </>
  )
}

function SolarCore({
  activeIndex,
  selectedIndex,
  onSelectPlanet,
}: {
  activeIndex: number | null
  selectedIndex: number | null
  onSelectPlanet: (index: number) => void
}) {
  const sunRef = useRef<THREE.Mesh>(null)
  const sunDiameter = getSunVisualDiameter()
  const sunRadius = sunDiameter / 2

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (sunRef.current) {
      const pulse = 1 + Math.sin(t * 1.4) * 0.03
      sunRef.current.scale.setScalar(pulse)
      sunRef.current.rotation.y = t * 0.22
    }
  })

  return (
    <group>
      {selectedIndex === null ? (
        <>
          <mesh ref={sunRef} position={SUN_POSITION}>
            <sphereGeometry args={[sunRadius, 64, 64]} />
            <meshStandardMaterial color="#ffd07e" emissive="#ff8f3a" emissiveIntensity={2.4} roughness={0.16} metalness={0.02} />
          </mesh>
          <mesh position={SUN_POSITION} scale={0.52}>
            <sphereGeometry args={[sunRadius, 48, 48]} />
            <meshBasicMaterial color="#fff7cf" transparent opacity={0.22} />
          </mesh>
        </>
      ) : null}
      <ISSOrbit />
      {PLANETS.map((planet, index) => (
        <PlanetBody
          key={planet.planet}
          planet={planet}
          index={index}
          activeIndex={activeIndex}
          selectedIndex={selectedIndex}
          showOrbit={selectedIndex === null}
          onSelectPlanet={onSelectPlanet}
        />
      ))}
      {selectedIndex === null ? (
        <>
          <AsteroidBelt />
          <TrojanFields />
        </>
      ) : null}
    </group>
  )
}

export function HeroScene({ activeIndex, selectedIndex, onSelectPlanet, onClearSelection }: HeroSceneProps) {
  return (
    <Canvas className="hero-canvas" camera={{ position: DEFAULT_CAMERA_POSITION.toArray() as [number, number, number], fov: 34 }} onPointerMissed={onClearSelection}>
      <color attach="background" args={['#08111d']} />
      <fog attach="fog" args={['#08111d', 20, 64]} />
      <ambientLight intensity={0.34} />
      <pointLight position={[0, 0, 0]} intensity={125} color="#ffb84d" />
      <pointLight position={[8, 5, 7]} intensity={26} color="#76dcff" />
      <pointLight position={[-8, -4, 8]} intensity={12} color="#6ca7ff" />
      <spotLight position={[0, 12, 10]} angle={0.42} penumbra={1} intensity={26} color="#ffffff" />
      <Stars radius={160} depth={110} count={16000} factor={6.6} saturation={0.08} fade speed={0.42} />
      <DeepField />
      <Comets />
      <Suspense fallback={null}>
        <SolarCore activeIndex={activeIndex} selectedIndex={selectedIndex} onSelectPlanet={onSelectPlanet} />
      </Suspense>
      <CameraRig selectedIndex={selectedIndex} />
    </Canvas>
  )
}
