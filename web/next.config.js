/** @type {import('next').NextConfig} */
const nextConfig = {
  // Habilitar salida standalone para Docker
  output: 'standalone',
  
  // Variables de entorno
  env: {
    ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH,
    JWT_SECRET: process.env.JWT_SECRET,
    READ_ONLY: process.env.READ_ONLY,
    VISIBILITY_MODE: process.env.VISIBILITY_MODE,
  },
  
  // Paquetes externos para componentes del servidor
  serverExternalPackages: ['playwright'],
  
  // Configuración experimental
  experimental: {
    // Optimizaciones para producción
    optimizeCss: true,
  },
  
  // Deshabilitar ESLint durante el build para CI
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false,
      path: false,
    };
    return config;
  },
  
  // Configuración de imágenes
  images: {
    unoptimized: true, // Para mejor compatibilidad con exportación
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