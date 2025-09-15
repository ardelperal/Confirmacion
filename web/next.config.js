/** @type {import('next').NextConfig} */
const nextConfig = {
  // Habilitar salida standalone para Docker
  output: 'standalone',
  
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

    return [
      {
        source: '/(.*)',
        headers: securityHeaders
      }
    ];
  }
}

export default nextConfig;