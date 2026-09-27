import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
import { AppProvider } from '@/context/AppContext';

export const metadata: Metadata = {
  title: 'Menú & Compra Mercadona | Planificador Semanal PWA',
  description: 'Planifica tus menús semanales de comidas y cenas de lunes a sábado o domingo y genera automáticamente tu lista de la compra con precios oficiales de Mercadona.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Menú Compra',
  },
  icons: {
    icon: '/favicon.png',
    apple: '/apple-touch-icon.png',
  },
  applicationName: 'Menú & Compra',
  keywords: ['mercadona', 'lista de la compra', 'menu semanal', 'pwa', 'recetas', 'precios mercadona', 'comidas y cenas'],
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Menú Compra" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
