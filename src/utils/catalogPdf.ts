import { jsPDF } from 'jspdf';
import { Product } from '../types';
import { formatPrice } from './formatters';

const imageAsDataUrl = (url?: string): Promise<string | null> => {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext('2d')?.drawImage(image, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    image.onerror = () => resolve(null);
    image.src = url;
  });
};

export interface CatalogOptions {
  /** Nombre a mostrar en la cabecera (proveedor o "Lilu Tecno") */
  title?: string;
  /** URL del logo del proveedor (se dibuja en la cabecera izquierda) */
  logoUrl?: string;
  /** Nombre comercial del proveedor para mostrar en la cabecera */
  storeName?: string;
}

/** Creates a shareable catalog using only the products supplied by the caller. */
export const downloadCatalogPdf = async (
  products: Product[],
  fileName: string,
  titleOrOptions: string | CatalogOptions = 'Catálogo Lilu Tecno',
) => {
  const options: CatalogOptions = typeof titleOrOptions === 'string' ? { title: titleOrOptions } : titleOrOptions;
  const title = options.title || 'Catálogo';
  const storeName = options.storeName || '';

  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const date = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' }).format(new Date());
  let y = 18;

  // Pre-load logo if available
  const logoData = options.logoUrl ? await imageAsDataUrl(options.logoUrl) : null;

  const header = () => {
    // Fondo oscuro cabecera
    pdf.setFillColor(20, 9, 27);
    pdf.rect(0, 0, 210, 32, 'F');

    // Logo del proveedor (si existe) a la izquierda
    if (logoData) {
      pdf.addImage(logoData, 'JPEG', 14, 4, 22, 22);
      // Nombre del proveedor junto al logo
      pdf.setTextColor(255, 122, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text(storeName || 'Proveedor', 40, 13);
      pdf.setTextColor(200, 200, 200);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(title, 40, 20);
    } else {
      // Sin logo: mostrar "LILU TECNO" en naranja
      pdf.setTextColor(255, 122, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.text(storeName || 'LILU TECNO', 14, 14);
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(title, 14, 22);
    }

    // Fecha a la derecha
    pdf.setTextColor(150, 150, 150);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generado: ${date}`, 196, 14, { align: 'right' });

    // Marca discreta "Powered by Lilu Tecno"
    pdf.setTextColor(80, 80, 80);
    pdf.setFontSize(6.5);
    pdf.text('Powered by Lilu Tecno', 196, 22, { align: 'right' });

    y = 42;
  };

  header();
  for (const [index, product] of products.entries()) {
    if (y > 250) {
      pdf.addPage();
      header();
    }
    const image = await imageAsDataUrl(product.images?.[0]);
    pdf.setDrawColor(225, 225, 225);
    pdf.roundedRect(14, y - 5, 182, 31, 2, 2, 'S');
    if (image) pdf.addImage(image, 'JPEG', 17, y - 2, 24, 20);
    else {
      pdf.setFillColor(245, 245, 245);
      pdf.rect(17, y - 2, 24, 20, 'F');
      pdf.setTextColor(110, 110, 110);
      pdf.setFontSize(7);
      pdf.text('Sin foto', 29, y + 9, { align: 'center' });
    }
    pdf.setTextColor(25, 25, 25);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text(product.name.slice(0, 65), 47, y + 2);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Referencia: ${product.reference || product.id}`, 47, y + 8);
    pdf.text(`Categoría: ${product.category}`, 47, y + 13);
    pdf.setTextColor(255, 122, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text(formatPrice(product.price), 192, y + 11, { align: 'right' });
    y += 36;
    if (index === products.length - 1) break;
  }
  pdf.save(fileName);
};
