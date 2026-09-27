import { NextRequest, NextResponse } from 'next/server';
import { MercadonaProduct } from '@/types';
import { getWarehouseFromPostalCode } from '@/data/initialData';
import { searchAllMercadonaProducts, getTotalProductsCount } from '@/data/mercadonaSearchEngine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim() || '';
  const postalCode = searchParams.get('postalCode') || '26001';
  let warehouse = searchParams.get('warehouse') || '';

  if (!warehouse && postalCode) {
    warehouse = getWarehouseFromPostalCode(postalCode);
  }

  if (!query) {
    return NextResponse.json({
      hits: [],
      total: 0,
      totalCatalogSize: getTotalProductsCount()
    });
  }

  // 1. Search across the complete Mercadona catalogue (all 4,332 products indexed)
  const fullCatalogMatches = searchAllMercadonaProducts(query, 50);

  // 2. Also attempt live Tornillos search if possible
  try {
    const tornillosUrl = new URL('https://tornillos.mercadona.es/search');
    tornillosUrl.searchParams.set('q', query);
    if (warehouse) {
      tornillosUrl.searchParams.set('warehouse', warehouse);
    }

    const response = await fetch(tornillosUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      next: { revalidate: 600 }
    });

    if (response.ok) {
      const data = await response.json();
      const rawHits = data.hits || [];

      if (rawHits.length > 0) {
        const liveProducts: MercadonaProduct[] = rawHits.map((p: any) => {
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

        // Merge live results with indexed catalog ensuring no duplicates
        const seenIds = new Set(liveProducts.map(p => p.id));
        const combined = [...liveProducts];
        for (const item of fullCatalogMatches) {
          if (!seenIds.has(item.id)) {
            combined.push(item);
            seenIds.add(item.id);
          }
        }

        return NextResponse.json({
          hits: combined.slice(0, 50),
          total: combined.length,
          source: 'live-and-catalog',
          warehouse: warehouse || 'zgz1',
        });
      }
    }
  } catch (e) {
    // Live fetch failed, use complete catalog
  }

  return NextResponse.json({
    hits: fullCatalogMatches,
    total: fullCatalogMatches.length,
    source: 'full-catalog',
    totalCatalogSize: getTotalProductsCount(),
    warehouse: warehouse || 'zgz1',
  });
}
