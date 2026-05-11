/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/((?!_next/|favicon.ico|api/).*)',
          has: [{ type: 'host', value: 'runes.witchtilt.com' }],
          destination: '/runes/$1',
        },
        {
          source: '/((?!_next/|favicon.ico|api/).*)',
          has: [{ type: 'host', value: 'decks.witchtilt.com' }],
          destination: '/decks/$1',
        },
      ],
    };
  },
};

module.exports = nextConfig;
