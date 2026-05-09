import type { NextConfig } from 'next';

const useStaticExport = process.env.NEXT_STATIC_EXPORT === '1';

const nextConfig: NextConfig = {
  output: useStaticExport ? 'export' : undefined,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

