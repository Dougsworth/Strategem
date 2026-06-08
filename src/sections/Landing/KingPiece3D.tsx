import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// A procedurally-built 3D chess king (lathe-turned body + a cross finial) that
// slowly rotates and floats. No external model file — the silhouette below is
// revolved into a solid, so the whole piece is generated in code. This module is
// imported lazily (React.lazy) so three.js only downloads on the landing page
// and never touches the app bundle. Default export = the lazy boundary.

const CREAM = "#efe7d6";
const ACCENT = "#e8662f";

// Half-silhouette of the king (x = radius, y = height, bottom → top). Revolving
// it around the Y axis gives the base, body, collar, crown and finial ball.
const PROFILE: [number, number][] = [
  [0.0, 0.0],
  [0.95, 0.0],
  [0.95, 0.12],
  [0.78, 0.26],
  [0.6, 0.4],
  [0.42, 0.62],
  [0.34, 0.95],
  [0.3, 1.35],
  [0.32, 1.55],
  [0.5, 1.7],
  [0.54, 1.84],
  [0.4, 1.94],
  [0.3, 2.02],
  [0.4, 2.12],
  [0.58, 2.26],
  [0.6, 2.46],
  [0.52, 2.6],
  [0.34, 2.7],
  [0.26, 2.78],
  [0.3, 2.86],
  [0.3, 2.98],
  [0.18, 3.08],
  [0.0, 3.12],
];

const PIECE_TOP = 3.67; // body + cross
const CENTER_Y = PIECE_TOP / 2;

function King() {
  const group = useRef<THREE.Group>(null);

  const bodyGeo = useMemo(() => {
    const pts = PROFILE.map(([x, y]) => new THREE.Vector2(x, y));
    const geo = new THREE.LatheGeometry(pts, 72);
    geo.computeVertexNormals();
    return geo;
  }, []);

  // Slow spin + gentle vertical float.
  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    g.rotation.y += delta * 0.45;
    g.position.y = -CENTER_Y + Math.sin(state.clock.elapsedTime * 0.9) * 0.06;
  });

  return (
    <group ref={group}>
      <mesh geometry={bodyGeo} castShadow>
        <meshStandardMaterial color={CREAM} roughness={0.34} metalness={0.16} />
      </mesh>
      {/* cross finial — vertical + horizontal bars */}
      <mesh position={[0, 3.4, 0]} castShadow>
        <boxGeometry args={[0.13, 0.58, 0.13]} />
        <meshStandardMaterial color={CREAM} roughness={0.34} metalness={0.16} />
      </mesh>
      <mesh position={[0, 3.33, 0]} castShadow>
        <boxGeometry args={[0.44, 0.13, 0.13]} />
        <meshStandardMaterial color={CREAM} roughness={0.34} metalness={0.16} />
      </mesh>
    </group>
  );
}

export default function KingPiece3D() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 0.35, 6.4], fov: 32 }}
    >
      <ambientLight intensity={0.45} />
      {/* warm key light, casts the contact shadow */}
      <directionalLight
        position={[5, 8, 5]}
        intensity={2.1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      {/* soft fill */}
      <directionalLight position={[-3, 2, 4]} intensity={0.5} />
      {/* brand-accent rim from behind for the orange edge glow */}
      <directionalLight position={[-5, 3, -5]} intensity={1.6} color={ACCENT} />

      <King />

      {/* contact shadow */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -CENTER_Y - 0.02, 0]}
        receiveShadow
      >
        <planeGeometry args={[14, 14]} />
        <shadowMaterial transparent opacity={0.28} />
      </mesh>
    </Canvas>
  );
}
