/** @type {import('next').NextConfig} */
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  // Configuración para producción con Docker
  output: 'standalone',

  // Asegurar trazado correcto en monorepo
  outputFileTracingRoot: path.join(__dirname, '..'),
  
  // Paquetes externos para componentes del servidor
  serverExternalPackages: [
    'playwright',
    'jsdom',
    'fuse.js',
    'marked',
    '@sparticuz/chromium-min'
  ],
  
  // Deshabilitar ESLint durante el build
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Configuración para evitar pre-renderizado de rutas API
  generateBuildId: async () => {
    return 'catequesis-build'
  },

  // Configuración experimental para evitar problemas de build
  experimental: {
    // Removido serverComponentsExternalPackages ya que está deprecated
  },
  
  webpack: (config, { isServer }) => {
    // Configuración para fs y path en el cliente
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    
    return config;
  },
  
  // Configuración de imágenes
  images: {
    unoptimized: true,
    loader: 'custom',
    loaderFile: './lib/imageLoader.js'
  },
  
  // Configuración para manejo de archivos markdown
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  
  // Rewrites para recursos de catequesis
  async rewrites() {
    return [
      {
        source: '/recursos/catequesis',
        destination: '/recursos/catequesis/indice_general.html'
      },
      {
        source: '/recursos/catequesis/:path*',
        destination: '/recursos/catequesis/:path*'
      }
    ];
  },

  // Headers de seguridad
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
