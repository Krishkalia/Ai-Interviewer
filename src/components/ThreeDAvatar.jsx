import React, { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere, MeshDistortMaterial, Float, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { ErrorBoundary } from "./ErrorBoundary";

// Minimalist AI Blob (Zero External Assets)
function AI_Blob({ isSpeaking }) {
  const blobRef = useRef();

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (blobRef.current) {
        // Dynamic Scaling & Distortion
        const targetScale = isSpeaking ? 1.5 : 1.2;
        blobRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
        blobRef.current.rotation.z = time * 0.2;
        blobRef.current.rotation.y = time * 0.3;
    }
  });

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={1}>
      <Sphere ref={blobRef} args={[1, 64, 64]}>
        <MeshDistortMaterial
          color={isSpeaking ? "#00ffcc" : "#8083ff"}
          emissive={isSpeaking ? "#00ffcc" : "#4e51bf"}
          emissiveIntensity={isSpeaking ? 2 : 0.5}
          distort={isSpeaking ? 0.6 : 0.3}
          speed={isSpeaking ? 4 : 2}
          roughness={0.1}
          metalness={0.8}
        />
      </Sphere>
    </Float>
  );
}

export function ThreeDAvatar({ isSpeaking }) {
  return (
    <ErrorBoundary fallback={<div className="h-full flex items-center justify-center text-primary italic">AI Visual Active</div>}>
      <div className="relative w-full h-[360px] md:h-[450px] mb-4">
        {/* Glow Backdrop */}
        <div className={`absolute inset-0 rounded-full blur-[100px] transition-all duration-1000 ${isSpeaking ? 'bg-primary/20 scale-110' : 'bg-primary/10 scale-100'}`}/>
        
        <Canvas shadows camera={{ position: [0, 0, 4.5], fov: 35 }} style={{ background: 'transparent' }}>
          <ambientLight intensity={0.6} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <spotLight position={[-10, 10, 10]} angle={0.2} penumbra={1} intensity={1} />

          <Suspense fallback={null}>
            <AI_Blob isSpeaking={isSpeaking} />
            <ContactShadows opacity={0.4} scale={5} blur={2.4} far={0.8} resolution={256} color="#000000" />
          </Suspense>
        </Canvas>
      </div>
    </ErrorBoundary>
  );
}
