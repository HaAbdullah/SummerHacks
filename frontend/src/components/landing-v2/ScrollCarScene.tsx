"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { STAGES, cameraAt, scrollState } from "./stages";

// CarConcept by Eric Chadwick / Khronos Group — CC BY 4.0. Same asset the
// /beyond-reality page already ships, so it is warm in the CDN cache.
const MODEL_URL =
  "https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/CarConcept/GLB/CarConcept.glb";

// No module-level useGLTF.preload() — this file only ever loads via
// next/dynamic(..., { ssr: false }), but a preload call still runs at import
// time, before that guard applies, and GLTFLoader touches browser-only APIs
// that do not exist in Node's SSR pass.

/** Frame-rate independent damping factor. `base` is the fraction of the
 *  remaining distance still left after one second. */
function damp(base: number, delta: number) {
  return 1 - Math.pow(base, Math.min(delta, 0.1));
}

function Car() {
  const { scene } = useGLTF(MODEL_URL);
  const group = useRef<THREE.Group>(null);

  // A slow idle spin layered under the scroll-driven orbit, so the hero still
  // breathes when nobody is scrolling.
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.05;
  });

  return (
    <group ref={group}>
      <primitive object={scene} scale={1.15} position={[0, -0.6, 0]} />
    </group>
  );
}

/** Moves the camera along the stage path. Reads `scrollState` rather than
 *  props so scrolling never re-renders the React tree. */
function Rig() {
  const { camera } = useThree();
  const desired = useRef(new THREE.Vector3());
  const desiredTarget = useRef(new THREE.Vector3());
  const look = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((_, delta) => {
    const { position, target } = cameraAt(
      scrollState.progress * (STAGES.length - 1),
    );
    desired.current.set(position[0], position[1], position[2]);
    desiredTarget.current.set(target[0], target[1], target[2]);

    const k = damp(0.0015, delta);
    camera.position.lerp(desired.current, k);
    look.current.lerp(desiredTarget.current, k);
    camera.lookAt(look.current);
  });

  return null;
}

/** A rim light that takes on the active stage's accent colour, so the car
 *  visibly changes character as you move down the branch. */
function StageLight() {
  const light = useRef<THREE.SpotLight>(null);
  const colors = useMemo(
    () => STAGES.map((s) => new THREE.Color(s.accent)),
    [],
  );

  useFrame((_, delta) => {
    if (!light.current) return;
    const t = scrollState.progress * (STAGES.length - 1);
    const index = Math.min(Math.round(t), colors.length - 1);
    light.current.color.lerp(colors[index], damp(0.02, delta));
  });

  return (
    <spotLight
      ref={light}
      position={[-6, 4, -5]}
      angle={0.42}
      penumbra={1}
      intensity={3}
    />
  );
}

export function ScrollCarScene() {
  return (
    <Canvas
      camera={{ position: [5.4, 2.1, 5.4], fov: 34 }}
      dpr={[1, 1.75]}
      // No shadow maps: ContactShadows gives the grounding this scene needs at
      // a fraction of the cost, and this canvas is full-viewport.
      gl={{ antialias: true }}
    >
      <ambientLight intensity={0.45} />
      <spotLight
        position={[6, 8, 6]}
        angle={0.3}
        penumbra={1}
        intensity={3}
        color="#ffffff"
      />
      <StageLight />
      <Suspense fallback={null}>
        <Car />
        <Environment preset="city" />
        <ContactShadows
          position={[0, -0.62, 0]}
          opacity={0.5}
          scale={11}
          blur={2.6}
          far={2.2}
        />
      </Suspense>
      <Rig />
    </Canvas>
  );
}
