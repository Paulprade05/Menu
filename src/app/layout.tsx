import type { Metadata, Viewport } from 'next';
import { Montserrat } from 'next/font/google';
import '@/styles/globals.css';

const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-montserrat',
});

export const metadata: Metadata = {
  title: 'Menú & Compra Mercadona',
  description:
    'Planifica tus comidas y cenas de la semana y genera automáticamente la lista de la compra con precios de Mercadona.',
  manifest: '/manifest.json',
  applicationName: 'Menú & Compra',
  appleWebApp: {
    capable: true,
    // White status bar with dark text, matching the app's white header
    statusBarStyle: 'default',
    title: 'Menú Compra',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [{ url: '/favicon.png', sizes: '48x48', type: 'image/png' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  keywords: ['mercadona', 'lista de la compra', 'menu semanal', 'pwa', 'recetas', 'precios mercadona', 'comidas y cenas'],
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  // Keeps iOS from zooming into fields; pinch-to-zoom still works on iPhone
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={montserrat.variable}>
      <body>{children}</body>
    </html>
  );
}
