import type { NextConfig } from "next";

// Cabeceras de seguridad aplicadas a todas las respuestas HTTP.
// Refuerzan la postura de producción del sistema institucional.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// Protección anti-clickjacking SOLO en producción: el navegador solo permitirá
// que el propio sitio embeba la app. En desarrollo se omite para que la vista
// previa del IDE (iframe) funcione sin restricciones.
// Anti-clickjacking protection in PRODUCTION only. Skipped in development so
// the IDE preview iframe keeps working. Para permitir un portal externo añade
// su origen, p. ej.: value: "frame-ancestors 'self' https://portal.institucion.edu"
if (process.env.NODE_ENV === "production") {
  securityHeaders.push({ key: "Content-Security-Policy", value: "frame-ancestors 'self'" });
}

const nextConfig: NextConfig = {
  output: "standalone",
  compress: true,
  // Sin cabecera "X-Powered-By" (no revelar la tecnología del servidor)
  poweredByHeader: false,
  // Desactiva el indicador flotante del botón "N" de Next.js en desarrollo
  devIndicators: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Orígenes permitidos durante el desarrollo (evita el aviso de cross-origin
  // cuando la vista previa del IDE accede a los recursos /_next/*).
  // "*.local" cubre el acceso por nombre de host mDNS desde otros equipos de la
  // red (p. ej. http://servidor-reportes.local:3000). El acceso directo por IP
  // (http://192.168.x.x:3000) funciona sin configuración adicional porque el
  // navegador envía el mismo origen para la página y sus recursos.
  // Si la app se sirve tras un proxy/reverso con dominio propio en desarrollo,
  // añádelo aquí, p. ej.: "reportes.institucion.edu"
  // Allowed dev origins (avoids the dev cross-origin warning when the IDE
  // preview loads /_next/* assets). "*.local" covers mDNS LAN hostnames;
  // direct IP access needs no extra entry. Add your dev proxy domain if used.
  allowedDevOrigins: ["10.6.31.148", "localhost", "127.0.0.1", "*.local"],
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      // Los archivos subidos nunca deben ejecutarse en el contexto del sitio
      { source: "/uploads/:path*", headers: [{ key: "X-Content-Type-Options", value: "nosniff" }] },
    ];
  },
};

export default nextConfig;
