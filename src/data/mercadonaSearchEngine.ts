import { MercadonaProduct } from '@/types';
import { normalizeText } from '@/lib/utils';
import fullCatalogJson from './mercadonaFullCatalog.json';

const FULL_CATALOG: MercadonaProduct[] = fullCatalogJson as MercadonaProduct[];

// Normalized once (lowercase, without accents) so every search is cheap
const INDEX = FULL_CATALOG.map((product) => ({
  product,
  name: normalizeText(product.displayName),
  brand: normalizeText(product.brand || ''),
  cat: normalizeText(product.categoryName || ''),
  packaging: normalizeText(product.packaging || ''),
}));

export function searchAllMercadonaProducts(query: string, maxResults: number = 40): MercadonaProduct[] {
  const rawQuery = normalizeText(query || '');
  if (!rawQuery) return [];
  const tokens = rawQuery.split(/\s+/).filter(Boolean);

  const scored: { product: MercadonaProduct; score: number }[] = [];

  for (const entry of INDEX) {
    const { name, brand, cat, packaging } = entry;

    // Must match all tokens somewhere
    const matchesAll = tokens.every(
      (token) => name.includes(token) || brand.includes(token) || cat.includes(token) || packaging.includes(token),
    );
    if (!matchesAll) continue;

    let score = 0;

    // Exact name match
    if (name === rawQuery) {
      score += 1000;
    } else if (name.startsWith(rawQuery)) {
      score += 500;
    } else if (name.includes(' ' + rawQuery)) {
      score += 300;
    }

    // Token position in name
    for (const token of tokens) {
      if (name.startsWith(token)) {
        score += 100;
      } else if (name.includes(' ' + token)) {
        score += 60;
      } else if (name.includes(token)) {
        score += 40;
      }
      if (brand.includes(token)) {
        score += 20;
      }
    }

    // Prefer shorter, more specific names
    score -= name.length * 0.1;

    scored.push({ product: entry.product, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxResults).map((s) => s.product);
}

export function getTotalProductsCount(): number {
  return FULL_CATALOG.length;
}
