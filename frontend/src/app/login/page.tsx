"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { WaveTerrain } from "@/components/WaveTerrain";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  return (
    <div className="theme-mono relative min-h-screen text-foreground">
      <WaveTerrain />
      <Link
        href="/"
        className="absolute left-6 top-6 z-20 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={16} />
        <span>Back</span>
      </Link>
      <main className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <p className="mb-3 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">CloudFS</p>
        <h1 className="mb-8 text-4xl font-light tracking-tight">Sign in</h1>
        <form
          className="flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            try {
              await api.login({ email, password });
              router.push("/dashboard");
            } catch (err) {
              setError(err instanceof Error ? err.message : "Login failed");
            }
          }}
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="rounded-full border border-hairline bg-surface px-4 py-3 text-sm outline-none"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="rounded-full border border-hairline bg-surface px-4 py-3 text-sm outline-none"
          />
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <button className="sheen relative mt-2 h-[52px] overflow-hidden rounded-full border border-hairline bg-secondary text-sm">
            Continue
          </button>
        </form>
        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-hairline" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-hairline" />
        </div>
        <GoogleSignInButton />
        <p className="mt-6 text-sm text-muted-foreground">
          No account?{" "}
          <Link href="/register" className="text-foreground">
            Create one
          </Link>
        </p>
      </main>
    </div>
  );
}
