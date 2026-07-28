/**
 * Template registry — three skins over the same engine (catalogLayout.tsx).
 *
 * Each skin is exported as a TemplateComponent so the BrandingEditor template
 * picker can list them via TEMPLATE_LIST, and catalogPdf.ts picks one by id via
 * getTemplateComponent(id). The SAME component instance is used by the live
 * preview (<PDFViewer>) and by the download path (pdf().toBlob()) — G2 single
 * source of truth.
 *
 * A provider who selects 'tron-night' uses the provider's palette MAPPED ONTO
 * the dark scheme (the brand object decides the hues; the template decides the
 * dark canvas). The admin run uses the platform night brand (Tron Night web
 * tokens) — see platformBrand.ts and catalogPdf.ts.
 */

import type * as React from 'react';
import type { FC } from 'react';
import type { CatalogTemplateId, ProviderBranding } from '../../../types';
import type { Product } from '../../../types';
import type { TemplateComponent, TemplateProps } from './commonTemplate';
import { TEMPLATE_DEFAULT_PALETTES } from '../../../types';
import {
  buildCatalogDocument,
  SKIN_BY_ID,
  SKIN_EDITORIAL,
  SKIN_MINIMAL_LIGHT,
  SKIN_TRON_NIGHT,
  type CatalogSkin,
} from './catalogLayout';

export { SKIN_BY_ID, SKIN_TRON_NIGHT, SKIN_MINIMAL_LIGHT, SKIN_EDITORIAL };

const wrap = (skin: CatalogSkin): TemplateComponent => {
  const Comp: FC<TemplateProps> = (props) => buildCatalogDocument(props, skin) as any as React.ReactElement;
  return Object.assign(Comp, {
    templateId: skin.templateId,
    templateName: skin.templateName,
    templateVibe: skin.templateVibe,
    isDarkCanvas: skin.isDarkCanvas,
    defaultPalette: TEMPLATE_DEFAULT_PALETTES[skin.templateId],
  }) as TemplateComponent;
};

const TronNightTemplate: TemplateComponent = wrap(SKIN_TRON_NIGHT);
const MinimalLightTemplate: TemplateComponent = wrap(SKIN_MINIMAL_LIGHT);
const EditorialTemplate: TemplateComponent = wrap(SKIN_EDITORIAL);

export { TronNightTemplate, MinimalLightTemplate, EditorialTemplate };

export const TEMPLATE_LIST: TemplateComponent[] = [TronNightTemplate, MinimalLightTemplate, EditorialTemplate];

/** Pick a template component by id; throws never (defaults to minimal-light). */
export const getTemplateComponent = (id: CatalogTemplateId): TemplateComponent => {
  const found = TEMPLATE_LIST.find((t) => t.templateId === id);
  return found || MinimalLightTemplate;
};

export type { CatalogTemplateId, ProviderBranding, Product };
