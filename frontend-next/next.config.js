/** @type {import('next').NextConfig} */
const nextConfig = {
    // No transpilePackages needed - SDK loaded via script tag
    output: 'standalone',
    images: {
        unoptimized: true,
    },
};

module.exports = nextConfig;
