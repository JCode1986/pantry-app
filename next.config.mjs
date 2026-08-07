const publicSeoHeaders = [
  {
    key: "X-Robots-Tag",
    value: "index, follow",
  },
];

const immutableAssetHeaders = [
  {
    key: "Cache-Control",
    value: "public, max-age=31536000, immutable",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: [
    "127.0.0.1",
    "127.0.0.1:3100",
    "localhost",
    "localhost:3100",
  ],
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    qualities: [75, 78],
  },
  experimental: {
    optimizePackageImports: [
      "react-icons/fa",
      "react-icons/lu",
    ],
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
  async headers() {
    return [
      {
        source: "/",
        headers: publicSeoHeaders,
      },
      {
        source: "/terms",
        headers: publicSeoHeaders,
      },
      {
        source: "/privacy",
        headers: publicSeoHeaders,
      },
      {
        source: "/:path*\\.(jpg|jpeg|png|webp|gif|ico)",
        headers: immutableAssetHeaders,
      },
    ];
  },
};

export default nextConfig;
