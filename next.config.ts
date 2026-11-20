import type { NextConfig } from "next";

const BLOG = 'https://blog.kihyun1998.com';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/ko', destination: `${BLOG}/ko`, permanent: true },
      { source: '/en', destination: `${BLOG}/en`, permanent: true },
      { source: '/ko/:path*', destination: `${BLOG}/ko/:path*`, permanent: true },
      { source: '/en/:path*', destination: `${BLOG}/en/:path*`, permanent: true },
    ];
  },
};

export default nextConfig;
