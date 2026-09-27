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
    }, 350);

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
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '88vh' }}>
        <div className="sheet-handle" />

        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'var(--accent-green-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-green)'
            }}>
              <Store size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>{title}</h3>
              <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                Precios oficiales Mercadona • CP {settings.postalCode}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={20} />
          </button>
        </div>

        {/* Search Input Box */}
        <div style={{ padding: '16px 20px 8px 20px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search
              size={18}
              color="var(--text-dim)"
              style={{ position: 'absolute', left: '14px', pointerEvents: 'none' }}
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ej: Tomate frito, pechuga de pollo, arroz..."
              className="input-field"
              style={{ paddingLeft: '40px', paddingRight: '36px', height: '46px', fontSize: '15px' }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim)',
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
                  background: query.toLowerCase() === chip.toLowerCase() ? 'var(--accent-green-subtle)' : 'var(--bg-tertiary)',
                  color: query.toLowerCase() === chip.toLowerCase() ? 'var(--accent-green-light)' : 'var(--text-muted)',
                  border: query.toLowerCase() === chip.toLowerCase() ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-full)',
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: '500',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Results Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 20px 20px' }}>
          {isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: '12px' }}>
              <Loader2 size={32} className="spin-anim" color="var(--accent-green)" />
              <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>Buscando en catálogo de Mercadona...</span>
            </div>
          )}

          {error && !isLoading && (
            <div style={{
              background: 'var(--accent-rose-subtle)',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              borderRadius: 'var(--radius-sm)',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: 'var(--accent-rose)',
              fontSize: '13px',
              marginTop: '10px'
            }}>
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {!isLoading && !error && results.length === 0 && query.trim() !== '' && (
            <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-dim)' }}>
              <p style={{ fontSize: '15px', fontWeight: '600', marginBottom: '6px' }}>No se encontraron productos</p>
              <p style={{ fontSize: '13px' }}>Prueba con un término más general (ej: &quot;leche&quot;, &quot;pan&quot;, &quot;aceite&quot;)</p>
            </div>
          )}

          {!isLoading && !error && results.length === 0 && query.trim() === '' && (
            <div style={{ textAlign: 'center', padding: '36px 10px', color: 'var(--text-dim)' }}>
              <Sparkles size={32} color="var(--accent-green)" style={{ margin: '0 auto 12px auto', opacity: 0.8 }} />
              <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px' }}>
                Conexión en directo con Mercadona
              </p>
              <p style={{ fontSize: '12px', maxWidth: '320px', margin: '0 auto' }}>
                Escribe cualquier ingrediente o producto para ver su precio exacto, foto y envase.
              </p>
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
                className="glass-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                {/* Product Thumbnail */}
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '10px',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                  border: '1px solid var(--border-subtle)'
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
                    <Store size={22} color="#007a3d" />
                  )}
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      color: 'var(--accent-green)',
                      background: 'var(--accent-green-subtle)',
                      padding: '1px 6px',
                      borderRadius: '4px',
                    }}>
                      {product.brand || 'Mercadona'}
                    </span>
                    {product.packaging && (
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {product.packaging}
                      </span>
                    )}
                  </div>
                  <h4 style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    lineHeight: '1.25',
                    color: 'var(--text-main)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {product.displayName}
                  </h4>
                  {product.referencePrice && (
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                      ({product.referencePrice.toFixed(2)} €/{product.referenceFormat || 'kg'})
                    </div>
                  )}
                </div>

                {/* Price and Add Action */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                  <span className="price-text" style={{ fontSize: '16px', color: 'var(--accent-green-light)', fontWeight: '700' }}>
                    {product.price > 0 ? `${product.price.toFixed(2)} €` : 'Consultar'}
                  </span>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--accent-green-subtle)',
                    color: 'var(--accent-green)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                  }}>
                    <Plus size={16} />
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
