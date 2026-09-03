"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/** NexaCore particle field — purple additive points, pointer-reactive, secondary to UI. */
export function NexaAtmosphere() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 120);
    camera.position.z = 28;

    const count = 240;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 48;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 32;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 24;
      speeds[i] = 0.004 + Math.random() * 0.01;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.055,
      color: 0x6d5dfb,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    let mouseX = 0;
    let mouseY = 0;
    const onMove = (e: PointerEvent) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("pointermove", onMove);

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const p = geo.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        p[i * 3 + 1] += speeds[i];
        if (p[i * 3 + 1] > 16) p[i * 3 + 1] = -16;
      }
      geo.attributes.position.needsUpdate = true;
      points.rotation.y += 0.0006;
      camera.position.x += (mouseX * 2.4 - camera.position.x) * 0.04;
      camera.position.y += (mouseY * 1.6 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
      geo.dispose();
      mat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-50"
      aria-hidden="true"
    />
  );
}

export default NexaAtmosphere;
