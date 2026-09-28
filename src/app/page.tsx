'use client';

import dynamic from 'next/dynamic';

function Splash() {
  return (
    <div className="splash" aria-busy="true" aria-label="Cargando">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/apple-touch-icon.png" alt="" className="splash__logo" width={92} height={92} />
      <span className="splash__name">Menú &amp; Compra</span>
    </div>
  );
}

// Client only: the data lives in this device's storage
const ClientApp = dynamic(() => import('@/components/ClientApp'), { ssr: false, loading: Splash });

export default function HomePage() {
  return <ClientApp />;
}
