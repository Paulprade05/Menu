import { NextRequest, NextResponse } from 'next/server';
import { MercadonaProduct } from '@/types';
import { getWarehouseFromPostalCode } from '@/data/initialData';

export const dynamic = 'force-dynamic';

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
        'Accept': 'application/json',
      },
      // Cache for 10 minutes to avoid hitting rate limits while keeping prices fresh
      next: { revalidate: 600 }
    });

    if (!response.ok) {
      console.warn(`Mercadona API responded with ${response.status} for query "${query}"`);
      return NextResponse.json({ hits: [], total: 0, error: 'Mercadona API returned ' + response.status });
    }

    const data = await response.json();
    const rawHits = data.hits || [];

    const products: MercadonaProduct[] = rawHits.map((p: any) => {
      // Calculate unit price cleanly
      const unitPriceStr = p.price_instructions?.unit_price || p.price_instructions?.bulk_price || '0';
      const parsedPrice = parseFloat(unitPriceStr) || 0;

      const bulkPriceStr = p.price_instructions?.bulk_price;
      const refPriceStr = p.price_instructions?.reference_price;

      // Extract high quality thumbnail
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
      warehouse: warehouse || 'default',
    });
  } catch (error: any) {
    console.error('Error fetching from Mercadona:', error);
    return NextResponse.json({
      hits: [],
      total: 0,
      error: error.message || 'Error al conectar con Mercadona',
    }, { status: 500 });
  }
}
