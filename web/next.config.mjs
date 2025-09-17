/** @type {import('next').NextConfig} */
const nextConfig = {
  // Habilitar salida standalone para Docker
  output: 'standalone',
  
  // Modo estricto de React para mejor desarrollo
  reactStrictMode: true,
  
  // swcMinify is enabled by default in Next.js 13+, no need to specify
  
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

  // Headers de seguridad mejorados
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
        key: 'X-Content-Type-Options',
        value: 'nosniff'
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin'
      },
      {
        key: 'Permissions-Policy',
        value: 'geolocation=(), camera=(), microphone=()'
      }
    ];

    // Añadir HSTS solo en producción con configuración más robusta
    if (process.env.NODE_ENV === 'production') {
      securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload'
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
        value: 'geolocation=(), camera=(), microphone=()'
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