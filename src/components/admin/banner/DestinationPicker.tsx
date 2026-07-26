/* =================================================================
   DestinationPicker — shared control for picking a CTA / imageClick
   destination. Writes back a BannerDestination (linkType + ids/href).
   Banner slice (subcomponent of the banner admin editor).

   linkType options (spec):
     product  -> searchable combobox of EXISTING products (reused from
                 useProducts() allProducts, read-only); stores productId.
                 Shows thumb + name + price in each option. The carousel
                 resolves the href via the existing product route generator.
     category -> select of categories (reuse existing categories list).
                 Stores categoryId AND href='#catalogo' (the navigation
                 target — no per-category route exists in this app).
                 Renders a LIVE status line stating the REAL click
                 behavior; for this codebase CATEGORY_LINK_REACHABLE=false
                 so the honest NOT_REACHABLE status is shown, and the
                 categoryId is a seed for the future pre-filter wiring.
     custom   -> free text input (URL / hash / internal path). Stores href.
                 The legacy '#catalogo' lives here after normalization.

   Reuses: useProducts() (Hook_PURE_AND_FULL_LIST branch A per Q4), so we
   consume ONLY allProducts + categories. The combobox options are useMemo
   / React.memo gated so filter-state re-renders of the hook do NOT cause
   option-list re-renders. The hook's filter state is NOT bound to any
   control here, and BannerEditor never mutates global filter state.
   ================================================================== */
import React, { useMemo, useState } from 'react';
import type { BannerDestination, LinkType } from './model';
import { CATEGORY_LINK_REACHABLE, CATALOG_ANCHOR, categoryName } from './model';

interface DestinationPickerProps {
  value: BannerDestination;
  onChange: (next: BannerDestination) => void;
  // Products already passed in (from BannerEditor's single useProducts mount).
  // Avoids a second hook mount when this picker is reused for cta + imageClick.
  allProducts: { id: string; name: string; price?: number; images?: string[] | string }[];
  categories: string[];
}

const LINK_TYPE_TABS: { key: LinkType; label: string }[] = [
  { key: 'product', label: 'Producto' },
  { key: 'category', label: 'Categoría / Catálogo' },
  { key: 'custom', label: 'Enlace personalizado' },
];

const DestinationPicker: React.FC<DestinationPickerProps> = ({
  value,
  onChange,
  allProducts,
  categories,
}) => {
  const [productSearch, setProductSearch] = useState('');

  const linkType: LinkType = value.linkType || 'custom';

  const setLinkType = (lt: LinkType) => {
    if (lt === 'product') onChange({ linkType: 'product', productId: undefined });
    else if (lt === 'category') onChange({ linkType: 'category', categoryId: undefined, href: CATALOG_ANCHOR });
    else onChange({ linkType: 'custom', href: '' });
  };

  // Filtered product options (memoized from allProducts + search).
  const productOptions = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    return allProducts
      .filter((p) => !term || p.name.toLowerCase().includes(term))
      .slice(0, 80); // bound the rendered option count for long lists
  }, [allProducts, productSearch]);

  const setProductId = (id: string | undefined) => {
    onChange({ linkType: 'product', productId: id });
  };

  const setCategoryId = (id: string | undefined) => {
    onChange({ linkType: 'category', categoryId: id || undefined, href: id ? CATALOG_ANCHOR : undefined });
  };

  const setCustomHref = (href: string) => {
    onChange({ linkType: 'custom', href });
  };

  return (
    <div className="banner-destination space-y-3">
      {/* 3-way segmented control */}
      <div
        role="tablist"
        aria-label="Tipo de destino del botón / imagen clicable"
        className="banner-destination__tabs inline-flex rounded-[var(--radius-field)] border border-luxury-silver p-1"
      >
        {LINK_TYPE_TABS.map((tab) => {
          const selected = linkType === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setLinkType(tab.key)}
              className={`banner-destination__tab rounded-[calc(var(--radius-field)-2px)] px-3 py-1.5 text-xs uppercase tracking-widest transition-colors ${
                selected
                  ? 'bg-[linear-gradient(135deg,var(--cta-from),var(--cta-to))] text-white'
                  : 'text-luxury-black hover:bg-luxury-off-white'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Product combobox */}
      {linkType === 'product' && (
        <div className="space-y-2">
          <input
            type="search"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Buscar producto…"
            className="w-full rounded border border-luxury-silver bg-luxury-off-white px-3 py-2 text-sm font-light text-luxury-black"
            aria-label="Buscar producto para el botón"
          />
          <select
            value={value.productId || ''}
            onChange={(e) => setProductId(e.target.value || undefined)}
            className="w-full rounded border border-luxury-silver bg-luxury-off-white px-3 py-2 text-sm font-light text-luxury-black"
            aria-label="Selecciona un producto"
          >
            <option value="">— Selecciona un producto —</option>
            {productOptions.map((p) => {
              const img = Array.isArray(p.images) ? p.images[0] : typeof p.images === 'string' ? p.images.split(',')[0] : '';
              const price =
                typeof p.price === 'number'
                  ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(p.price)
                  : '';
              // Combine thumb+name+price into the option label (data attr for
              // any future custom-renderer; the native <option> cannot host HTML).
              return (
                <option key={p.id} value={p.id} data-thumb={img} data-price={price}>
                  {p.name}{price ? ` — ${price}` : ''}
                </option>
              );
            })}
          </select>
          {productOptions.length === 0 && (
            <p className="text-xs text-gray-500">Sin resultados. Usa el buscador para acotar la lista.</p>
          )}
        </div>
      )}

      {/* Category select + honest live status line */}
      {linkType === 'category' && (
        <div className="space-y-2">
          <select
            value={value.categoryId || ''}
            onChange={(e) => setCategoryId(e.target.value || undefined)}
            className="w-full rounded border border-luxury-silver bg-luxury-off-white px-3 py-2 text-sm font-light text-luxury-black"
            aria-label="Selecciona una categoría"
          >
            <option value="">— Selecciona una categoría —</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
            {/* Fixed catalog option — preserves today's default */}
            <option value="__catalog__">Catálogo (#catalogo)</option>
          </select>
          {(() => {
            const selectedName =
              value.categoryId === '__catalog__'
                ? undefined
                : categoryName(value.categoryId, categories);
            const honest =
              !CATEGORY_LINK_REACHABLE ? (
                <p className="text-xs text-gray-500">
                  Al hacer clic: abre <code>#catálogo</code>.{' '}
                  {selectedName
                    ? `(Filtro sugerido: ‘${selectedName}’ — se aplicará automáticamente cuando el estado de catálogos esté conectado.)`
                    : '(El filtro se aplicará automáticamente cuando el estado de catálogos esté conectado.)'}
                </p>
              ) : (
                <p className="text-xs text-gray-500">
                  Al hacer clic: abre <code>#catálogo</code> y aplica el filtro{' '}
                  <strong>{selectedName || '—'}</strong>.
                </p>
              );
            return honest;
          })()}
        </div>
      )}

      {/* Custom href */}
      {linkType === 'custom' && (
        <div className="space-y-1">
          <input
            type="text"
            value={value.href || ''}
            onChange={(e) => setCustomHref(e.target.value)}
            placeholder="#catalogo, /ruta, o https://…"
            className="w-full rounded border border-luxury-silver bg-luxury-off-white px-3 py-2 text-sm font-light text-luxury-black"
            aria-label="Enlace personalizado del botón"
          />
          <p className="text-xs text-gray-500">
            El valor clásico <code>#catalogo</code> lleva al catálogo en esta misma página.
          </p>
        </div>
      )}
    </div>
  );
};

// React.memo guards against parent re-render flooding the long option list.
export default React.memo(DestinationPicker);
