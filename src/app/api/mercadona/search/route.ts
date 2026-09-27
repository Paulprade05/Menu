import { NextRequest, NextResponse } from 'next/server';
import { MercadonaProduct } from '@/types';
import { getWarehouseFromPostalCode } from '@/data/initialData';
import { searchCatalogLocally } from '@/data/mercadonaCatalog';

export const dynamic = 'force-dynamic';
export const preferredRegion = ['mad1', 'cdg1', 'fra1'];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim() || '';
  const postalCode = searchParams.get('postalCode') || '46001';
  let warehouse = searchParams.get('warehouse') || '';

  if (!warehouse && postalCode) {
    warehouse = getWarehouseFromPostalCode(postalCode);
  }

  if (!query) {
    return NextResponse.json({ hits: [], total: 0 });
  }

  try {
    const tornillosUrl = new URL('https://tornillos.mercadona.es/search');
    tornillosUrl.searchParams.set('q', query);
    if (warehouse) {
      tornillosUrl.searchParams.set('warehouse', warehouse);
    }

    const response = await fetch(tornillosUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Referer': 'https://tienda.mercadona.es/',
        'Origin': 'https://tienda.mercadona.es',
      },
      next: { revalidate: 600 }
    });

    if (response.ok) {
      const data = await response.json();
      const rawHits = data.hits || [];

      if (rawHits.length > 0) {
        const products: MercadonaProduct[] = rawHits.map((p: any) => {
          const unitPriceStr = p.price_instructions?.unit_price || p.price_instructions?.bulk_price || '0';
          const parsedPrice = parseFloat(unitPriceStr) || 0;
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
            price: parsedPrice,
            bulkPrice: bulkPriceStr ? parseFloat(bulkPriceStr) : null,
            referencePrice: refPriceStr ? parseFloat(refPriceStr) : null,
            referenceFormat: p.price_instructions?.reference_format || null,
            thumbnail: thumb,
            shareUrl: p.share_url || `https://tienda.mercadona.es/product/${p.id}`,
            categoryName: p.categories?.[0]?.name || ''
          };
        });

        return NextResponse.json({
          hits: products,
          total: products.length,
          source: 'mercadona-live',
          warehouse: warehouse || 'default',
        });
      }
    }
  } catch (error) {
    console.warn('Direct Mercadona fetch failed, falling back to local catalog:', error);
  }

  // Graceful fallback to verified Mercadona catalog
  const localHits = searchCatalogLocally(query);
  return NextResponse.json({
    hits: localHits,
    total: localHits.length,
    source: 'mercadona-catalog',
    warehouse: warehouse || 'default',
  });
}
