"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Loader, OrbitControls, useGLTF } from "@react-three/drei";

// CarConcept by Eric Chadwick / Khronos Group — CC BY 4.0. See attribution
// credit rendered in BeyondReality.tsx.
const MODEL_URL =
  "https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/CarConcept/GLB/CarConcept.glb";

// No module-level useGLTF.preload() here — this file is only ever loaded via
// next/dynamic(..., { ssr: false }), but a preload call still runs at import
// time, before that guard applies, and GLTFLoader touches browser-only APIs
// (ProgressEvent) that don't exist in Node's SSR pass.

function Car() {
  const { scene } = useGLTF(MODEL_URL);
  return <primitive object={scene} scale={1.15} position={[0, -0.6, 0]} />;
}

export function CarScene() {
  return (
    <>
      <Canvas camera={{ position: [4.2, 1.5, 5], fov: 32 }} dpr={[1, 2]} shadows>
        <ambientLight intensity={0.5} />
        <spotLight
          position={[6, 8, 6]}
          angle={0.3}
          penumbra={1}
          intensity={3}
          color="#3c7eff"
          castShadow
        />
        <spotLight position={[-6, 4, -5]} angle={0.4} penumbra={1} intensity={2} color="#ff3c3c" />
        <Suspense fallback={null}>
          <Car />
          <Environment preset="city" />
          <ContactShadows position={[0, -0.62, 0]} opacity={0.55} scale={10} blur={2.4} far={2} />
        </Suspense>
        <OrbitControls
          enablePan={false}
          autoRotate
          autoRotateSpeed={1.1}
          minDistance={3.5}
          maxDistance={7}
          minPolarAngle={Math.PI / 2.6}
          maxPolarAngle={Math.PI / 2.05}
        />
      </Canvas>
      <Loader
        containerStyles={{ background: "rgb(5 5 5 / 0.9)" }}
        innerStyles={{ width: "240px" }}
        barStyles={{ background: "var(--accent)" }}
        dataStyles={{
          color: "#fff",
          fontFamily: "var(--font-syncopate), sans-serif",
          fontSize: "10px",
          letterSpacing: "0.2em",
        }}
        dataInterpolation={(p) => `LOADING 3D MODEL — ${p.toFixed(0)}%`}
      />
    </>
  );
}
