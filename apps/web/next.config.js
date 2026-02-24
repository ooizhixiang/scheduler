/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@scheduler/shared-types', '@scheduler/shared-validators'],
};

module.exports = nextConfig;
