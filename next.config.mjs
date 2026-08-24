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

function supabaseImageRemotePatterns() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const patterns = [
    {
      protocol: "https",
      hostname: "**.supabase.co",
      pathname: "/storage/v1/**",
    },
  ];

  try {
    const { hostname, protocol } = new URL(supabaseUrl);
    patterns.unshift({
      protocol: protocol.replace(":", ""),
      hostname,
      pathname: "/storage/v1/**",
    });
  } catch {
    // The wildcard Supabase storage pattern still covers hosted projects.
  }

  return patterns;
}

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
    remotePatterns: supabaseImageRemotePatterns(),
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
        source: "/contact",
        headers: publicSeoHeaders,
      },
      {
        source: "/support",
        headers: publicSeoHeaders,
      },
      {
        source: "/home-inventory-app",
        headers: publicSeoHeaders,
      },
      {
        source: "/pantry-inventory-app",
        headers: publicSeoHeaders,
      },
      {
        source: "/shared-household-inventory",
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
