import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // ✅ CHANGE 1: 'standalone' ki jagah 'export' karein taaki 'out' folder bane
  output: "export",

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  images: {
    // ✅ CHANGE 2: Static export ke liye ye zaroori hai
    unoptimized: true, 
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },

  // ❌ CHANGE 3: Headers section ko comment karna padega
  // Static export (output: 'export') ke saath headers() support nahi karta.
  // Agar aapko headers chahiye to Cloudflare ke liye 'public/_headers' file banani padegi.
  
  /* async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ]
      }
    ];
  },
  */
};

export default nextConfig;
