
import { Canvas, useFrame } from '@react-three/fiber'
import { Html, Line, OrbitControls, Stars } from '@react-three/drei'
import { Suspense, useMemo, useRef } from 'react'
import * as THREE from 'three'

type HeroSceneProps = { activeIndex: number }

const NODE_LABELS = [
  { label: 'Safety', position: [3.8, 1.3, 0.5] as [number, number, number] },
  { label: 'Robustness', position: [-3.6, 1.4, -0.3] as [number, number, number] },
  { label: 'Hallucination', position: [0.3, 3.2, -0.5] as [number, number, number] },
  { label: 'Bias', position: [0.6, -3.1, 0.4] as [number, number, number] },
  { label: 'Privacy', position: [-2.9, -1.8, 0.9] as [number, number, number] },
  { label: 'Monitoring', position: [2.6, -2.2, -0.8] as [number, number, number] },
]

function TrustCore({ activeIndex }: { activeIndex: number }) {
  const groupRef = useRef<THREE.Group>(null)
  const coreRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Group>(null)
  const nodePositions = useMemo(() => NODE_LABELS.map((node) => new THREE.Vector3(...node.position)), [])

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    const pointerX = state.pointer.x * 0.35
    const pointerY = state.pointer.y * 0.22
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.16 + pointerX
      groupRef.current.rotation.x = pointerY
    }
    if (coreRef.current) coreRef.current.scale.setScalar(1 + Math.sin(t * 1.5) * 0.03)
    if (ringRef.current) {
      ringRef.current.rotation.z = -t * 0.24
      ringRef.current.rotation.y = t * 0.12
    }
  })

  return (
    <group ref={groupRef}>
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[1.4, 1]} />
        <meshStandardMaterial color={activeIndex % 2 === 0 ? '#6ee7f9' : '#8b5cf6'} emissive="#102235" metalness={0.55} roughness={0.12} />
      </mesh>
      <group ref={ringRef}>
        {[0, 1, 2].map((ring) => (
          <mesh key={ring} rotation={[ring * 0.7, ring * 0.8, ring * 0.35]}>
            <torusGeometry args={[2.2 + ring * 0.4, 0.03, 16, 120]} />
            <meshStandardMaterial color={ring === activeIndex % 3 ? '#7dd3fc' : '#2a4762'} emissive="#0d1b2a" />
          </mesh>
        ))}
      </group>
      {NODE_LABELS.map((node, index) => (
        <group key={node.label} position={node.position}>
          <mesh scale={index === activeIndex ? 0.32 : 0.24}>
            <sphereGeometry args={[1, 24, 24]} />
            <meshStandardMaterial color={index === activeIndex ? '#f8fafc' : '#7dd3fc'} emissive={index === activeIndex ? '#1d4ed8' : '#0f172a'} metalness={0.2} roughness={0.18} />
          </mesh>
          <Html distanceFactor={7} center>
            <div className={`scene-label ${index === activeIndex ? 'scene-label--active' : ''}`}>{node.label}</div>
          </Html>
        </group>
      ))}
      {nodePositions.map((pos, index) => (
        <Line key={`${index}-${NODE_LABELS[index].label}`} points={[[0, 0, 0], pos.toArray()]} color={index === activeIndex ? '#93c5fd' : '#27445e'} lineWidth={index === activeIndex ? 1.6 : 1.0} transparent opacity={index === activeIndex ? 0.95 : 0.45} />
      ))}
    </group>
  )
}

export function HeroScene({ activeIndex }: HeroSceneProps) {
  return (
    <Canvas className="hero-canvas" dpr={[1, 1.5]} camera={{ position: [0, 0, 9], fov: 35 }}>
      <color attach="background" args={['#020611']} />
      <fog attach="fog" args={['#020611', 6, 16]} />
      <ambientLight intensity={0.55} />
      <pointLight position={[4, 4, 6]} intensity={40} color="#7dd3fc" />
      <pointLight position={[-5, -2, 3]} intensity={18} color="#8b5cf6" />
      <Stars radius={65} depth={28} count={2200} factor={3.6} saturation={0.1} fade speed={0.8} />
      <Suspense fallback={null}><TrustCore activeIndex={activeIndex} /></Suspense>
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.42} />
    </Canvas>
  )
}
