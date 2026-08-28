"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, DriveFile } from "@/lib/api";
import { Nav } from "@/components/Nav";
import { useDriveUi } from "@/components/DriveUi";

/* ================= Custom SVG Icons matching the HTML style ================= */
const ICONS = {
  cloud: (
    <svg viewBox="0 0 24 24" className="w-[1.2em] h-[1.2em]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 18a4 4 0 0 1-.4-7.98A5.5 5.5 0 0 1 16.8 8.2a4.5 4.5 0 0 1-.8 8.9" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" className="w-[1.2em] h-[1.2em]" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M20 20l-4.8-4.8" strokeLinecap="round" />
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 24 24" className="w-[1.2em] h-[1.2em]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
      <path d="M9.5 19a2.5 2.5 0 0 0 5 0" />
    </svg>
  ),
  image: (
    <svg viewBox="0 0 24 24" className="w-[1.2em] h-[1.2em]" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="10" r="1.6" fill="currentColor" />
      <path d="M4 17l5-5 4 4 3-3 4 4" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  ),
  folder: (
    <svg viewBox="0 0 24 24" className="w-[1.2em] h-[1.2em]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M3.5 6.5a1.5 1.5 0 0 1 1.5-1.5h4.2l2 2.4H19a1.5 1.5 0 0 1 1.5 1.5v8.6A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5V6.5Z" />
    </svg>
  ),
  pdf: (
    <svg viewBox="0 0 24 24" className="w-[1.2em] h-[1.2em]" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8.5 9h2a1.5 1.5 0 0 1 0 3h-2z" strokeWidth="1.3" />
      <path d="M8.5 13.5h7M8.5 16.5h4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  video: (
    <svg viewBox="0 0 24 24" className="w-[1.2em] h-[1.2em]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <rect x="3" y="6" width="13" height="12" rx="2" />
      <path d="M16.5 10.2 21 8v8l-4.5-2.2Z" />
    </svg>
  ),
  play: (
    <svg viewBox="0 0 24 24" className="w-[1.2em] h-[1.2em]" fill="currentColor">
      <path d="M8 5.5v13l11-6.5Z" />
    </svg>
  ),
  eye: (
    <svg viewBox="0 0 24 24" className="w-[1.2em] h-[1.2em]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  pen: (
    <svg viewBox="0 0 24 24" className="w-[1.2em] h-[1.2em]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M4 20l1-4.2L15.8 5 19 8.2 8.2 19Z" />
      <path d="M13.2 6.6 17.4 10.8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  share: (
    <svg viewBox="0 0 24 24" className="w-[1.2em] h-[1.2em]" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="18" cy="5.5" r="2.3" />
      <circle cx="6" cy="12" r="2.3" />
      <circle cx="18" cy="18.5" r="2.3" />
      <path d="M8 10.8 16 6.4M8 13.2l8 4.4" stroke="currentColor" stroke-width="1.4" />
    </svg>
  ),
  download: (
    <svg viewBox="0 0 24 24" className="w-[1.2em] h-[1.2em]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v11.5M7 11l5 5 5-5" />
      <path d="M4.5 19.5h15" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" className="w-[1.2em] h-[1.2em]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 7h15M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2M6.5 7l1 12a2 2 0 0 0 2 1.8h5a2 2 0 0 0 2-1.8l1-12" />
    </svg>
  ),
  arrow: (
    <svg viewBox="0 0 24 24" className="w-[1.2em] h-[1.2em]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" className="w-[1.2em] h-[1.2em]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" className="w-[1.2em] h-[1.2em]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M4 20V10M11 20V4M18 20v-7" />
    </svg>
  ),
};

/* ================= Color Palettes and Art Generators ================= */
const PALETTES = [
  ["#1a1a1a", "#c9a24a", "#0c0c0c"],
  ["#101010", "#d9d0b8", "#1c1c1c"],
  ["#141414", "#b98a52", "#080808"],
  ["#161616", "#e3d9c0", "#0a0a0a"],
  ["#121212", "#a98450", "#050505"],
  ["#181818", "#cbb98f", "#0d0d0d"],
];

function portraitSVG(seed: number) {
  const p = PALETTES[seed % PALETTES.length];
  const cx = 40 + ((seed * 13) % 20);
  const cy = 36 + ((seed * 7) % 10);
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
      <defs>
        <radialGradient id={`g${seed}`} cx={`${cx}%`} cy={`${cy}%`} r="75%">
          <stop offset="0%" stopColor={p[1]} stopOpacity="0.9" />
          <stop offset="55%" stopColor={p[0]} />
          <stop offset="100%" stopColor={p[2]} />
        </radialGradient>
        <linearGradient id={`l${seed}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p[1]} stopOpacity="0.5" />
          <stop offset="100%" stopColor={p[2]} stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#g${seed})`} />
      <ellipse cx="50" cy={58 + (seed % 5)} rx={20 + (seed % 6)} ry={28 + (seed % 5)} fill={p[2]} opacity="0.55" />
      <ellipse cx="50" cy={30 + (seed % 6)} rx={13 + (seed % 4)} ry={16 + (seed % 3)} fill={p[2]} opacity="0.5" />
      <rect width="100" height="45" fill={`url(#l${seed})`} />
      <circle cx={20 + ((seed * 17) % 60)} cy={15 + ((seed * 11) % 20)} r={1 + (seed % 3) * 0.6} fill={p[1]} opacity="0.7" />
    </svg>
  );
}

/* ================= Confetti Burst Helper ================= */
function burstConfetti(x: number, y: number) {
  if (typeof window === "undefined") return;
  const colors = ["#f0e6c8", "#e8e8e8", "#c9b98a", "#ffffff"];
  for (let i = 0; i < 28; i++) {
    const p = document.createElement("div");
    const s = Math.random() * 6 + 4;
    p.style.cssText = `position:fixed; left:${x}px; top:${y}px; width:${s}px; height:${s}px; border-radius:${
      Math.random() > 0.5 ? "50%" : "2px"
    }; background:${colors[Math.floor(Math.random() * colors.length)]}; pointer-events:none; z-index:200;`;
    document.body.appendChild(p);

    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * 150 + 70;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 40;

    p.animate(
      [
        { transform: "translate(0,0) rotate(0)", opacity: 1 },
        { transform: `translate(${dx}px,${dy}px) rotate(${Math.random() * 400 - 200}deg)`, opacity: 0 },
      ],
      {
        duration: 900 + Math.random() * 500,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      }
    ).onfinish = () => p.remove();
  }
}

/* ================= Live File Thumbnail component ================= */
function FileThumbnail({ fileId, type, name, seed }: { fileId: string; type: string; name: string; seed: number }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (type !== "photo") return;

    let active = true;
    let objectUrl: string | null = null;

    async function load() {
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";
        const res = await fetch(`${API_BASE}/api/files/${fileId}/thumbnail`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("failed");
        const blob = await res.blob();
        if (active) {
          objectUrl = URL.createObjectURL(blob);
          setSrc(objectUrl);
        }
      } catch (err) {
        // Fallback handled by return condition
      }
    }

    load();

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [fileId, type]);

  if (type === "photo" && src) {
    return <img src={src} alt={name} className="w-full h-full object-cover block" />;
  }

  // Fallback to portrait SVG for non-images or on error
  return <div className="file-thumb-art h-full w-full">{portraitSVG(seed)}</div>;
}

/* ================= Live File Modal Viewer component ================= */
function FileModalViewer({ file }: { file: FileItem }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    async function load() {
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";
        const res = await fetch(`${API_BASE}/api/files/${file.id}/download`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error(`Failed to download file (${res.status})`);
        const blob = await res.blob();
        if (active) {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Load failed");
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [file.id]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center font-mono text-xs text-muted-foreground animate-pulse">
        LOADING CONTENT...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center font-mono text-xs text-red-500">
        ERROR: {error}
      </div>
    );
  }

  if (!url) return null;

  if (file.type === "photo") {
    return <img src={url} alt={file.name} className="max-w-full max-h-full object-contain block mx-auto" />;
  }

  if (file.type === "video") {
    return (
      <video src={url} controls autoPlay className="max-w-full max-h-full object-contain block mx-auto">
        Your browser does not support the video tag.
      </video>
    );
  }

  if (file.type === "pdf") {
    return (
      <iframe src={`${url}#toolbar=0`} className="w-full h-full border-0" title={file.name} />
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-muted-foreground">
      <span className="text-sm font-mono">No preview available</span>
    </div>
  );
}

/* ================= File Card Component (with 3D tilt) ================= */
interface FileItem {
  id: string;
  type: string;
  seed: number;
  name: string;
  size: string;
  date: string;
  span?: string;
  duration?: string;
  pages?: number;
}

function FileCard({
  file,
  onView,
  onDelete,
  onDownload,
}: {
  file: FileItem;
  onView: () => void;
  onDelete: () => void;
  onDownload: (e: React.MouseEvent) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const videoCanvasRef = useRef<HTMLCanvasElement>(null);

  // Video plate dynamic gradient logic
  useEffect(() => {
    if (file.type !== "video" || !videoCanvasRef.current) return;
    const canvas = videoCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let t = file.seed * 10;
    const p = PALETTES[file.seed % PALETTES.length];
    let animationFrameId: number;

    const draw = () => {
      t += 0.01;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const g = ctx.createLinearGradient(0, 0, w * Math.cos(t * 0.3), h * Math.sin(t * 0.3));
      g.addColorStop(0, p[0]);
      g.addColorStop(0.5 + Math.sin(t) * 0.15, p[1]);
      g.addColorStop(1, p[2]);

      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      ctx.globalAlpha = 0.12;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const r = 60 + Math.sin(t + i) * 20;
        ctx.fillStyle = "#fff";
        ctx.arc(w / 2 + Math.sin(t * 0.7 + i) * (w / 3), h / 2 + Math.cos(t * 0.6 + i) * (h / 3), r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationFrameId);
  }, [file]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const card = cardRef.current;
    if (!card) return;
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const rx = (py - 0.5) * -10;
    const ry = (px - 0.5) * 10;

    card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`;
    card.style.setProperty("--mx", `${px * 100}%`);
    card.style.setProperty("--my", `${py * 100}%`);
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = "rotateX(0deg) rotateY(0deg) translateY(0px)";
  };

  return (
    <article className="file-card h-full" onClick={onView}>
      <div
        ref={cardRef}
        className="file-card-inner h-full flex flex-col"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className="file-thumb flex-1">
          {file.type === "photo" && (
            <FileThumbnail fileId={file.id} type={file.type} name={file.name} seed={file.seed} />
          )}
          {file.type === "video" && (
            <>
              <div className="video-plate-slot h-full w-full">
                <canvas ref={videoCanvasRef} width={320} height={240} className="w-full h-full block" />
              </div>
              <div className="play-badge">
                <div className="circle">{ICONS.play}</div>
              </div>
              <span className="badge" style={{ left: "auto", right: "10px" }}>
                {file.duration}
              </span>
            </>
          )}
          {file.type === "pdf" && (
            <div
              className="flex h-full w-full flex-col items-center justify-center gap-2"
              style={{
                background: "radial-gradient(circle at 50% 30%, oklch(1 0 0 / 6%), transparent 60%), var(--gradient-panel)",
              }}
            >
              <span style={{ color: "var(--luxe)", fontSize: "2.2rem" }}>{ICONS.pdf}</span>
              <span className="font-mono text-[10px] text-muted-foreground">{file.pages} pages</span>
            </div>
          )}
          <span className="badge">
            {ICONS[file.type as keyof typeof ICONS]} {file.type.toUpperCase()}
          </span>
          <div className="scrim"></div>
          <div className="dock">
            <button
              title="View"
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
            >
              {ICONS.eye}
            </button>
            <button title="Edit" onClick={(e) => e.stopPropagation()}>
              {ICONS.pen}
            </button>
            <button title="Share" onClick={(e) => e.stopPropagation()}>
              {ICONS.share}
            </button>
            <button
              title="Download"
              onClick={(e) => {
                e.stopPropagation();
                onDownload(e);
              }}
            >
              {ICONS.download}
            </button>
            <button
              title="Delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              {ICONS.trash}
            </button>
          </div>
        </div>
        <div className="p-3.5 shrink-0 bg-transparent">
          <p className="truncate text-[13px] font-medium text-white">{file.name}</p>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
            {file.size} · {file.date}
          </p>
        </div>
      </div>
    </article>
  );
}

/* ================= Helpers ================= */
function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function mimeToType(mime: string): "photo" | "video" | "pdf" {
  if (mime.startsWith("image/")) return "photo";
  if (mime.startsWith("video/")) return "video";
  if (mime.includes("pdf")) return "pdf";
  return "pdf"; // fallback for docs
}

function fileToItem(f: DriveFile, idx: number): FileItem {
  const type = mimeToType(f.mimeType);
  const ago = timeAgo(f.createdAt);
  return {
    id: f.id,
    type,
    seed: Math.abs(hashCode(f.id)) % 100,
    name: f.name,
    size: formatBytes(f.sizeBytes),
    date: ago,
    ...(type === "video" ? { duration: "00:00" } : {}),
    ...(type === "pdf" ? { pages: Math.max(1, Math.floor(f.sizeBytes / 50000)) } : {}),
  };
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const wks = Math.floor(days / 7);
  return `${wks}w ago`;
}

/* ================= Main Gallery Page Component ================= */
export default function GalleryPage() {
  const [filter, setFilter] = useState("all");
  const router = useRouter();
  const queryClient = useQueryClient();
  const ui = useDriveUi();

  // Auth guard
  const { data: meData, error: meError, isLoading: meLoading } = useQuery({
    queryKey: ["me"],
    queryFn: api.me,
    retry: false,
  });

  useEffect(() => {
    if (meError) router.push("/login");
  }, [meError, router]);

  // Fetch all files
  const { data: searchData } = useQuery({
    queryKey: ["search", ""],
    queryFn: () => api.search(""),
    refetchInterval: 3000,
  });

  // Fetch storage stats
  const { data: storageData } = useQuery({
    queryKey: ["storage"],
    queryFn: api.storage,
    refetchInterval: 5000,
  });

  const files: FileItem[] = (searchData?.results ?? [])
    .filter((r): r is DriveFile => "mimeType" in r)
    .map((f, i) => fileToItem(f, i));

  const [activeModalFile, setActiveModalFile] = useState<FileItem | null>(null);

  const headlineCanvasRef = useRef<HTMLCanvasElement>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement>(null);

  // Three.js Wave Background setup
  useEffect(() => {
    const canvas = waveCanvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 40, 120);

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 220);
    camera.position.set(0, 9, 24);
    camera.lookAt(0, 0, -12);

    const COLS = 100;
    const ROWS = 100;
    const SPACING = 0.9;
    const count = COLS * ROWS;
    const positions = new Float32Array(count * 3);
    const alphas = new Float32Array(count);

    let idx = 0;
    for (let x = 0; x < COLS; x++) {
      for (let z = 0; z < ROWS; z++) {
        positions[idx * 3] = (x - COLS / 2) * SPACING;
        positions[idx * 3 + 1] = 0;
        positions[idx * 3 + 2] = (z - ROWS / 2) * SPACING;
        alphas[idx] = 0.5;
        idx++;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uSize: { value: 3.2 * Math.min(window.devicePixelRatio, 2) },
        uColor: { value: new THREE.Color(0xf0e6c8) },
      },
      vertexShader: `
        attribute float aAlpha;
        varying float vAlpha;
        uniform float uSize;
        void main(){
          vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = uSize * (30.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        uniform vec3 uColor;
        void main(){
          float d = length(gl_PointCoord - vec2(0.5));
          if(d > 0.5) discard;
          float glow = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(uColor, glow * vAlpha * 1.4);
        }
      `,
    });

    const points = new THREE.Points(geo, mat);
    scene.add(points);

    let mouseX = 0;
    let mouseY = 0;

    const onPointerMove = (e: PointerEvent) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("resize", onResize);

    const posAttr = geo.attributes.position;
    const alpAttr = geo.attributes.aAlpha;
    const clock = new THREE.Clock();
    let animationFrameId: number;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const tick = () => {
      animationFrameId = requestAnimationFrame(tick);
      const t = clock.getElapsedTime();
      const scroll = typeof window !== "undefined" ? window.scrollY * 0.004 : 0;

      for (let n = 0; n < count; n++) {
        const x = posAttr.getX(n);
        const z = posAttr.getZ(n);
        const y = reduced
          ? 0
          : Math.sin(x * 0.22 + t * 0.7) * 1.1 +
            Math.cos(z * 0.19 - t * 0.5) * 1.0 +
            Math.sin((x + z) * 0.09 + t * 0.35) * 0.85;

        posAttr.setY(n, y);
        alpAttr.setX(n, 0.55 + Math.max(0, y) * 0.6);
      }
      posAttr.needsUpdate = true;
      alpAttr.needsUpdate = true;

      camera.position.x += (mouseX * 3 - camera.position.x) * 0.03;
      camera.position.y += (9 + mouseY * 2 + scroll * 2 - camera.position.y) * 0.03;
      points.rotation.y = reduced ? 0 : Math.sin(t * 0.05) * 0.05;
      camera.lookAt(0, -1, -12);
      renderer.render(scene, camera);
    };

    tick();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", onResize);
      geo.dispose();
      mat.dispose();
      renderer.dispose();
    };
  }, []);

  // Headline Shimmer logic
  useEffect(() => {
    const canvas = headlineCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const size = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
    };

    size();
    window.addEventListener("resize", size);

    let t = 0;
    let animationFrameId: number;

    const frame = () => {
      animationFrameId = requestAnimationFrame(frame);
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.font = `600 ${h * 0.62}px "DM Sans", sans-serif`;

      const text = "GALLERY";
      const tw = ctx.measureText(text).width;
      const x0 = Math.max(w * 0.01, (w - tw) / 2 - w * 0.28);

      const sweep = (Math.sin(t * 0.6) + 1) / 2;
      const grad = ctx.createLinearGradient(x0 - tw * 0.4, 0, x0 + tw * 1.1, 0);
      const p = sweep;

      grad.addColorStop(Math.max(0, p - 0.28), "#6b6b6b");
      grad.addColorStop(Math.max(0, p - 0.1), "#e8e8e8");
      grad.addColorStop(Math.min(1, p + 0.02), "#f6ecc8");
      grad.addColorStop(Math.min(1, p + 0.1), "#e8e8e8");
      grad.addColorStop(Math.min(1, p + 0.3), "#6b6b6b");

      ctx.fillStyle = grad;
      ctx.fillText(text, x0, h * 0.54);

      t += reduced ? 0 : 0.016;
    };

    frame();
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", size);
    };
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await api.deleteFile(id);
      queryClient.invalidateQueries({ queryKey: ["search"] });
      queryClient.invalidateQueries({ queryKey: ["storage"] });
      queryClient.invalidateQueries({ queryKey: ["recent"] });
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleUpload = (e: React.MouseEvent) => {
    burstConfetti(e.clientX, e.clientY);
    ui.openUpload();
  };

  const filteredFiles = files.filter((f) => filter === "all" || f.type === filter);

  // Statistics counters
  const photoCount = files.filter((f) => f.type === "photo").length;
  const photoSize = files.filter((f) => f.type === "photo").reduce((acc, f) => acc + parseFloat(f.size), 0).toFixed(1);

  const videoCount = files.filter((f) => f.type === "video").length;
  const videoSize = files.filter((f) => f.type === "video").reduce((acc, f) => acc + parseFloat(f.size), 0).toFixed(1);

  const pdfCount = files.filter((f) => f.type === "pdf").length;
  const pdfSize = files.filter((f) => f.type === "pdf").reduce((acc, f) => acc + parseFloat(f.size), 0).toFixed(1);

  const storagePercent = storageData?.percentUsed ?? 0;
  const storageFree = formatBytes(storageData?.freeBytes ?? 0);

  if (meLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
        <div className="font-mono text-sm tracking-widest animate-pulse">LOADING GALLERY...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050505] font-sans selection:bg-neutral-800">
      <style jsx global>{`
        :root {
          --radius: 1.25rem;
          --background: oklch(0.05 0 0);
          --foreground: oklch(0.985 0 0);
          --primary: oklch(0.97 0 0);
          --primary-foreground: oklch(0.13 0 0);
          --secondary: oklch(0.24 0 0);
          --muted-foreground: oklch(0.68 0 0);
          --accent: oklch(0.28 0 0);
          --border: oklch(1 0 0 / 12%);
          --surface: oklch(1 0 0 / 4%);
          --surface-2: oklch(1 0 0 / 7%);
          --hairline: oklch(1 0 0 / 10%);
          --luxe: oklch(0.8 0.11 85); /* champagne gold accent */
          --luxe-soft: oklch(0.8 0.11 85 / 22%);

          --gradient-panel: linear-gradient(180deg, oklch(0.22 0 0) 0%, oklch(0.11 0 0) 100%);
          --gradient-bezel: linear-gradient(180deg, oklch(1 0 0 / 28%) 0%, oklch(1 0 0 / 6%) 40%, oklch(0 0 0 / 60%) 100%);
          --gradient-chrome: linear-gradient(180deg, oklch(0.98 0 0) 0%, oklch(0.82 0 0) 100%);
          --shadow-panel: 0 24px 60px -20px oklch(0 0 0 / 85%), inset 0 1px 0 oklch(1 0 0 / 10%);
          --shadow-lift: 0 32px 80px -24px oklch(0 0 0 / 95%), inset 0 1px 0 oklch(1 0 0 / 18%);
          --ease-cinema: cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Orbit stage & rings */
        .orbit-stage {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .orbit-ring {
          position: absolute;
          border: 1px dashed oklch(1 0 0 / 18%);
          border-radius: 9999px;
          box-shadow: 0 0 15px oklch(0.8 0.11 85 / 10%);
        }
        .orbit-spin {
          position: absolute;
          top: 50%;
          left: 50%;
          border-radius: 9999px;
          animation-name: orbit-spin;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          will-change: transform;
        }
        .orbit-spin.reverse {
          animation-direction: reverse;
        }
        @keyframes orbit-spin {
          from {
            transform: translate(-50%, -50%) rotate(0deg);
          }
          to {
            transform: translate(-50%, -50%) rotate(360deg);
          }
        }
        .orbit-counter {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          animation-name: orbit-spin-counter;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          will-change: transform;
        }
        .orbit-counter.reverse-pair {
          animation-direction: reverse;
        }
        @keyframes orbit-spin-counter {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(-360deg);
          }
        }
        .orbit-icon {
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9999px;
          background: var(--gradient-panel);
          border: 1px solid var(--luxe-soft);
          box-shadow:
            0 8px 22px oklch(0 0 0 / 75%),
            0 0 12px oklch(0.8 0.11 85 / 25%);
          color: var(--luxe);
          transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
        }
        .orbit-icon:hover {
          border-color: var(--luxe);
          box-shadow: 0 0 20px oklch(0.8 0.11 85 / 50%);
        }
        .orbit-core {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 5px;
          width: 116px;
          height: 116px;
          border-radius: 9999px;
          background: var(--gradient-panel);
          border: 1px solid var(--hairline);
          box-shadow: var(--shadow-panel);
          color: var(--luxe);
        }

        /* Hover button styling */
        .hover-btn {
          position: relative;
          overflow: hidden;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 0.85rem 1.6rem;
          border-radius: 9999px;
          border: 1px solid var(--hairline);
          background: var(--secondary);
          color: var(--foreground);
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition:
            color 0.4s var(--ease-cinema),
            border-color 0.4s var(--ease-cinema);
        }
        .hover-btn .dot {
          width: 8px;
          height: 8px;
          border-radius: 9999px;
          background: var(--luxe);
          transition: transform 0.5s var(--ease-cinema);
        }
        .hover-btn .fill {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 8px;
          height: 8px;
          border-radius: 9999px;
          background: var(--luxe);
          transform: translate(-50%, -50%) scale(0);
          transition: transform 0.6s var(--ease-cinema);
          z-index: 0;
        }
        .hover-btn:hover .fill {
          transform: translate(-50%, -50%) scale(40);
        }
        .hover-btn:hover {
          color: var(--primary-foreground);
          border-color: transparent;
        }
        .hover-btn span,
        .hover-btn .dot,
        .hover-btn svg {
          position: relative;
          z-index: 1;
        }
        .hover-btn:hover .dot {
          background: var(--primary-foreground);
          transform: translateX(2px);
        }
        .hover-btn .arrow {
          opacity: 0;
          transform: translateX(-6px);
          transition: all 0.4s var(--ease-cinema);
          position: relative;
          z-index: 1;
        }
        .hover-btn:hover .arrow {
          opacity: 1;
          transform: translateX(0);
        }

        /* 3D file card styling */
        .file-card {
          perspective: 1400px;
        }
        .file-card-inner {
          position: relative;
          border-radius: 1.5rem;
          overflow: hidden;
          background: var(--gradient-panel);
          border: 1px solid var(--hairline);
          box-shadow: var(--shadow-panel);
          transition:
            box-shadow 0.4s var(--ease-cinema),
            transform 0.15s ease-out;
          cursor: pointer;
          transform-style: preserve-3d;
        }
        .file-card:hover .file-card-inner {
          box-shadow:
            0 40px 90px -20px oklch(0 0 0 / 90%),
            0 0 0 1px var(--luxe-soft);
        }
        .file-card-inner::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 5;
          pointer-events: none;
          opacity: 0;
          border-radius: inherit;
          background: radial-gradient(
            600px circle at var(--mx, 50%) var(--my, 50%),
            oklch(1 0 0 / 10%),
            transparent 40%
          );
          transition: opacity 0.4s ease;
        }
        .file-card:hover .file-card-inner::before {
          opacity: 1;
        }
        .file-thumb {
          position: relative;
          overflow: hidden;
          background: #0a0a0a;
        }
        .file-thumb svg,
        .file-thumb canvas {
          width: 100%;
          height: 100%;
          display: block;
          transition: transform 1s var(--ease-cinema);
        }
        .file-card:hover .file-thumb svg,
        .file-card:hover .file-thumb canvas {
          transform: scale(1.09);
        }
        .file-thumb .scrim {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, transparent 35%, oklch(0 0 0 / 78%) 100%);
          opacity: 0;
          transition: opacity 0.4s ease;
        }
        .file-card:hover .file-thumb .scrim {
          opacity: 1;
        }

        .dock {
          position: absolute;
          left: 50%;
          bottom: 12px;
          transform: translate(-50%, 18px);
          display: flex;
          gap: 8px;
          padding: 7px 9px;
          border-radius: 9999px;
          background: oklch(0.08 0 0 / 80%);
          backdrop-filter: blur(12px);
          border: 1px solid oklch(1 0 0 / 14%);
          opacity: 0;
          transition:
            opacity 0.4s var(--ease-cinema),
            transform 0.5s var(--ease-cinema);
          z-index: 6;
        }
        .file-card:hover .dock {
          opacity: 1;
          transform: translate(-50%, 0);
        }
        .dock button {
          width: 34px;
          height: 34px;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: oklch(1 0 0 / 8%);
          color: #fff;
          border: none;
          cursor: pointer;
          transition:
            transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
            background 0.25s ease,
            color 0.25s ease;
        }
        .dock button:hover {
          transform: translateY(-7px) scale(1.2);
          background: var(--luxe);
          color: #141208;
        }

        .badge {
          position: absolute;
          top: 10px;
          left: 10px;
          z-index: 4;
          font-size: 10px;
          font-family: "Space Mono", monospace;
          letter-spacing: 0.05em;
          padding: 3px 9px;
          border-radius: 9999px;
          background: oklch(0 0 0 / 60%);
          backdrop-filter: blur(6px);
          border: 1px solid oklch(1 0 0 / 12%);
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .play-badge {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;
          z-index: 5;
        }
        .file-card:hover .play-badge {
          opacity: 1;
        }
        .play-badge .circle {
          width: 54px;
          height: 54px;
          border-radius: 9999px;
          background: oklch(1 0 0 / 12%);
          backdrop-filter: blur(10px);
          border: 1px solid var(--luxe-soft);
          display: flex;
          align-items: center;
          justify-content: center;
          transform: scale(0.6);
          transition: transform 0.45s var(--ease-cinema);
          color: var(--luxe);
        }
        .file-card:hover .play-badge .circle {
          transform: scale(1);
        }

        .filter-pill {
          padding: 0.5rem 1.15rem;
          border-radius: 9999px;
          font-size: 0.8rem;
          border: 1px solid var(--hairline);
          color: var(--muted-foreground);
          background: var(--surface);
          cursor: pointer;
          transition: all 0.3s var(--ease-cinema);
        }
        .filter-pill.active {
          background: var(--luxe);
          color: #141208;
          border-color: transparent;
        }
        .filter-pill:hover:not(.active) {
          background: var(--surface-2);
          color: var(--foreground);
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: oklch(0.02 0 0 / 90%);
          backdrop-filter: blur(26px);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.5s var(--ease-cinema);
        }
        .modal-backdrop.open {
          opacity: 1;
          pointer-events: auto;
        }
        .modal-shell {
          width: min(1020px, 92vw);
          max-height: 86vh;
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          border-radius: 1.75rem;
          overflow: hidden;
          background: var(--gradient-panel);
          border: 1px solid var(--hairline);
          box-shadow:
            0 60px 140px -30px oklch(0 0 0 / 95%),
            0 0 0 1px var(--luxe-soft);
          transform: scale(0.9) translateY(30px);
          opacity: 0;
          transition:
            transform 0.6s var(--ease-cinema),
            opacity 0.5s var(--ease-cinema);
        }
        .modal-backdrop.open .modal-shell {
          transform: scale(1) translateY(0);
          opacity: 1;
        }
        .modal-media {
          position: relative;
          background: #050505;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 340px;
          overflow: hidden;
        }
        .modal-media svg,
        .modal-media canvas {
          width: 100%;
          height: 100%;
        }
        .modal-info {
          padding: 2.1rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .modal-close {
          position: absolute;
          top: 18px;
          right: 18px;
          z-index: 5;
          width: 38px;
          height: 38px;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: oklch(1 0 0 / 10%);
          border: 1px solid oklch(1 0 0 / 16%);
          color: #fff;
          cursor: pointer;
          transition:
            transform 0.3s ease,
            background 0.3s ease;
        }
        .modal-close:hover {
          background: var(--luxe);
          color: #141208;
          transform: rotate(90deg);
        }

        .video-text-wrap {
          position: relative;
          height: 150px;
          width: 100%;
        }
        .video-text-wrap canvas {
          width: 100%;
          height: 100%;
          display: block;
        }

        /* 3D Motion Scroll & Auto Floating Hover Effects */
        .gallery-3d-scene {
          perspective: 1200px;
        }
        .gallery-card-reveal {
          opacity: 0;
          transform: translateY(40px) scale(0.95);
          filter: blur(12px);
          animation: galleryCardIn 0.9s var(--ease-cinema) forwards;
          will-change: transform, opacity, filter;
        }
        @keyframes galleryCardIn {
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }

        /* Ambient auto-float pulse for 3D depth */
        @keyframes ambientFloat {
          0%, 100% {
            transform: translateY(0px) rotateX(0deg);
          }
          50% {
            transform: translateY(-5px) rotateX(2deg);
          }
        }
        .auto-ambient-float {
          animation: ambientFloat 6s ease-in-out infinite;
        }

        @media (max-width: 720px) {
          .modal-shell {
            grid-template-columns: 1fr;
          }
          .modal-media {
            min-height: 240px;
          }
        }
      `}</style>

      {/* Wave Background Canvas */}
      <canvas ref={waveCanvasRef} className="fixed inset-0 z-0 pointer-events-none" id="wave-canvas" />

      {/* Ambient Gradient overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: "radial-gradient(circle at 50% 0%, oklch(1 0 0 / 18%) 0%, transparent 60%)",
        }}
      />

      <main className="relative z-10 mx-auto flex min-h-screen max-w-[1280px] flex-col px-6 py-10">
        <Nav theme="mono" />

        {/* Breadcrumbs */}
        <div className="reveal mb-4" data-delay="0" data-revealed="true">
          <div className="flex items-center gap-1.5 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
            <span style={{ color: "color-mix(in oklch, var(--foreground) 80%, transparent)" }}>My Drive</span>
            <span>/</span>
            <span>Media</span>
            <span>/</span>
            <span style={{ color: "var(--luxe)" }}>Gallery</span>
          </div>
        </div>

        {/* Shimmering Headline */}
        <div className="reveal mb-4" data-delay="40" data-revealed="true">
          <div className="video-text-wrap">
            <canvas ref={headlineCanvasRef} id="headline-canvas" />
          </div>
        </div>

        {/* Upload bar & summary */}
        <div className="reveal mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end" data-delay="80" data-revealed="true">
          <p className="max-w-md text-sm text-muted-foreground">
            Every photo, clip, and document — stored, versioned, and rendered like a private screening room. {files.length} items · {formatBytes(storageData?.usedBytes ?? 0)}.
          </p>
          <button className="hover-btn" id="upload-btn" onClick={handleUpload}>
            <span className="dot"></span>
            <span className="fill"></span>
            <span>Upload Media</span>
            <span className="arrow">{ICONS.arrow}</span>
          </button>
        </div>

        {/* Stats Section with Orbit Stage */}
        <section className="grid grid-cols-1 gap-5 md:grid-cols-12 mb-14">
          <div className="reveal md:col-span-5" data-delay="60" data-revealed="true">
            <article className="panel h-[340px]">
              <div className="panel-inner h-full">
                <div className="orbit-stage h-full">
                  <div className="orbit-ring" style={{ width: "290px", height: "290px" }}></div>
                  <div className="orbit-ring" style={{ width: "185px", height: "185px" }}></div>

                  <div className="orbit-core">
                    <span className="text-2xl">{ICONS.cloud}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{files.length} files</span>
                  </div>

                  {/* Outer Orbit */}
                  <div className="orbit-spin" style={{ width: "290px", height: "290px", animationDuration: "18s" }}>
                    <div className="orbit-icon" style={{ width: "48px", height: "48px", top: "0px", left: "145px", marginLeft: "-24px", marginTop: "-24px" }}>
                      <div className="orbit-counter" style={{ animationDuration: "18s" }}>
                        {ICONS.image}
                      </div>
                    </div>
                    <div className="orbit-icon" style={{ width: "48px", height: "48px", top: "145px", left: "290px", marginLeft: "-24px", marginTop: "-24px" }}>
                      <div className="orbit-counter" style={{ animationDuration: "18s" }}>
                        {ICONS.folder}
                      </div>
                    </div>
                    <div className="orbit-icon" style={{ width: "48px", height: "48px", top: "290px", left: "145px", marginLeft: "-24px", marginTop: "-24px" }}>
                      <div className="orbit-counter" style={{ animationDuration: "18s" }}>
                        {ICONS.pdf}
                      </div>
                    </div>
                    <div className="orbit-icon" style={{ width: "48px", height: "48px", top: "145px", left: "0px", marginLeft: "-24px", marginTop: "-24px" }}>
                      <div className="orbit-counter" style={{ animationDuration: "18s" }}>
                        {ICONS.video}
                      </div>
                    </div>
                  </div>

                  {/* Inner Orbit */}
                  <div className="orbit-spin reverse" style={{ width: "185px", height: "185px", animationDuration: "10s" }}>
                    <div className="orbit-icon" style={{ width: "36px", height: "36px", top: "0px", left: "92.5px", marginLeft: "-18px", marginTop: "-18px" }}>
                      <div className="orbit-counter reverse-pair" style={{ animationDuration: "10s" }}>
                        {ICONS.image}
                      </div>
                    </div>
                    <div className="orbit-icon" style={{ width: "36px", height: "36px", top: "160px", left: "160px", marginLeft: "-18px", marginTop: "-18px" }}>
                      <div className="orbit-counter reverse-pair" style={{ animationDuration: "10s" }}>
                        {ICONS.pdf}
                      </div>
                    </div>
                    <div className="orbit-icon" style={{ width: "36px", height: "36px", top: "160px", left: "25px", marginLeft: "-18px", marginTop: "-18px" }}>
                      <div className="orbit-counter reverse-pair" style={{ animationDuration: "10s" }}>
                        {ICONS.video}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>

          <div className="flex h-full flex-col gap-5 md:col-span-3">
            <div className="reveal flex-1" data-delay="140" data-revealed="true">
              <article className="panel h-full min-h-[150px]">
                <div className="panel-inner flex h-full flex-col justify-between p-6">
                  <div className="flex items-start justify-between">
                    <span className="text-sm text-muted-foreground">Photos</span>
                    <span className="text-muted-foreground">{ICONS.image}</span>
                  </div>
                  <div>
                    <p className="text-2xl font-light tracking-tight text-white">{photoCount}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{photoCount > 0 ? photoSize : "0.0"} MB</p>
                  </div>
                </div>
              </article>
            </div>
            <div className="reveal flex-1" data-delay="200" data-revealed="true">
              <article className="panel h-full min-h-[150px]">
                <div className="panel-inner flex h-full flex-col justify-between p-6">
                  <div className="flex items-start justify-between">
                    <span className="text-sm text-muted-foreground">Videos</span>
                    <span className="text-muted-foreground">{ICONS.video}</span>
                  </div>
                  <div>
                    <p className="text-2xl font-light tracking-tight text-white">{videoCount}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{videoCount > 0 ? videoSize : "0.0"} MB</p>
                  </div>
                </div>
              </article>
            </div>
          </div>

          <div className="flex h-full flex-col gap-5 md:col-span-4">
            <div className="reveal flex-1" data-delay="160" data-revealed="true">
              <article className="panel h-full min-h-[150px]">
                <div className="panel-inner flex h-full flex-col justify-between p-6">
                  <div className="flex items-start justify-between">
                    <span className="text-sm text-muted-foreground">PDFs &amp; docs</span>
                    <span className="text-muted-foreground">{ICONS.pdf}</span>
                  </div>
                  <div>
                    <p className="text-2xl font-light tracking-tight text-white">{pdfCount}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{pdfCount > 0 ? pdfSize : "0.0"} MB</p>
                  </div>
                </div>
              </article>
            </div>
            <div className="reveal flex-1" data-delay="220" data-revealed="true">
              <article className="panel h-full min-h-[150px]">
                <div className="panel-inner flex h-full flex-col justify-between p-6">
                  <div className="flex items-start justify-between">
                    <span className="text-sm text-muted-foreground">Storage used</span>
                    <span className="text-muted-foreground">{ICONS.chart}</span>
                  </div>
                  <div>
                    <p className="text-2xl font-light tracking-tight" style={{ color: "var(--luxe)" }}>
                      {storagePercent.toFixed(0)}%
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground">{storageFree} free</p>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* Filter Pills */}
        <div className="reveal mb-7 flex flex-wrap items-center gap-2.5" data-delay="0" data-revealed="true">
          <button className={`filter-pill ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
            All items
          </button>
          <button className={`filter-pill ${filter === "photo" ? "active" : ""}`} onClick={() => setFilter("photo")}>
            Photos
          </button>
          <button className={`filter-pill ${filter === "video" ? "active" : ""}`} onClick={() => setFilter("video")}>
            Videos
          </button>
          <button className={`filter-pill ${filter === "pdf" ? "active" : ""}`} onClick={() => setFilter("pdf")}>
            PDFs
          </button>
          <span className="ml-auto font-mono text-[11px] text-muted-foreground uppercase tracking-widest hidden md:block">
            Sorted · Newest first
          </span>
        </div>

        {/* Files Grid */}
        <section id="gallery-grid" className="mb-20 grid grid-cols-2 gap-5 md:grid-cols-4 auto-rows-[220px]">
          {filteredFiles.map((f, i) => (
            <div
              key={f.id}
              className={`gallery-card-reveal ${f.span || ""}`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <FileCard
                file={f}
                onView={() => setActiveModalFile(f)}
                onDelete={() => handleDelete(f.id)}
                onDownload={(e) => {
                  burstConfetti(e.clientX, e.clientY);
                  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";
                  const link = document.createElement("a");
                  link.href = `${API_BASE}/api/files/${f.id}/download`;
                  link.setAttribute("download", f.name);
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                }}
              />
            </div>
          ))}
        </section>

        {/* Footer */}
        <footer className="flex flex-col items-center justify-between gap-3 border-t border-hairline py-8 text-xs text-muted-foreground md:flex-row">
          <span className="flex items-center gap-2">
            <span>{ICONS.cloud}</span> CloudFS
          </span>
          <span className="font-mono">All systems nominal · edge sync 12 ms</span>
        </footer>
      </main>

      {/* Modal Dialog Backdrop */}
      <div className={`modal-backdrop ${activeModalFile ? "open" : ""}`} onClick={() => setActiveModalFile(null)}>
        {activeModalFile && (
          <div className="modal-shell" onClick={(e) => e.stopPropagation()}>
            <div className="modal-media">
              <button className="modal-close" onClick={() => setActiveModalFile(null)} aria-label="Close">
                {ICONS.close}
              </button>

              <div className="modal-art h-full w-full">
                <FileModalViewer file={activeModalFile} />
              </div>
            </div>

            <div className="modal-info">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {activeModalFile.type}
                </span>
                <h3 className="mt-2 text-2xl font-light tracking-tight text-white">{activeModalFile.name}</h3>
                <p className="mt-3 text-sm text-muted-foreground">
                  {activeModalFile.size} · Added {activeModalFile.date}
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-3">
                <button
                  className="hover-btn justify-center"
                  onClick={(e) => {
                    burstConfetti(e.clientX, e.clientY);
                    const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";
                    const link = document.createElement("a");
                    link.href = `${API_BASE}/api/files/${activeModalFile.id}/download`;
                    link.setAttribute("download", activeModalFile.name);
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                  }}
                >
                  <span className="dot"></span>
                  <span className="fill"></span>
                  <span>Download</span>
                </button>
                <div className="flex gap-2">
                  <button className="flex flex-1 size-10 items-center justify-center rounded-full border border-hairline bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                    {ICONS.pen}
                  </button>
                  <button className="flex flex-1 size-10 items-center justify-center rounded-full border border-hairline bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                    {ICONS.share}
                  </button>
                  <button
                    className="flex flex-1 size-10 items-center justify-center rounded-full border border-hairline bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => {
                      handleDelete(activeModalFile.id);
                      setActiveModalFile(null);
                    }}
                  >
                    {ICONS.trash}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= Auxiliary Video Canvas Component for Modal ================= */
function VideoAnimateCanvas({ seed }: { seed: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let t = seed * 10;
    const p = PALETTES[seed % PALETTES.length];
    let animationFrameId: number;

    const draw = () => {
      t += 0.01;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const g = ctx.createLinearGradient(0, 0, w * Math.cos(t * 0.3), h * Math.sin(t * 0.3));
      g.addColorStop(0, p[0]);
      g.addColorStop(0.5 + Math.sin(t) * 0.15, p[1]);
      g.addColorStop(1, p[2]);

      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      ctx.globalAlpha = 0.12;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const r = 60 + Math.sin(t + i) * 20;
        ctx.fillStyle = "#fff";
        ctx.arc(w / 2 + Math.sin(t * 0.7 + i) * (w / 3), h / 2 + Math.cos(t * 0.6 + i) * (h / 3), r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationFrameId);
  }, [seed]);

  return <canvas ref={canvasRef} width={640} height={480} className="w-full h-full block" />;
}
