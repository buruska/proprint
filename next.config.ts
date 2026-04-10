import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/index.php",
        has: [
          { type: "query", key: "p", value: "serv" },
          { type: "query", key: "f", value: "3" },
        ],
        destination: "/services",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
