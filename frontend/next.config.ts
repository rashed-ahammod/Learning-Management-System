import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Stops Next regenerating AGENTS.md / CLAUDE.md into the repo on every dev run.
  agentRules: false,
};

export default nextConfig;
