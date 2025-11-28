import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.svgrepo.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
