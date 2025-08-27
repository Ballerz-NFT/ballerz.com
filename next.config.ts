import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ballerz.cloud",
        port: "",
        pathname: "/images/**",
      },
    ],
  },
};

export default nextConfig;
