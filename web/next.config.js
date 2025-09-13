/** @type {import('next').NextConfig} */
const nextConfig = {
  // Habilitar salida standalone para Docker
  output: 'standalone',
  
  // Configuración experimental
  experimental: {
    serverComponentsExternalPackages: ['playwright'],
    // Optimizaciones para producción
    optimizeCss: true,
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
    return [
      {
        source: '/(.*)',
        headers: [
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
          }
        ]
      }
    ];
  }
}

module.exports = nextConfig