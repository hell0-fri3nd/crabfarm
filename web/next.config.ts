import type { NextConfig } from "next";

import { parseRootEnv } from "./lib/root-env";
import { DETECTION_SOCKET_PATH } from "./lib/routes";

const { API_URL, API_PREFIX } = parseRootEnv();

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Route Handlers can't upgrade to a WebSocket; a rewrite to an external URL proxies the upgrade (ADR-0003)
  rewrites: async () => ({
    beforeFiles: [{ source: DETECTION_SOCKET_PATH, destination: `${API_URL}${API_PREFIX}/detections/ws` }],
    afterFiles: [],
    fallback: [],
  }),
};

export default nextConfig;
