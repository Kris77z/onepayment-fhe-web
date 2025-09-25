import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['localhost'],
    unoptimized: false,
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  webpack: (config) => {
    // 忽略 pino 的可选依赖，避免构建环境缺失 'pino-pretty' 报错
    config.resolve = config.resolve || { alias: {} as Record<string, string | false> } as any
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'pino-pretty': false,
      colorette: false,
      'supports-color': false,
    } as any
    return config
  },
};

export default nextConfig;
