import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@canteen/contracts",
    "@canteen/ui",
    "@canteen/utils",
  ],
  typedRoutes: true,
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "http://localhost:4000/api/v1/:path*",
      },
    ];
  },
};

export default nextConfig;
