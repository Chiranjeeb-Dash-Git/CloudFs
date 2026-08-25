"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/** Grey accretion-disk particle field from the Nimbus hero HTML (25k points, mix-blend-screen). */
export function NimbusDisk() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 4, 12);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 25000;
    const posArray = new Float32Array(particlesCount * 3);
    const colorArray = new Float32Array(particlesCount * 3);
    const color = new THREE.Color();

    for (let i = 0; i < particlesCount; i++) {
      const r = 2.5 + Math.pow(Math.random(), 2) * 12;
      const theta = Math.random() * Math.PI * 2;
      const ySpread = Math.max(0, 1 - (r - 2.5) / 12) * 1.5;
      const y = (Math.random() - 0.5) * ySpread;

      posArray[i * 3] = Math.cos(theta) * r;
      posArray[i * 3 + 1] = y;
      posArray[i * 3 + 2] = Math.sin(theta) * r;

      const t = Math.max(0, 1.0 - (r - 2.5) / 10);
      color.setHSL(0, 0, 0.35 + t * 0.6);
      colorArray[i * 3] = color.r;
      colorArray[i * 3 + 1] = color.g;
      colorArray[i * 3 + 2] = color.b;
    }

    particlesGeometry.setAttribute("position", new THREE.BufferAttribute(posArray, 3));
    particlesGeometry.setAttribute("color", new THREE.BufferAttribute(colorArray, 3));

    const material = new THREE.PointsMaterial({
      size: 0.04,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particlesMesh = new THREE.Points(particlesGeometry, material);
    particlesMesh.rotation.x = Math.PI * 0.15;
    scene.add(particlesMesh);

    let mouseX = 0;
    let mouseY = 0;
    const onMove = (event: MouseEvent) => {
      mouseX = event.clientX / window.innerWidth - 0.5;
      mouseY = event.clientY / window.innerHeight - 0.5;
    };
    document.addEventListener("mousemove", onMove);

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      particlesMesh.rotation.y -= 0.0015;
      camera.position.x += (mouseX * 3 - camera.position.x) * 0.05;
      camera.position.y += (-mouseY * 3 + 4 - camera.position.y) * 0.05;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
      particlesGeometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      id="webgl-canvas"
      className="pointer-events-none fixed inset-0 -z-20 h-full w-full opacity-90 mix-blend-screen"
      aria-hidden="true"
    />
  );
}

export default NimbusDisk;
