// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    // !! WARN !!
    // This is a temporary solution until we fix all type errors
    ignoreBuildErrors: true,
  },
  swcMinify: true,
  poweredByHeader: false,
  reactStrictMode: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  images: {
    domains: ['localhost', 'example.com'],
    unoptimized: true
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve 'fs' module on the client to prevent this error on build --> Error: Can't resolve 'fs'
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
        dns: false,
        "mongodb-client-encryption": false,
        "aws4": false,
        "snappy": false,
        "@mongodb-js/zstd": false,
        "kerberos": false,
        "supports-color": false,
        "bson-ext": false,
        "cardinal": false,
        "chalk": false
      };
    }

    return config;
  }
}

module.exports = nextConfig 