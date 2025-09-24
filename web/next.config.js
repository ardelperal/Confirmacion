/** @type {import('next').NextConfig} */
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nextConfig = {
  // Configuración para desarrollo local (sin output standalone)
  // output: 'standalone', // Comentado para desarrollo local

  // Asegurar trazado correcto en monorepo (silencia warning de lockfiles)
  outputFileTracingRoot: path.join(__dirname, '..'),
  
  // Paquetes externos para componentes del servidor
  serverExternalPackages: ['playwright'],
  
  // Configuración experimental
  experimental: {
    // optimizeCss: true, // Deshabilitado temporalmente para reducir uso de memoria
  },
  
  // Deshabilitar ESLint durante el build para CI
  eslint: {
    ignoreDuringBuilds: true,
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
    
    // Optimizaciones para reducir uso de memoria
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: {
            minChunks: 1,
            priority: -20,
            reuseExistingChunk: true
          },
          vendor: {
            test: /[\/]node_modules[\/]/,
            name: 'vendors',
            priority: -10,
            chunks: 'all'
          }
        }
      }
    };
    
    return config;
  },
  
  // Configuración de imágenes
  images: {
    unoptimized: true, // Para mejor compatibilidad con exportación
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
        source: '/recursos/catequesis/fichas/:slug',
        destination: '/recursos/catequesis/fichas/:slug.html'
      }
    ];
  },

  // Headers de seguridad
  async headers() {
    const securityHeaders = [
      {
        key: 'Content-Security-Policy',
        value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
      },
      {
        key: 'X-Frame-Options',
        value: 'DENY'
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin'
      },
      {
        key: 'Permissions-Policy',
        value: 'geolocation=(), camera=(), microphone=()'
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff'
      }
    ];

    // Añadir HSTS solo en producción
    if (process.env.NODE_ENV === 'production') {
      securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload'
      });
    }

    // Headers específicos para recursos de catequesis (solo-lectura)
    const catequesisHeaders = [
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff'
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin'
      },
      {
        key: 'Permissions-Policy',
        value: 'geolocation=(),camera=(),microphone=()'
      }
    ];

    return [
      {
        source: '/recursos/catequesis/(.*)',
        headers: catequesisHeaders
      },
      {
        source: '/(.*)',
        headers: securityHeaders
      }
    ];
  }
}

export default nextConfig;
