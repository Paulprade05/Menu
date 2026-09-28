import { NextRequest, NextResponse } from 'next/server';
import { MercadonaProduct } from '@/types';
import { getWarehouseFromPostalCode } from '@/data/initialData';
import { searchAllMercadonaProducts, getTotalProductsCount } from '@/data/mercadonaSearchEngine';

export const dynamic = 'force-dynamic';

const MAX_RESULTS = 50;
/** The live search is a bonus: never make the user wait for it */
const LIVE_TIMEOUT_MS = 2500;

interface LiveHit {
  id: string | number;
  slug?: string;
  display_name?: string;
  brand?: string;
  packaging?: string;
  thumbnail?: string;
  share_url?: string;
  photos?: { thumbnail?: string; regular?: string; zoom?: string }[];
  categories?: { name?: string }[];
  price_instructions?: {
    unit_price?: string;
    bulk_price?: string;
    reference_price?: string;
    reference_format?: string;
  };
}

function mapLiveHit(p: LiveHit): MercadonaProduct {
  const unitPriceStr = p.price_instructions?.unit_price || p.price_instructions?.bulk_price || '0';
  const bulkPriceStr = p.price_instructions?.bulk_price;
  const refPriceStr = p.price_instructions?.reference_price;

  let thumb = p.thumbnail || '';
  if (!thumb && Array.isArray(p.photos) && p.photos.length > 0) {
    thumb = p.photos[0].thumbnail || p.photos[0].regular || p.photos[0].zoom || '';
  }

  return {
    id: String(p.id),
    slug: p.slug || '',
    displayName: p.display_name || p.slug || 'Producto Mercadona',
    brand: p.brand || 'Hacendado',
    packaging: p.packaging || '',
    price: parseFloat(unitPriceStr) || 0,
    bulkPrice: bulkPriceStr ? parseFloat(bulkPriceStr) : null,
    referencePrice: refPriceStr ? parseFloat(refPriceStr) : null,
    referenceFormat: p.price_instructions?.reference_format || null,
    thumbnail: thumb,
    shareUrl: p.share_url || `https://tienda.mercadona.es/product/${p.id}`,
    categoryName: p.categories?.[0]?.name || '',
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim().slice(0, 80) || '';
  const postalCode = searchParams.get('postalCode') || '26001';
  let warehouse = searchParams.get('warehouse') || '';

  if (!warehouse && postalCode) {
    warehouse = getWarehouseFromPostalCode(postalCode);
  }

  const totalCatalogSize = getTotalProductsCount();

  if (!query) {
    return NextResponse.json({ hits: [], total: 0, totalCatalogSize });
  }

  // 1. Search across the complete indexed Mercadona catalogue
  const fullCatalogMatches = searchAllMercadonaProducts(query, MAX_RESULTS);

  // 2. Also attempt a live search, merged on top when it answers in time
  try {
    const liveUrl = new URL('https://tornillos.mercadona.es/search');
    liveUrl.searchParams.set('q', query);
    if (warehouse) {
      liveUrl.searchParams.set('warehouse', warehouse);
    }

    const response = await fetch(liveUrl.toString(), {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(LIVE_TIMEOUT_MS),
      next: { revalidate: 600 },
    });

    if (response.ok) {
      const data = (await response.json()) as { hits?: LiveHit[] };
      const rawHits = Array.isArray(data.hits) ? data.hits : [];

      if (rawHits.length > 0) {
        const liveProducts = rawHits.map(mapLiveHit);
        const seenIds = new Set(liveProducts.map((p) => p.id));
        const combined = [...liveProducts];
        for (const item of fullCatalogMatches) {
          if (!seenIds.has(item.id)) {
            combined.push(item);
            seenIds.add(item.id);
          }
        }

        return NextResponse.json({
          hits: combined.slice(0, MAX_RESULTS),
          total: combined.length,
          source: 'live-and-catalog',
          totalCatalogSize,
          warehouse: warehouse || 'zgz1',
        });
      }
    }
  } catch {
    // Live search failed or timed out: the full catalogue is enough
  }

  return NextResponse.json({
    hits: fullCatalogMatches,
    total: fullCatalogMatches.length,
    source: 'full-catalog',
    totalCatalogSize,
    warehouse: warehouse || 'zgz1',
  });
}
