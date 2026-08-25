"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function EmberParticles() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 20;

    const count = 260;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 24;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 16;
      speeds[i] = 0.006 + Math.random() * 0.014;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.06,
      color: 0xd8b8a8,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const p = geo.attributes.position.array;
      for (let i = 0; i < count; i++) {
        p[i * 3 + 1] += speeds[i];
        if (p[i * 3 + 1] > 12) p[i * 3 + 1] = -12;
      }
      geo.attributes.position.needsUpdate = true;
      points.rotation.y += 0.0004;
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      geo.dispose();
      mat.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={ref} className="fixed inset-0 -z-10 pointer-events-none opacity-40" aria-hidden="true" />;
}

export default EmberParticles;