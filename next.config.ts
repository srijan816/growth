import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ['@xenova/transformers'],
  webpack: (config, { isServer, dev }) => {
    // Handle @xenova/transformers for client-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }
    
    // Handle WASM files for transformers
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    
    // Fix chunk loading issues
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Framework chunk
            framework: {
              chunks: 'all',
              name: 'framework',
              test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // Vendor chunk for other node_modules
            vendor: {
              chunks: 'all',
              name: 'vendor',
              test: /[\\/]node_modules[\\/]/,
              priority: 20,
            },
            // Common chunk for shared code
            commons: {
              chunks: 'all',
              minChunks: 2,
              name: 'commons',
              priority: 10,
            },
          },
        },
        // Improve runtime chunk stability
        runtimeChunk: {
          name: 'runtime',
        },
      };
    }
    
    return config;
  },
  // Serve models from public directory
  async rewrites() {
    return [
      {
        source: '/models/:path*',
        destination: '/api/models/:path*'
      }
    ];
  },
};

export default nextConfig;
