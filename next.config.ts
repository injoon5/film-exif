import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Everything runs client-side (no server functions, no database) — ship
  // this as a static site so it can be hosted anywhere with zero backend.
  output: "export",
}

export default nextConfig
