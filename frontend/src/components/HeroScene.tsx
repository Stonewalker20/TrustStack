import { Canvas, type ThreeEvent, useFrame, useThree } from '@react-three/fiber'
import { Line, OrbitControls, Sparkles, Stars, useTexture } from '@react-three/drei'
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
  axialTiltDeg: number
  color: string
  emissive: string
  band: string
  halo: string
  atmosphereColor?: string
  atmosphereOpacity?: number
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
    axialTiltDeg: 0.03,
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
    axialTiltDeg: 177.4,
    color: '#dcb77c',
    emissive: '#6f4d21',
    band: '#fff0cc',
    halo: '#ffd99f',
    atmosphereColor: '#f9d7a0',
    atmosphereOpacity: 0.22,
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
    axialTiltDeg: 23.44,
    color: '#3f7eff',
    emissive: '#173f77',
    band: '#6ed27f',
    halo: '#7fb3ff',
    atmosphereColor: '#8ec5ff',
    atmosphereOpacity: 0.18,
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
    axialTiltDeg: 25.19,
    color: '#c96846',
    emissive: '#6d2719',
    band: '#e9b097',
    halo: '#f3a07e',
    atmosphereColor: '#e3a28d',
    atmosphereOpacity: 0.1,
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
    axialTiltDeg: 3.13,
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
    axialTiltDeg: 26.73,
    color: '#d5bf86',
    emissive: '#5b4721',
    band: '#fef1c4',
    halo: '#f0d7a0',
    atmosphereColor: '#edd5a2',
    atmosphereOpacity: 0.1,
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
    axialTiltDeg: 97.77,
    color: '#9fd7df',
    emissive: '#235b66',
    band: '#c7eef4',
    halo: '#b8edf4',
    atmosphereColor: '#ccfbff',
    atmosphereOpacity: 0.12,
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
    axialTiltDeg: 28.32,
    color: '#456de6',
    emissive: '#17377e',
    band: '#8db2ff',
    halo: '#6b93ff',
    atmosphereColor: '#8ab4ff',
    atmosphereOpacity: 0.12,
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
    axialTiltDeg: 119.61,
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

function latLonToVector3(radius: number, latitudeDeg: number, longitudeDeg: number) {
  const latitude = toRadians(latitudeDeg)
  const longitude = toRadians(longitudeDeg)
  const cosLatitude = Math.cos(latitude)

  return new THREE.Vector3(
    radius * cosLatitude * Math.cos(longitude),
    radius * Math.sin(latitude),
    radius * cosLatitude * Math.sin(longitude),
  )
}

function getPlanetTexturePath(planet: string) {
  switch (planet) {
    case 'Mercury':
      return '/textures/mercury.jpg'
    case 'Venus':
      return '/textures/venus_surface.jpg'
    case 'Earth':
      return '/textures/earth_day.jpg'
    case 'Mars':
      return '/textures/mars.jpg'
    case 'Jupiter':
      return '/textures/jupiter.jpg'
    case 'Saturn':
      return '/textures/saturn.jpg'
    case 'Uranus':
      return '/textures/uranus.jpg'
    case 'Neptune':
      return '/textures/neptune.jpg'
    case 'Pluto':
      return '/textures/pluto.jpg'
    default:
      return '/textures/earth_day.jpg'
  }
}

function getPlanetCloudTexturePath(planet: string) {
  switch (planet) {
    case 'Venus':
      return '/textures/venus_atmosphere.jpg'
    case 'Earth':
      return '/textures/earth_clouds.jpg'
    case 'Jupiter':
      return '/textures/jupiter.jpg'
    case 'Saturn':
      return '/textures/saturn.jpg'
    case 'Uranus':
      return '/textures/uranus.jpg'
    case 'Neptune':
      return '/textures/neptune.jpg'
    default:
      return getPlanetTexturePath(planet)
  }
}

function configureColorTexture(texture: THREE.Texture) {
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.needsUpdate = true
}

function configureAlphaTexture(texture: THREE.Texture) {
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.needsUpdate = true
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
  const milkyWayTexture = useTexture('/textures/milky_way.jpg')
  useMemo(() => {
    configureColorTexture(milkyWayTexture)
  }, [milkyWayTexture])
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
  const upperStars = useMemo<StellarBody[]>(
    () =>
      Array.from({ length: 180 }, () => ({
        distance: [
          (Math.random() - 0.5) * 210,
          12 + Math.random() * 64,
          -70 - Math.random() * 70,
        ],
        diameterRatioSun: 0.08 + Math.random() * 3.4,
        color: ['#f8fafc', '#e0f2fe', '#dbeafe', '#fef3c7'][Math.floor(Math.random() * 4)],
      })),
    [],
  )

  return (
    <group>
      <mesh>
        <sphereGeometry args={[190, 64, 64]} />
        <meshBasicMaterial map={milkyWayTexture} side={THREE.BackSide} transparent opacity={0.32} />
      </mesh>
      <mesh position={[0, 2.8, -26]} rotation={[0, 0, -0.18]} scale={[128, 24, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#f3f8ff" transparent opacity={0.08} />
      </mesh>
      <mesh position={[0, 2.2, -24]} rotation={[0, 0, -0.18]} scale={[136, 10, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#fff4c2" transparent opacity={0.08} />
      </mesh>
      <mesh position={[0, 20, -32]} rotation={[0, 0, -0.08]} scale={[144, 34, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#dbeafe" transparent opacity={0.05} />
      </mesh>
      {galaxies.map((galaxy, index) => (
        <mesh key={index} position={galaxy.position} rotation={[0, 0, galaxy.rotation]} scale={galaxy.scale}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color={galaxy.color} transparent opacity={0.14} />
        </mesh>
      ))}
      {stars.map((star, index) => (
        <mesh key={index} position={star.distance}>
          <sphereGeometry args={[(sunVisualDiameter * star.diameterRatioSun) / 2, 10, 10]} />
          <meshBasicMaterial color={star.color} transparent opacity={0.85} />
        </mesh>
      ))}
      {upperStars.map((star, index) => (
        <mesh key={`upper-${index}`} position={star.distance}>
          <sphereGeometry args={[(sunVisualDiameter * star.diameterRatioSun) / 2, 10, 10]} />
          <meshBasicMaterial color={star.color} transparent opacity={0.94} />
        </mesh>
      ))}
      <Sparkles count={180} scale={[84, 34, 26]} size={3.2} speed={0.16} opacity={0.58} color="#f8fbff" />
      <Sparkles count={220} scale={[118, 42, 28]} position={[0, 18, -18]} size={2.6} speed={0.12} opacity={0.46} color="#eaf4ff" />
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

function KuiperBelt() {
  const groupRef = useRef<THREE.Group>(null)
  const bodies = useMemo(
    () =>
      Array.from({ length: 360 }, (_, index) => {
        const semimajorAxisAu = 30.5 + Math.random() * 19.5
        const eccentricity = 0.03 + Math.random() * 0.18
        const inclinationDeg = Math.random() * 22
        const ascendingNodeDeg = Math.random() * 360
        const longitudeOfPerihelionDeg = Math.random() * 360
        const meanLongitudeDeg = (index / 360) * 360 + (Math.random() - 0.5) * 20
        const bodyDiameterKm = 20 + Math.random() * 1800
        const bodyDiameter = getEarthDiameterScaled(bodyDiameterKm)
        return {
          orbit: {
            siderealDays: 65000 + semimajorAxisAu * 900,
            semimajorAxisAu,
            eccentricity,
            inclinationDeg,
            ascendingNodeDeg,
            longitudeOfPerihelionDeg,
            meanLongitudeDeg,
          },
          rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI] as [number, number, number],
          scale: [bodyDiameter * 0.72, bodyDiameter * 0.5, bodyDiameter * 0.62] as [number, number, number],
          color: ['#6f7681', '#8c7a67', '#9e9fb0', '#7f8897'][Math.floor(Math.random() * 4)],
        }
      }),
    [],
  )

  useFrame((state) => {
    if (!groupRef.current) return
    groupRef.current.children.forEach((child, index) => {
      const body = bodies[index]
      const position = getOrbitalPosition(
        body.orbit as OrbitalBody,
        getSimulationDays(body.orbit.siderealDays, state.clock.getElapsedTime()),
      )
      child.position.copy(position)
    })
  })

  return (
    <group ref={groupRef}>
      {bodies.map((body, index) => (
        <mesh key={index} rotation={body.rotation} scale={body.scale}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={body.color} emissive="#101216" roughness={0.96} metalness={0.02} />
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
  const defaultViewDirection = useMemo(() => DEFAULT_CAMERA_POSITION.clone().sub(DEFAULT_CAMERA_TARGET).normalize(), [])

  useFrame((state) => {
    if (selectedIndex === null) {
      targetPosition.current.copy(DEFAULT_CAMERA_POSITION)
      targetLookAt.current.copy(DEFAULT_CAMERA_TARGET)
    } else {
      const planet = PLANETS[selectedIndex]
      const planetSize = getPlanetVisualSize(planet)
      const position = getOrbitalPosition(planet, getSimulationDays(planet.siderealDays, state.clock.getElapsedTime()))
      const fovRadians = (((camera as THREE.PerspectiveCamera).fov ?? 34) * Math.PI) / 180
      const focusDistance = Math.max(
        planetSize / (focusCoverage * Math.tan(fovRadians / 2)),
        planetSize * 6.8,
        0.08,
      )
      const antiSunDirection = position
        .clone()
        .sub(SUN_POSITION)
        .normalize()
      const focusDirection = antiSunDirection.multiplyScalar(0.78).add(defaultViewDirection.clone().multiplyScalar(0.22)).normalize()
      const offset = focusDirection.multiplyScalar(focusDistance).add(new THREE.Vector3(0, planetSize * 0.06, 0))

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
  const moonTexture = useTexture('/textures/moon.jpg')
  const planetSize = getPlanetVisualSize(planet)
  const isGasGiant = planet.planet === 'Jupiter' || planet.planet === 'Saturn'
  const isIceGiant = planet.planet === 'Uranus' || planet.planet === 'Neptune'
  useMemo(() => {
    configureColorTexture(moonTexture)
  }, [moonTexture])
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
          <meshStandardMaterial
            color="#ffffff"
            map={moonTexture}
            emissive={planet.moon}
            emissiveIntensity={0.03}
            roughness={0.72}
            metalness={0.01}
          />
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
  const tiltRef = useRef<THREE.Group>(null)
  const spinRef = useRef<THREE.Group>(null)
  const bandRef = useRef<THREE.Mesh>(null)
  const cloudRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const haloRef = useRef<THREE.Mesh>(null)
  const atmosphereRef = useRef<THREE.Mesh>(null)
  const active = activeIndex !== null && index === activeIndex
  const selected = index === selectedIndex
  const planetSize = getPlanetVisualSize(planet)
  const baseTexture = useTexture(getPlanetTexturePath(planet.planet))
  const cloudTexture = useTexture(getPlanetCloudTexturePath(planet.planet))
  const ringTexture = useTexture('/textures/saturn_ring.png')
  const hasBandOverlay = planet.planet === 'Jupiter' || planet.planet === 'Saturn'
  const hasTexturedClouds = ['Venus', 'Earth', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'].includes(planet.planet)
  useMemo(() => {
    configureColorTexture(baseTexture)
    configureColorTexture(cloudTexture)
    configureAlphaTexture(ringTexture)
  }, [baseTexture, cloudTexture, ringTexture])
  const earthLandMasses = useMemo(
    () => [],
    [],
  )

  useFrame((state) => {
    const position = getOrbitalPosition(planet, getSimulationDays(planet.siderealDays, state.clock.getElapsedTime()))
    const t = state.clock.getElapsedTime()

    if (groupRef.current) {
      groupRef.current.position.copy(position)
      groupRef.current.scale.setScalar(selected ? 1.2 : active ? 1.12 : 1)
    }

    if (tiltRef.current) {
      tiltRef.current.rotation.z = toRadians(planet.axialTiltDeg)
    }

    if (spinRef.current) {
      spinRef.current.rotation.y = t * 0.35
    }

    if (bandRef.current) {
      bandRef.current.rotation.y = t * 0.34
    }

    if (cloudRef.current) {
      cloudRef.current.rotation.y = -t * 0.22
    }

    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y = t * 0.08
    }

    if (haloRef.current) {
      haloRef.current.rotation.y = -t * 0.08
      haloRef.current.scale.setScalar(selected ? 1.04 : active ? 1.03 : 1.02)
    }

    if (ringRef.current) {
      ringRef.current.rotation.set(Math.PI / 2, t * 0.1, 0)
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
        <group ref={tiltRef}>
          <mesh ref={haloRef} scale={[1.028, 1.028, 1.028]}>
            <sphereGeometry args={[planetSize, 40, 40]} />
            <meshBasicMaterial color={planet.halo} transparent opacity={planet.planet === 'Earth' ? 0.15 : 0.08} />
          </mesh>
          {planet.atmosphereColor ? (
            <mesh ref={atmosphereRef} scale={[1.06, 1.06, 1.06]}>
              <sphereGeometry args={[planetSize, 40, 40]} />
              <meshStandardMaterial
                color={planet.atmosphereColor}
                emissive={planet.atmosphereColor}
                emissiveIntensity={0.12}
                transparent
                opacity={planet.atmosphereOpacity ?? 0.12}
                roughness={0.46}
                metalness={0.01}
              />
            </mesh>
          ) : null}
          <group ref={spinRef}>
            {hasBandOverlay ? (
              <mesh ref={bandRef} scale={[1.02, 1.02, 1.02]}>
                <sphereGeometry args={[planetSize * 1.01, 48, 48]} />
                <meshStandardMaterial
                  color="#ffffff"
                  map={cloudTexture}
                  emissive={planet.band}
                  emissiveIntensity={selected ? 0.24 : 0.1}
                  transparent
                  opacity={0.16}
                  roughness={0.44}
                  metalness={0.02}
                />
              </mesh>
            ) : null}
            {hasTexturedClouds ? (
              <mesh ref={cloudRef} scale={[1.035, 1.035, 1.035]} castShadow receiveShadow>
                <sphereGeometry args={[planetSize, 48, 48]} />
                <meshStandardMaterial
                  color="#ffffff"
                  map={cloudTexture}
                  alphaMap={planet.planet === 'Earth' ? cloudTexture : undefined}
                  emissive={planet.cloud ?? '#ffffff'}
                  emissiveIntensity={planet.planet === 'Earth' ? 0.02 : 0.05}
                  transparent
                  opacity={planet.planet === 'Venus' ? 0.55 : planet.planet === 'Earth' ? 0.36 : 0.1}
                  roughness={0.48}
                  metalness={0.01}
                />
              </mesh>
            ) : null}
            <mesh castShadow receiveShadow>
              <sphereGeometry args={[planetSize, 56, 56]} />
              <meshStandardMaterial
                color="#ffffff"
                map={baseTexture}
                emissive={planet.emissive}
                emissiveIntensity={selected ? 0.42 : active ? 0.26 : 0.16}
                roughness={planet.planet === 'Mercury' || planet.planet === 'Mars' || planet.planet === 'Pluto' ? 0.8 : 0.54}
                metalness={planet.planet === 'Mercury' ? 0.12 : 0.04}
              />
            </mesh>
            {earthLandMasses.map((landMass, landIndex) => {
              const position = latLonToVector3(planetSize * 1.006, landMass.lat, landMass.lon)
              return (
                <mesh key={landIndex} position={position} scale={landMass.scale} castShadow receiveShadow>
                  <sphereGeometry args={[planetSize * 0.32, 18, 18]} />
                  <meshStandardMaterial
                    color={landMass.color}
                    emissive={landMass.color}
                    emissiveIntensity={0.09}
                    roughness={0.72}
                    metalness={0.01}
                  />
                </mesh>
              )
            })}
            {planet.poles ? (
              <>
                <mesh position={[0, planetSize * 0.82, 0]} scale={[0.78, 0.2, 0.78]} castShadow receiveShadow>
                  <sphereGeometry args={[planetSize * 0.34, 24, 24]} />
                  <meshStandardMaterial color={planet.poles} emissive={planet.poles} emissiveIntensity={0.1} />
                </mesh>
                <mesh position={[0, -planetSize * 0.82, 0]} scale={[0.78, 0.2, 0.78]} castShadow receiveShadow>
                  <sphereGeometry args={[planetSize * 0.34, 24, 24]} />
                  <meshStandardMaterial color={planet.poles} emissive={planet.poles} emissiveIntensity={0.08} />
                </mesh>
              </>
            ) : null}
          </group>
          {planet.rings ? (
            <mesh ref={ringRef} receiveShadow>
              <ringGeometry args={[planetSize * 1.38, planetSize * 2.08, 160]} />
              <meshStandardMaterial
                color="#d8c093"
                map={ringTexture}
                alphaMap={ringTexture}
                emissive={planet.rings}
                emissiveIntensity={selected ? 0.18 : 0.08}
                transparent
                opacity={0.9}
                side={THREE.DoubleSide}
                roughness={0.68}
                metalness={0.04}
              />
            </mesh>
          ) : null}
          <MoonSystem planet={planet} />
        </group>
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
  const sunTexture = useTexture('/textures/sun.jpg')
  const sunDiameter = getSunVisualDiameter()
  const sunRadius = sunDiameter / 2
  useMemo(() => {
    configureColorTexture(sunTexture)
  }, [sunTexture])

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
            <meshStandardMaterial
              color="#ffffff"
              map={sunTexture}
              emissive="#ff8f3a"
              emissiveIntensity={1.8}
              roughness={0.16}
              metalness={0.02}
            />
          </mesh>
          <mesh position={SUN_POSITION} scale={0.52}>
            <sphereGeometry args={[sunRadius, 48, 48]} />
            <meshBasicMaterial color="#fff7cf" transparent opacity={0.22} />
          </mesh>
          <mesh position={SUN_POSITION} scale={0.72}>
            <sphereGeometry args={[sunRadius, 40, 40]} />
            <meshBasicMaterial color="#ffcf7a" transparent opacity={0.11} />
          </mesh>
          <mesh position={SUN_POSITION} scale={0.92}>
            <sphereGeometry args={[sunRadius, 32, 32]} />
            <meshBasicMaterial color="#ff9c45" transparent opacity={0.06} />
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
          <KuiperBelt />
        </>
      ) : null}
    </group>
  )
}

export function HeroScene({ activeIndex, selectedIndex, onSelectPlanet, onClearSelection }: HeroSceneProps) {
  return (
    <Canvas
      className="hero-canvas"
      shadows
      gl={{ antialias: true }}
      dpr={[1, 1.35]}
      camera={{ position: DEFAULT_CAMERA_POSITION.toArray() as [number, number, number], fov: 34, near: 0.001, far: 500 }}
      onPointerMissed={onClearSelection}
    >
      <color attach="background" args={['#102033']} />
      <fog attach="fog" args={['#102033', 20, 68]} />
      <ambientLight intensity={0.22} />
      <pointLight
        position={[0, 0, 0]}
        intensity={135}
        color="#ffb84d"
        castShadow
        shadow-bias={-0.00008}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[8, 5, 7]} intensity={26} color="#76dcff" />
      <pointLight position={[-8, -4, 8]} intensity={12} color="#6ca7ff" />
      <spotLight position={[0, 12, 10]} angle={0.42} penumbra={1} intensity={26} color="#ffffff" />
      <Stars radius={170} depth={120} count={14000} factor={6.4} saturation={0.1} fade speed={0.42} />
      <DeepField />
      <Comets />
      <Suspense fallback={null}>
        <SolarCore activeIndex={activeIndex} selectedIndex={selectedIndex} onSelectPlanet={onSelectPlanet} />
      </Suspense>
      <CameraRig selectedIndex={selectedIndex} />
    </Canvas>
  )
}
