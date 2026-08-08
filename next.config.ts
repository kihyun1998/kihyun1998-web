import type { NextConfig } from "next";

const BLOG = 'https://blog.kihyun1998.com';

const nextConfig: NextConfig = {
  // The blog used to live on this apex domain under /ko and /en before moving
  // to blog.kihyun1998.com. Google still holds those old URLs and Search
  // Console reported 14 of them as 404s. Paths map 1:1 across the move, so
  // forward the whole locale subtree permanently and let the ranking signals
  // follow. Query strings are preserved by Next, which matters for the
  // ?from=... share links already in the wild.
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
