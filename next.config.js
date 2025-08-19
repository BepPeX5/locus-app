const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
  images: {
    domains: ['lh3.googleusercontent.com'], // For Google profile images
  },
  // Enable PWA features
  ...withPWA({}),
};

module.exports = nextConfig;
