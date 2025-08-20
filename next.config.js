/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
  images: {
    domains: ['lh3.googleusercontent.com'], // For Google profile images
  },
  typescript: {
    // Durante il build, ignora alcuni errori TypeScript per deploy veloce
    ignoreBuildErrors: false,
  },
  eslint: {
    // Durante il build, ignora alcuni errori ESLint per deploy veloce  
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;
