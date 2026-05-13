'use client';

/**
 * HeroScene — React Three Fiber canvas for the Strait of Hormuz dashboard.
 *
 * Scene coordinate system:
 *   x = (lon - 56.3) * SCALE   (east = +x)
 *   z = -(lat - 26.5) * SCALE  (north = -z, so Iran land is at z < 0)
 *   y = elevation (0 = sea level)
 *
 * Key geography:
 *   Iran coast   lat ≈ 27.0–28°N  → z ≈ -0.9 to -2.7
 *   Oman coast   lat ≈ 24.5–26°N  → z ≈ +0.9 to +3.6
 *   Strait centre                  → x ≈ 0, z ≈ 0
 */

import { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { gsap } from 'gsap';
import type { StatusData } from '@/app/lib/types';

// ── constants ────────────────────────────────────────────────
const SCALE = 1.6;
const CENTER = { lat: 26.5, lon: 56.3 };

function toScene(lon: number, lat: number, y = 0): THREE.Vector3 {
  return new THREE.Vector3(
    (lon - CENTER.lon) * SCALE,
    y,
    -(lat - CENTER.lat) * SCALE,
  );
}

// Shipping lane waypoints [lon, lat] — eastbound enters Gulf of Oman, westbound exits
const LANE_IN_WP: [number, number][] = [
  [59.0, 24.2], [58.0, 25.0], [57.2, 25.6], [56.5, 26.1],
  [56.0, 26.3], [55.2, 26.3], [54.0, 26.1], [52.5, 25.8],
];
const LANE_OUT_WP: [number, number][] = LANE_IN_WP.map(([lon, lat]): [number, number] => [lon, lat + 0.28]).reverse();

function buildCurve(wps: [number, number][]): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(wps.map(([lon, lat]) => toScene(lon, lat, 0.06)), false, 'catmullrom', 0.5);
}

// Status → colour
const STATUS_COLOR: Record<string, string> = {
  OPEN: '#10B981',
  PARTIALLY_CLOSED: '#F59E0B',
  CLOSED: '#EF4444',
};

// ── sub-components ────────────────────────────────────────────

function CameraIntro() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(2, 18, 14);
    (camera as THREE.PerspectiveCamera).fov = 50;
    camera.updateProjectionMatrix();
    camera.lookAt(0, 0, 0);
    gsap.to(camera.position, {
      x: 1, y: 9, z: 7,
      duration: 3,
      ease: 'power3.out',
      onUpdate: () => camera.lookAt(0, 0, 0),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function OceanPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
      <planeGeometry args={[40, 28, 1, 1]} />
      <meshStandardMaterial
        color="#0a2a45"
        emissive="#051828"
        emissiveIntensity={0.55}
        metalness={0.6}
        roughness={0.45}
        envMapIntensity={0.8}
      />
    </mesh>
  );
}

function TacticalGrid() {
  const geo = useMemo(() => new THREE.PlaneGeometry(40, 28, 40, 28), []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
      <primitive object={geo} />
      <meshBasicMaterial color="#06B6D4" wireframe transparent opacity={0.028} />
    </mesh>
  );
}

function LandMass({
  position, args, color = '#1e2a3a', rotation,
}: {
  position: [number, number, number];
  args: [number, number, number];
  color?: string;
  rotation?: [number, number, number];
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} roughness={0.88} metalness={0.05} />
    </mesh>
  );
}

function ShippingLane({ curve, color }: { curve: THREE.CatmullRomCurve3; color: string }) {
  const geo = useMemo(() => new THREE.TubeGeometry(curve, 80, 0.025, 6, false), [curve]);
  return (
    <mesh>
      <primitive object={geo} />
      <meshBasicMaterial color={color} transparent opacity={0.55} />
    </mesh>
  );
}

function LaneParticles({
  curve, color, count = 10, speed, phase = 0,
}: {
  curve: THREE.CatmullRomCurve3;
  color: string;
  count?: number;
  speed: number;
  phase?: number;
}) {
  const refs = useRef<THREE.Mesh[]>([]);
  const offsets = useMemo(
    () => Array.from({ length: count }, (_, i) => i / count),
    [count],
  );
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    offsets.forEach((offset, i) => {
      const u = ((t * speed + offset + phase) % 1 + 1) % 1;
      const pos = curve.getPoint(u);
      refs.current[i]?.position.copy(pos);
    });
  });
  return (
    <>
      {offsets.map((_, i) => (
        <mesh key={i} ref={(el) => { if (el) refs.current[i] = el; }}>
          <sphereGeometry args={[0.045, 6, 6]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
    </>
  );
}

function StatusOrb({ status }: { status: StatusData }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const color = STATUS_COLOR[status.state] ?? '#10B981';
  const tIdx = status.tensionIndex ?? 20;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.scale.setScalar(1 + Math.sin(t * 1.6) * 0.06);
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.4;
    }
  });

  const pulseColor = new THREE.Color(color);

  return (
    <group position={toScene(56.3, 26.5, 1.6).toArray() as [number, number, number]}>
      {/* Glow halo */}
      <mesh>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshBasicMaterial color={pulseColor} transparent opacity={0.06} />
      </mesh>
      {/* Core orb */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          roughness={0.2}
          metalness={0.3}
        />
      </mesh>
      {/* Orbit ring */}
      <mesh ref={ringRef}>
        <torusGeometry args={[0.48, 0.018, 12, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </mesh>
      {/* Tension arc — a partial torus based on tensionIndex */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.68, 0.008, 8, Math.max(3, Math.round((tIdx / 100) * 64)), (tIdx / 100) * Math.PI * 2]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

type AisVessel = { mmsi: number; lat: number; lon: number; type: string; heading: number | null };

const TYPE_COLOR: Record<string, string> = {
  Tanker: '#F59E0B', Cargo: '#38BDF8', Passenger: '#67E8F9',
  Fishing: '#A78BFA', Military: '#F97316', Pilot: '#10B981',
  Tug: '#10B981', Unknown: '#6B7787',
};

function VesselDots({ vessels }: { vessels: AisVessel[] }) {
  return (
    <>
      {vessels.map((v) => {
        const pos = toScene(v.lon, v.lat, 0.12);
        const color = TYPE_COLOR[v.type] ?? '#6B7787';
        return (
          <group key={v.mmsi} position={pos.toArray() as [number, number, number]}>
            {/* Glow */}
            <mesh>
              <sphereGeometry args={[0.09, 8, 8]} />
              <meshBasicMaterial color={color} transparent opacity={0.18} />
            </mesh>
            {/* Dot */}
            <mesh>
              <sphereGeometry args={[0.045, 8, 8]} />
              <meshBasicMaterial color={color} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

function SceneContents({ status, vessels }: { status: StatusData; vessels: AisVessel[] }) {
  const curveIn  = useMemo(() => buildCurve(LANE_IN_WP),  []);
  const curveOut = useMemo(() => buildCurve(LANE_OUT_WP), []);

  return (
    <>
      <CameraIntro />

      {/* Lighting */}
      <ambientLight intensity={0.35} />
      <directionalLight position={[8, 12, 4]}  intensity={0.85} color="#5a7bff" castShadow />
      <directionalLight position={[-8, 6, -4]} intensity={0.45} color="#06B6D4" />
      <pointLight position={[0, 4, 0]}   intensity={0.9} color="#0ea5e9" distance={28} />
      <pointLight position={[0, 0.5, 0]} intensity={0.5} color="#0d4f8c" distance={18} />

      {/* Stars backdrop */}
      <Stars radius={90} depth={40} count={1800} factor={2.5} fade speed={0.4} />

      {/* Atmosphere fog */}
      <fog attach="fog" args={['#07090F', 22, 55]} />

      {/* Ocean + grid */}
      <OceanPlane />
      <TacticalGrid />

      {/* Land masses */}
      {/* Iran — north */}
      <LandMass position={[0, 0.12, -2.8]}  args={[14, 0.24, 3.2]}   color="#1a2535" />
      <LandMass position={[3.5, 0.15, -1.4]} args={[4.5, 0.3, 1.2]}  color="#1c2a38" />
      {/* UAE / Oman — south */}
      <LandMass position={[0, 0.12, 2.8]}   args={[14, 0.24, 3.0]}   color="#1a2535" />
      <LandMass position={[-0.5, 0.16, 1.4]} args={[5, 0.32, 1.4]}   color="#1c2a38" />
      {/* Musandam peninsula tip — the narrow strait's southern shore */}
      <LandMass position={[0.6, 0.18, 0.55]} args={[1.8, 0.36, 0.9]} color="#1e2d3d" />

      {/* Shipping lanes */}
      <ShippingLane curve={curveIn}  color="#06B6D4" />
      <ShippingLane curve={curveOut} color="#F59E0B" />

      {/* Animated lane particles */}
      <LaneParticles curve={curveIn}  color="#06B6D4" count={12} speed={0.055} />
      <LaneParticles curve={curveOut} color="#F59E0B" count={12} speed={0.055} phase={0.5} />

      {/* Status orb above the strait */}
      <StatusOrb status={status} />

      {/* Real AIS vessel dots */}
      {vessels.length > 0 && <VesselDots vessels={vessels} />}
    </>
  );
}

interface HeroSceneProps {
  status: StatusData;
  vessels?: AisVessel[];
}

export default function HeroScene({ status, vessels = [] }: HeroSceneProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [2, 18, 14], fov: 50, near: 0.1, far: 200 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      dpr={[1, 1.5]}
      style={{ background: '#07090F' }}
    >
      <Suspense fallback={null}>
        <SceneContents status={status} vessels={vessels} />
      </Suspense>
      {/* subtle drag/pinch to explore on desktop */}
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        enableRotate
        maxPolarAngle={Math.PI / 2.4}
        minPolarAngle={Math.PI / 6}
        rotateSpeed={0.25}
        autoRotate
        autoRotateSpeed={0.12}
      />
    </Canvas>
  );
}
