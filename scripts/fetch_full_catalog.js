const fs = require('fs');
const path = require('path');

async function fetchFullCatalog() {
  console.log('Fetching top categories from Mercadona...');
  const catRes = await fetch('https://tienda.mercadona.es/api/categories/', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  if (!catRes.ok) {
    throw new Error('Failed to fetch categories: ' + catRes.status);
  }

  const catData = await catRes.json();
  const subcategoryList = [];

  for (const mainCat of catData.results || []) {
    for (const sub of mainCat.categories || []) {
      subcategoryList.push({
        id: sub.id,
        name: sub.name,
        mainCategory: mainCat.name,
      });
    }
  }

  console.log(`Found ${subcategoryList.length} subcategories to fetch.`);

  const allProductsMap = new Map();
  const BATCH_SIZE = 8;

  for (let i = 0; i < subcategoryList.length; i += BATCH_SIZE) {
    const batch = subcategoryList.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (sub) => {
      try {
        const res = await fetch(`https://tienda.mercadona.es/api/categories/${sub.id}/`, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (!res.ok) return;
        const data = await res.json();

        for (const subSubCat of data.categories || []) {
          for (const p of subSubCat.products || []) {
            if (!allProductsMap.has(p.id)) {
              const unitPriceStr = p.price_instructions?.unit_price || p.price_instructions?.bulk_price || '0';
              const parsedPrice = parseFloat(unitPriceStr) || 0;
              const bulkPriceStr = p.price_instructions?.bulk_price;
              const refPriceStr = p.price_instructions?.reference_price;

              let thumb = p.thumbnail || '';
              if (!thumb && Array.isArray(p.photos) && p.photos.length > 0) {
                thumb = p.photos[0].thumbnail || p.photos[0].regular || p.photos[0].zoom || '';
              }

              allProductsMap.set(p.id, {
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
                categoryName: sub.mainCategory || sub.name || '',
              });
            }
          }
        }
      } catch (err) {
        console.warn(`Error fetching subcategory ${sub.id}:`, err.message);
      }
    }));
    process.stdout.write(`Fetched ${Math.min(i + BATCH_SIZE, subcategoryList.length)}/${subcategoryList.length} subcategories. Products so far: ${allProductsMap.size}\r`);
    await new Promise(r => setTimeout(r, 120));
  }

  const productsList = Array.from(allProductsMap.values());
  console.log(`\nDONE! Total unique Mercadona products indexed: ${productsList.length}`);

  const outPath = path.join(__dirname, '..', 'src', 'data', 'mercadonaFullCatalog.json');
  fs.writeFileSync(outPath, JSON.stringify(productsList), 'utf-8');
  console.log(`Saved to ${outPath} (${(fs.statSync(outPath).size / 1024 / 1024).toFixed(2)} MB)`);
}

fetchFullCatalog().catch(console.error);
