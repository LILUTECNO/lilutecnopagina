import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { db } from '../firebaseConfig';

export interface HeroSlide {
  id: string;
  title: string;
  description: string;
  image?: string;
  mobileImage?: string;
  ctaLabel?: string;
  ctaHref?: string;
  active?: boolean;
  order?: number;
}

const DEFAULT_SLIDES: HeroSlide[] = [
  { id: 'principal', title: 'Diseño. Sonido. Poder.', description: 'Descubre nuestra cuidada selección de dispositivos premium, diseñados para ofrecer una experiencia tecnológica inigualable.', ctaLabel: 'Explorar catálogo', ctaHref: '#catalogo', order: 0 },
  { id: 'ofertas', title: 'Ofertas que conectan contigo', description: 'Tecnología, accesorios y estilo de vida con beneficios especiales por tiempo limitado.', ctaLabel: 'Ver ofertas', ctaHref: '#catalogo', order: 1 },
];

/**
 * Slides are read from Firestore collection `heroSlides`.
 * Admin documents support: title, description, image, ctaLabel, ctaHref, order and active.
 * The built-in slides keep the homepage polished until the administrator publishes banners.
 */
const HeroCarousel: React.FC = () => {
  const [remoteSlides, setRemoteSlides] = useState<HeroSlide[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  useEffect(() => {
    const slidesQuery = query(collection(db, 'heroSlides'), orderBy('order', 'asc'));
    return onSnapshot(slidesQuery, (snapshot) => {
      setRemoteSlides(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as HeroSlide)).filter(item => item.active !== false));
    }, () => setRemoteSlides([]));
  }, []);

  const slides = useMemo(() => remoteSlides.length ? remoteSlides : DEFAULT_SLIDES, [remoteSlides]);
  useEffect(() => setActiveIndex(index => Math.min(index, slides.length - 1)), [slides.length]);
  useEffect(() => {
    if (slides.length < 2) return;
    const timer = window.setInterval(() => setActiveIndex(index => (index + 1) % slides.length), 6500);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const move = (direction: number) => setActiveIndex(index => (index + direction + slides.length) % slides.length);
  return (
    <section className="relative overflow-hidden px-4 py-7 sm:px-6 sm:py-10 lg:py-14" aria-roledescription="carrusel" aria-label="Promociones destacadas">
      <div
        className="relative mx-auto min-h-[390px] max-w-7xl overflow-hidden rounded-3xl border border-white/10 bg-[#12091c] shadow-2xl sm:min-h-[430px]"
        onTouchStart={(event) => setTouchStart(event.touches[0].clientX)}
        onTouchEnd={(event) => { if (touchStart !== null && Math.abs(event.changedTouches[0].clientX - touchStart) > 45) move(event.changedTouches[0].clientX < touchStart ? 1 : -1); setTouchStart(null); }}
      >
        {slides.map((item, index) => (
          <article key={item.id} aria-hidden={index !== activeIndex} className={`absolute inset-0 transition-opacity duration-700 ease-out ${index === activeIndex ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
            {item.image && <picture><source media="(max-width: 639px)" srcSet={item.mobileImage || item.image} /><img src={item.image} alt="" className="absolute inset-0 h-full w-full object-cover" /></picture>}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0312]/95 via-[#0a0312]/65 to-[#0a0312]/25" />
            <div className="absolute -left-16 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-[#ff7a00]/20 blur-[90px]" />
            <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-[#7b2cbf]/25 blur-[100px]" />
            <div className="relative z-10 flex min-h-[390px] max-w-2xl flex-col justify-center px-7 py-16 sm:min-h-[430px] sm:px-14">
              <span className="mb-5 inline-flex w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.35em] text-orange-400 backdrop-blur-md">Ediciones exclusivas</span>
              <h1 className="font-montserrat text-4xl font-extralight leading-[1.08] tracking-tight text-white sm:text-6xl">{item.title}</h1>
              <p className="mt-5 max-w-md text-sm font-light leading-6 tracking-wide text-slate-200">{item.description}</p>
              <div className="mt-8"><a href={item.ctaHref || '#catalogo'} className="inline-flex rounded-full btn-glass-primary px-7 py-3.5 text-[10px] font-medium uppercase tracking-[0.25em]">{item.ctaLabel || 'Explorar catálogo'}</a></div>
            </div>
          </article>
        ))}
        {slides.length > 1 && <>
          <button type="button" onClick={() => move(-1)} className="absolute left-3 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-white/10 bg-black/20 p-2 text-white backdrop-blur sm:block" aria-label="Promoción anterior"><ChevronLeft className="h-5 w-5" /></button>
          <button type="button" onClick={() => move(1)} className="absolute right-3 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-white/10 bg-black/20 p-2 text-white backdrop-blur sm:block" aria-label="Siguiente promoción"><ChevronRight className="h-5 w-5" /></button>
          <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-2">{slides.map((item, index) => <button key={item.id} onClick={() => setActiveIndex(index)} className={`h-1.5 rounded-full transition-all ${index === activeIndex ? 'w-6 bg-orange-400' : 'w-1.5 bg-white/40'}`} aria-label={`Ir a promoción ${index + 1}`} />)}</div>
        </>}
      </div>
    </section>
  );
};

export default HeroCarousel;
