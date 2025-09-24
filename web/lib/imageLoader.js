// Simple image loader que no procesa las imágenes durante el build
export default function imageLoader({ src, _width, _quality }) {
  // Simplemente devuelve la URL original sin procesamiento
  return src;
}