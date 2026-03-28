'use client';

import { Suspense, useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, RoundedBox, Environment } from '@react-three/drei';
import * as THREE from 'three';
import type { Tower, Block } from '@/types';
import { useAnalysisStore } from '@/store';

// ============================================================
// Real Jenga Dimensions — 3 blocks per row, alternating 90°
// ============================================================

const BLOCK_W = 0.75;
const BLOCK_H = 0.28;
const BLOCK_D = 2.25;
const ROW_GAP = 0.04;
const TOWER_SPACING = 4.5;

// ============================================================
// Color helpers
// ============================================================

function scoreColor(score: number): string {
  if (score >= 0.8) return '#059669';
  if (score >= 0.65) return '#16a34a';
  if (score >= 0.5) return '#65a30d';
  if (score >= 0.35) return '#ca8a04';
  if (score >= 0.2) return '#ea580c';
  return '#dc2626';
}

function stateColor(block: Block): string {
  if (block.state === 'removed') return '#1e293b';
  if (block.state === 'collapsed') return '#991b1b';
  if (block.state === 'wobble') return '#92400e';
  return scoreColor(block.stability_score);
}

function stateEmissive(block: Block): string {
  if (block.state === 'collapsed') return '#7f1d1d';
  if (block.state === 'wobble') return '#78350f';
  if (block.stability_score >= 0.7) return '#052e16';
  return '#000000';
}

// ============================================================
// Build a global block numbering map
// ============================================================

export function buildBlockNumberMap(towers: Tower[]): Map<string, { towerIdx: number; blockIdx: number }> {
  const map = new Map<string, { towerIdx: number; blockIdx: number }>();
  towers.forEach((tower, ti) => {
    tower.blocks.forEach((block, bi) => {
      map.set(block.block_id, { towerIdx: ti + 1, blockIdx: bi + 1 });
    });
  });
  return map;
}

// ============================================================
// Single 3D Jenga Block — clean numbered design
// ============================================================

interface JengaBlock3DProps {
  block: Block;
  targetPos: [number, number, number];
  rotation: [number, number, number];
  entryDelay: number;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  isSelected: boolean;
  label: string; // e.g. "1.3"
}

function JengaBlock3D({ block, targetPos, rotation, entryDelay, onSelect, onRemove, isSelected, label }: JengaBlock3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [entered, setEntered] = useState(false);
  const [falling, setFalling] = useState(false);
  const fallVel = useRef(0);
  const fallRot = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), entryDelay);
    return () => clearTimeout(t);
  }, [entryDelay]);

  useEffect(() => {
    if (block.state === 'collapsed' || block.state === 'removed') {
      const t = setTimeout(() => setFalling(true), 100);
      return () => clearTimeout(t);
    }
    setFalling(false);
    fallVel.current = 0;
    fallRot.current = 0;
  }, [block.state]);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;

    if (falling) {
      fallVel.current += 12 * delta;
      g.position.y -= fallVel.current * delta;
      fallRot.current += delta * 3;
      g.rotation.z = Math.sin(fallRot.current) * 0.8;
      g.rotation.x += delta * 1.5;
      if (block.state === 'removed') g.position.x += delta * 3;
      const s = g.scale.x;
      if (s > 0.01) g.scale.setScalar(Math.max(0.01, s - delta));
      return;
    }

    if (!entered) {
      g.position.set(targetPos[0], targetPos[1] + 4, targetPos[2]);
      g.scale.setScalar(1);
      return;
    }

    g.position.x += (targetPos[0] - g.position.x) * 0.1;
    g.position.y += (targetPos[1] - g.position.y) * 0.1;
    g.position.z += (targetPos[2] - g.position.z) * 0.1;
    g.scale.setScalar(1);

    if (block.state === 'wobble') {
      const t = performance.now() * 0.001;
      g.rotation.z = Math.sin(t * 1.5 + entryDelay) * 0.035;
      g.rotation.x = Math.cos(t * 1.2 + entryDelay) * 0.02;
    } else {
      g.rotation.z *= 0.92;
      g.rotation.x *= 0.92;
    }

    if (hovered && !falling) {
      g.position.y += (targetPos[1] + 0.12 - g.position.y) * 0.15;
    }
  });

  const color = stateColor(block);
  const emissive = stateEmissive(block);
  const opacity = block.state === 'removed' ? 0.15 : block.state === 'collapsed' ? 0.45 : 1;

  return (
    <group
      ref={groupRef}
      position={[targetPos[0], targetPos[1] + 4, targetPos[2]]}
      rotation={rotation}
    >
      <mesh
        onPointerOver={e => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
        onClick={e => { e.stopPropagation(); onSelect(block.block_id); }}
        onContextMenu={e => { e.stopPropagation(); e.nativeEvent.preventDefault(); onRemove(block.block_id); }}
        castShadow
        receiveShadow
      >
        <RoundedBox args={[BLOCK_W, BLOCK_H, BLOCK_D]} radius={0.03} smoothness={4}>
          <meshStandardMaterial
            color={hovered && !falling ? '#60a5fa' : color}
            emissive={isSelected ? '#2563eb' : emissive}
            emissiveIntensity={isSelected ? 0.6 : 0.15}
            roughness={0.45}
            metalness={0.05}
            transparent={opacity < 1}
            opacity={opacity}
          />
        </RoundedBox>

        {/* Block number — small, centered on top */}
        <Text
          position={[0, BLOCK_H / 2 + 0.005, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.14}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          fontWeight={700}
        >
          {label}
        </Text>

        {/* Selection outline */}
        {isSelected && (
          <RoundedBox args={[BLOCK_W + 0.05, BLOCK_H + 0.05, BLOCK_D + 0.05]} radius={0.04} smoothness={3}>
            <meshBasicMaterial color="#3b82f6" wireframe transparent opacity={0.5} />
          </RoundedBox>
        )}
      </mesh>
    </group>
  );
}

// ============================================================
// Real Jenga Tower — 3 blocks per row, alternating 90°
// ============================================================

interface JengaTower3DProps {
  tower: Tower;
  towerIndex: number;
  totalTowers: number;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  selectedBlockId: string | null;
  globalBlockOffset: number;
  blockNumberMap: Map<string, { towerIdx: number; blockIdx: number }>;
}

function JengaTower3D({ tower, towerIndex, totalTowers, onSelect, onRemove, selectedBlockId, globalBlockOffset, blockNumberMap }: JengaTower3DProps) {
  const totalWidth = (totalTowers - 1) * TOWER_SPACING;
  const xCenter = towerIndex * TOWER_SPACING - totalWidth / 2;

  const sortedBlocks = useMemo(() => {
    return [...tower.blocks].sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return b.stability_score - a.stability_score;
    });
  }, [tower.blocks]);

  const blockPlacements = useMemo(() => {
    const placements: { block: Block; pos: [number, number, number]; rot: [number, number, number]; delay: number }[] = [];

    sortedBlocks.forEach((block, idx) => {
      const row = Math.floor(idx / 3);
      const col = idx % 3;
      const isEvenRow = row % 2 === 0;
      const y = row * (BLOCK_H + ROW_GAP);

      let pos: [number, number, number];
      let rot: [number, number, number];

      if (isEvenRow) {
        const x = (col - 1) * BLOCK_W;
        pos = [xCenter + x, y, 0];
        rot = [0, 0, 0];
      } else {
        const z = (col - 1) * BLOCK_W;
        pos = [xCenter, y, z];
        rot = [0, Math.PI / 2, 0];
      }

      placements.push({ block, pos, rot, delay: (globalBlockOffset + idx) * 180 });
    });

    return placements;
  }, [sortedBlocks, xCenter, globalBlockOffset]);

  const collapsed = tower.blocks.filter(b => b.state === 'collapsed' || b.state === 'removed').length;
  const health = 1 - collapsed / Math.max(tower.blocks.length, 1);
  const labelColor = health > 0.7 ? '#22c55e' : health > 0.4 ? '#f59e0b' : '#ef4444';

  return (
    <group>
      {/* Base platform */}
      <mesh position={[xCenter, -0.12, 0]} receiveShadow castShadow>
        <RoundedBox args={[2.8, 0.1, 2.8]} radius={0.03} smoothness={4}>
          <meshStandardMaterial color="#1e293b" roughness={0.6} metalness={0.2} />
        </RoundedBox>
      </mesh>

      {/* Tower number label */}
      <Text
        position={[xCenter, -0.28, 1.6]}
        fontSize={0.18}
        color={labelColor}
        anchorX="center"
        anchorY="top"
        fontWeight={700}
      >
        Tower {towerIndex + 1}
      </Text>

      <Text
        position={[xCenter, -0.52, 1.6]}
        fontSize={0.08}
        color="#475569"
        anchorX="center"
        anchorY="top"
      >
        {tower.blocks.length} blocks | {Math.round(health * 100)}% health
      </Text>

      {health < 0.4 && (
        <mesh position={[xCenter, -0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.3, 1.45, 32]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.5} />
        </mesh>
      )}

      {blockPlacements.map(({ block, pos, rot, delay }) => {
        const nums = blockNumberMap.get(block.block_id);
        const lbl = nums ? `${nums.towerIdx}.${nums.blockIdx}` : '?';
        return (
          <JengaBlock3D
            key={block.block_id}
            block={block}
            targetPos={pos}
            rotation={rot}
            entryDelay={delay}
            onSelect={onSelect}
            onRemove={onRemove}
            isSelected={selectedBlockId === block.block_id}
            label={lbl}
          />
        );
      })}
    </group>
  );
}

// ============================================================
// Ground
// ============================================================

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.18, 0]} receiveShadow>
      <planeGeometry args={[60, 60]} />
      <meshStandardMaterial color="#0c1222" roughness={0.95} metalness={0} />
    </mesh>
  );
}

// ============================================================
// Camera controller
// ============================================================

function CameraRig({ towerCount, maxBlocks }: { towerCount: number; maxBlocks: number }) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(0, 1.2, 0));

  useEffect(() => {
    const dist = Math.max(9, towerCount * 3 + maxBlocks * 0.12);
    camera.position.set(dist * 0.6, dist * 0.5, dist * 0.85);
  }, [towerCount, maxBlocks, camera]);

  useFrame(() => {
    camera.lookAt(target.current);
  });

  return null;
}

// ============================================================
// Main 3D Scene
// ============================================================

export default function Tower3DScene() {
  const towerGraph = useAnalysisStore(s => s.towerGraph);
  const selectedBlockId = useAnalysisStore(s => s.selectedBlockId);
  const setSelectedBlock = useAnalysisStore(s => s.setSelectedBlock);
  const removeBlock = useAnalysisStore(s => s.removeBlock);

  const blockNumberMap = useMemo(() => {
    if (!towerGraph) return new Map();
    return buildBlockNumberMap(towerGraph.towers);
  }, [towerGraph]);

  if (!towerGraph || towerGraph.towers.length === 0) return null;

  const maxBlocks = Math.max(...towerGraph.towers.map(t => t.blocks.length), 0);

  let cumulativeOffset = 0;
  const offsets = towerGraph.towers.map(t => {
    const off = cumulativeOffset;
    cumulativeOffset += t.blocks.length;
    return off;
  });

  return (
    <div className="w-full h-full relative">
      <Canvas
        shadows
        camera={{ position: [8, 7, 14], fov: 38 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
        onPointerMissed={() => setSelectedBlock(null)}
      >
        <Suspense fallback={null}>
          <CameraRig towerCount={towerGraph.towers.length} maxBlocks={maxBlocks} />

          <ambientLight intensity={0.35} />
          <directionalLight
            position={[8, 12, 6]}
            intensity={1.4}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-far={50}
            shadow-camera-left={-15}
            shadow-camera-right={15}
            shadow-camera-top={15}
            shadow-camera-bottom={-15}
          />
          <pointLight position={[-6, 6, -6]} intensity={0.25} color="#818cf8" />
          <pointLight position={[6, 4, 6]} intensity={0.2} color="#34d399" />
          <hemisphereLight args={['#1e293b', '#0c1222', 0.3]} />

          <Environment preset="city" />
          <Ground />

          {towerGraph.towers.map((tower, i) => (
            <JengaTower3D
              key={tower.argument_id}
              tower={tower}
              towerIndex={i}
              totalTowers={towerGraph.towers.length}
              onSelect={setSelectedBlock}
              onRemove={removeBlock}
              selectedBlockId={selectedBlockId}
              globalBlockOffset={offsets[i]}
              blockNumberMap={blockNumberMap}
            />
          ))}

          <OrbitControls
            makeDefault
            enablePan
            enableZoom
            enableRotate
            minDistance={3}
            maxDistance={50}
            maxPolarAngle={Math.PI / 2.05}
            target={[0, 1.2, 0]}
            zoomSpeed={0.8}
            panSpeed={0.6}
          />
        </Suspense>
      </Canvas>

      <div className="absolute bottom-3 left-3 flex gap-3 text-[10px] text-slate-600 font-mono pointer-events-none">
        <span>Drag: orbit</span>
        <span>Scroll: zoom</span>
        <span>Right-click block: pull</span>
        <span>Click: inspect</span>
      </div>
    </div>
  );
}
