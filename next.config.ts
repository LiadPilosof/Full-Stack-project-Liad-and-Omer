import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js otherwise regenerates AGENTS.md and CLAUDE.md on every start.
  agentRules: false,
};

export default nextConfig;
