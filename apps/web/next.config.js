/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 启用 App Router
  experimental: {
    // 如果需要 Server Actions
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // 转译 monorepo 中的包
  transpilePackages: ['@hub/shared'],

  // 图片优化配置
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },

  // 环境变量
  env: {
    NEXT_PUBLIC_APP_NAME: 'Hub',
  },

  // 重定向配置
  async redirects() {
    return [
      // 可以添加重定向规则
    ]
  },

  // 自定义 headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
