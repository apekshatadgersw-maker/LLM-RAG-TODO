import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Locally: local uvicorn server. On Vercel: the Python function at api/index.py.
const toFastApi = (path: string) => (isDev ? `http://127.0.0.1:8000${path}` : "/api/");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Only proxy FastAPI routes; /api/auth stays with NextAuth
      { source: "/api/todos", destination: toFastApi("/api/todos") },
      { source: "/api/todos/:path*", destination: toFastApi("/api/todos/:path*") },
    ];
  },
};

export default nextConfig;
