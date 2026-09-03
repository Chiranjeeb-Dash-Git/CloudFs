"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Cinematic monochrome dot-grid wave terrain from mainpage HTML.
 * Reacts to pointer position and scroll depth.
 */
export function WaveTerrain() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 24, 82);

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 220);
    camera.position.set(0, 9, 24);
    camera.lookAt(0, 0, -12);

    const COLS = 60;
    const ROWS = 60;
    const SPACING = 1.6;
    const count = COLS * ROWS;
    const positions = new Float32Array(count * 3);
    const alphas = new Float32Array(count);

    let i = 0;
    for (let x = 0; x < COLS; x++) {
      for (let z = 0; z < ROWS; z++) {
        positions[i * 3] = (x - COLS / 2) * SPACING;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = (z - ROWS / 2) * SPACING;
        alphas[i] = 0.5;
        i++;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));

    const sprite = document.createElement("canvas");
    sprite.width = 64;
    sprite.height = 64;
    const sctx = sprite.getContext("2d");
    if (sctx) {
      const g = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.45, "rgba(255,255,255,0.55)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      sctx.fillStyle = g;
      sctx.fillRect(0, 0, 64, 64);
    }
    const tex = new THREE.CanvasTexture(sprite);

    const material = new THREE.PointsMaterial({
      size: 0.16,
      map: tex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.85,
      sizeAttenuation: true,
      color: 0xffffff,
    });

    const points = new THREE.Points(geometry, material);
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

    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const alp = geometry.attributes.aAlpha as THREE.BufferAttribute;
    const clock = new THREE.Clock();
    let raf = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lastFrame = 0;

    const tick = () => {
      raf = requestAnimationFrame(tick);

      // Cap at ~30 FPS to halve CPU usage
      const elapsed = clock.getElapsedTime();
      if (elapsed - lastFrame < 0.033) return;
      lastFrame = elapsed;

      const t = reduced ? 0 : elapsed;
      const scroll = window.scrollY * 0.004;

      for (let n = 0; n < count; n++) {
        const x = pos.getX(n);
        const z = pos.getZ(n);
        const y =
          Math.sin(x * 0.22 + t * 0.7) * 1.15 +
          Math.cos(z * 0.19 - t * 0.5) * 1.05 +
          Math.sin((x + z) * 0.09 + t * 0.35) * 0.9;
        pos.setY(n, y);
        alp.setX(n, 0.3 + Math.max(0, y) * 0.45);
      }
      pos.needsUpdate = true;
      alp.needsUpdate = true;

      camera.position.x += (mouseX * 3 - camera.position.x) * 0.03;
      camera.position.y += (9 + mouseY * 2 + scroll * 2 - camera.position.y) * 0.03;
      points.rotation.y = Math.sin(t * 0.05) * 0.05;
      camera.lookAt(0, -1, -12);
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
      geometry.dispose();
      material.dispose();
      tex.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      id="wave-canvas"
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
      aria-hidden="true"
    />
  );
}

export default WaveTerrain;
