import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      new URL("https://pub-3e59cb3f5ea84d3999348ba98e494f6f.r2.dev/**"),
    ],
  },
};

export default nextConfig;
