'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MercadonaProduct } from '@/types';
import { useApp } from '@/context/AppContext';
import { Search, X, Loader2, Store, Plus, Sparkles, AlertCircle } from 'lucide-react';

interface MercadonaSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: MercadonaProduct) => void;
  initialQuery?: string;
  title?: string;
}

const QUICK_SEARCH_CHIPS = [
  'Huevos',
  'Pollo',
  'Salmón',
  'Patatas',
  'Tomate',
  'Cebolla',
  'Arroz',
  'Pasta',
  'Leche',
  'Queso',
  'Aguacate',
  'Aceite',
  'Café',
  'Pan',
  'Yogur',
  'Solomillo'
];

export default function MercadonaSearchModal({
  isOpen,
  onClose,
  onSelectProduct,
  initialQuery = '',
  title = 'Buscar producto en Mercadona',
}: MercadonaSearchModalProps) {
  const { settings } = useApp();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<MercadonaProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCatalogSize, setTotalCatalogSize] = useState<number>(4332);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      if (initialQuery.trim()) {
        searchProducts(initialQuery.trim());
      }
      setTimeout(() => inputRef.current?.focus(), 150);
    } else {
      setResults([]);
      setError(null);
    }
  }, [isOpen, initialQuery]);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      searchProducts(trimmed);
    }, 200);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  const searchProducts = async (searchTerm: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/mercadona/search?q=${encodeURIComponent(searchTerm)}&postalCode=${settings.postalCode}&warehouse=${settings.warehouse}`
      );
      if (!res.ok) {
        throw new Error('Error al conectar con la base de Mercadona');
      }
      const data = await res.json();
      setResults(data.hits || []);
      if (data.totalCatalogSize) {
        setTotalCatalogSize(data.totalCatalogSize);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'No se pudieron cargar los productos');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh' }}>
        <div className="sheet-handle" />

        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '6px',
              background: '#000000',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Store size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{title}</h3>
              <p style={{ fontSize: '11px', color: '#64748b' }}>
                Catálogo Mercadona Logroño ({totalCatalogSize.toLocaleString()} productos)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={18} />
          </button>
        </div>

        {/* Search Input Box */}
        <div style={{ padding: '14px 18px 8px 18px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search
              size={18}
              color="#94a3b8"
              style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }}
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, marca o tipo (ej: solomillo, leche, arroz)..."
              className="input-field"
              style={{ paddingLeft: '38px', paddingRight: '36px', height: '44px' }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Quick Chips */}
          <div style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            padding: '10px 0 6px 0',
            scrollbarWidth: 'none',
          }}>
            {QUICK_SEARCH_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => setQuery(chip)}
                style={{
                  background: query.toLowerCase() === chip.toLowerCase() ? '#000000' : '#f8fafc',
                  color: query.toLowerCase() === chip.toLowerCase() ? '#ffffff' : '#475569',
                  border: query.toLowerCase() === chip.toLowerCase() ? '1px solid #000000' : '1px solid #e2e8f0',
                  borderRadius: '20px',
                  padding: '4px 12px',
                  fontSize: '11px',
                  fontFamily: 'Montserrat',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                }}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Results Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 18px calc(24px + var(--sab)) 18px' }}>
          {isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: '10px' }}>
              <Loader2 size={28} className="spin-anim" color="#000000" />
              <span style={{ fontSize: '12px', color: '#64748b' }}>Buscando en los 4.332 productos de Mercadona...</span>
            </div>
          )}

          {error && !isLoading && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#dc2626',
              fontSize: '13px',
              marginTop: '8px'
            }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {!isLoading && !error && results.length === 0 && query.trim() !== '' && (
            <div style={{ textAlign: 'center', padding: '40px 10px', color: '#64748b' }}>
              <p style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
                No se encontraron productos para &quot;{query}&quot;
              </p>
              <p style={{ fontSize: '12px' }}>Prueba con una palabra más corta (ej: &quot;leche&quot;, &quot;tomate&quot;, &quot;queso&quot;)</p>
            </div>
          )}

          {!isLoading && !error && results.length === 0 && query.trim() === '' && (
            <div style={{ textAlign: 'center', padding: '36px 10px', color: '#64748b' }}>
              <Store size={36} color="#000000" style={{ margin: '0 auto 10px auto', opacity: 0.8 }} />
              <p style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
                Todos los productos de Mercadona
              </p>
              <p style={{ fontSize: '12px', maxWidth: '340px', margin: '0 auto', color: '#64748b' }}>
                Escribe cualquier alimento para ver su precio exacto, fotografía oficial y formato.
              </p>
            </div>
          )}

          {/* Results count banner */}
          {!isLoading && results.length > 0 && (
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px', fontWeight: '600' }}>
              {results.length} productos encontrados:
            </div>
          )}

          {/* Product Items List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {results.map((product) => (
              <div
                key={product.id}
                onClick={() => {
                  onSelectProduct(product);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s ease',
                }}
              >
                {/* Product Thumbnail */}
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '6px',
                  background: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                  border: '1px solid #e2e8f0'
                }}>
                  {product.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.thumbnail}
                      alt={product.displayName}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      loading="lazy"
                    />
                  ) : (
                    <Store size={20} color="#64748b" />
                  )}
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      color: '#0f172a',
                      background: '#f1f5f9',
                      padding: '1px 6px',
                      borderRadius: '4px',
                    }}>
                      {product.brand || 'Mercadona'}
                    </span>
                    {product.packaging && (
                      <span style={{ fontSize: '11px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {product.packaging}
                      </span>
                    )}
                  </div>
                  <h4 style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    lineHeight: '1.3',
                    color: '#0f172a',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {product.displayName}
                  </h4>
                  {product.referencePrice && (
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                      ({product.referencePrice.toFixed(2)} €/{product.referenceFormat || 'kg'})
                    </div>
                  )}
                </div>

                {/* Price and Add Action */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', flexShrink: 0 }}>
                  <span className="price-text" style={{ fontSize: '15px', color: '#000000', fontWeight: '800' }}>
                    {product.price > 0 ? `${product.price.toFixed(2)} €` : '-'}
                  </span>
                  <div style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '6px',
                    background: '#000000',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Plus size={15} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
