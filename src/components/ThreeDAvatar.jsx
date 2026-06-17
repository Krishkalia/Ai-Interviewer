import React, { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere, MeshDistortMaterial, Float, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { ErrorBoundary } from "./ErrorBoundary";

// Minimalist AI Blob (Zero External Assets)
function AI_Blob({ isSpeaking }) {
  const blobRef = useRef();
  const materialRef = useRef();
  
  // Use persistent colors to avoid re-allocation
  const colorA = useRef(new THREE.Color("#8083ff"));
  const colorB = useRef(new THREE.Color("#00ffcc"));
  const emissiveA = useRef(new THREE.Color("#4e51bf"));
  const emissiveB = useRef(new THREE.Color("#00ffcc"));

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (blobRef.current) {
        // Dynamic Scaling
        const targetScale = isSpeaking ? 1.4 : 1.2;
        blobRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08);
        blobRef.current.rotation.z = time * 0.15;
        blobRef.current.rotation.y = time * 0.2;
    }
    
    if (materialRef.current) {
        // Smoothly lerp material properties to avoid "flashiness"
        const targetDistort = isSpeaking ? 0.45 : 0.3;
        const targetSpeed = isSpeaking ? 2.5 : 1.8;
        const targetEmissiveIntensity = isSpeaking ? 1.5 : 0.4;
        
        materialRef.current.distort = THREE.MathUtils.lerp(materialRef.current.distort, targetDistort, 0.05);
        materialRef.current.speed = THREE.MathUtils.lerp(materialRef.current.speed, targetSpeed, 0.05);
        materialRef.current.emissiveIntensity = THREE.MathUtils.lerp(materialRef.current.emissiveIntensity, targetEmissiveIntensity, 0.05);
        
        // Smooth Color Transitions
        const targetColor = isSpeaking ? colorB.current : colorA.current;
        const targetEmissive = isSpeaking ? emissiveB.current : emissiveA.current;
        
        materialRef.current.color.lerp(targetColor, 0.05);
        materialRef.current.emissive.lerp(targetEmissive, 0.05);
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.8} floatIntensity={0.8}>
      <Sphere ref={blobRef} args={[1, 64, 64]}>
        <MeshDistortMaterial
          ref={materialRef}
          color="#8083ff"
          emissive="#4e51bf"
          emissiveIntensity={0.5}
          distort={0.3}
          speed={2}
          roughness={0.15}
          metalness={0.7}
        />
      </Sphere>
    </Float>
  );
}

export function ThreeDAvatar({ isSpeaking }) {
  return (
    <ErrorBoundary fallback={<div className="h-full flex items-center justify-center text-primary italic font-medium">AI Visual Active</div>}>
      <div className="relative w-full h-full min-h-[300px] flex items-center justify-center overflow-hidden">
        {/* Glow Backdrop */}
        <div className={`absolute inset-0 rounded-full blur-[120px] transition-all duration-1000 ${isSpeaking ? 'bg-primary/25 scale-125' : 'bg-primary/10 scale-100'}`}/>
        
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


