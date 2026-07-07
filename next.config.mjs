const publicSeoHeaders = [
  {
    key: "X-Robots-Tag",
    value: "index, follow",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
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
    ];
  },
};

export default nextConfig;
