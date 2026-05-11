/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/:path*',
          has: [{ type: 'host', value: 'runes.witchtilt.com' }],
          destination: '/runes/:path*',
        },
        {
          source: '/:path*',
          has: [{ type: 'host', value: 'decks.witchtilt.com' }],
          destination: '/decks/:path*',
        },
      ],
    };
  },
};

module.exports = nextConfig;
