import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { db } from '../firebaseConfig';
import { normalizeBanner, type Banner } from './admin/banner/model';
import BannerSlide from './admin/banner/BannerSlide';

// Legacy fallback (DEFAULT_SLIDES) preserved verbatim: these keep the
// homepage polished until the admin publishes a banner. They go through
// normalizeBanner with explicit legacy fields so the renderer treats
// them identically to admin-published banners.
const DEFAULT_SLIDES_RAW: any[] = [
  {
    id: 'principal',
    title: 'Diseño. Sonido. Poder.',
    description:
      'Descubre nuestra cuidada selección de dispositivos premium, diseñados para ofrecer una experiencia tecnológica inigualable.',
    ctaLabel: 'Explorar catálogo',
    ctaHref: '#catalogo',
    order: 0,
  },
  {
    id: 'ofertas',
    title: 'Ofertas que conectan contigo',
    description:
      'Tecnología, accesorios y estilo de vida con beneficios especiales por tiempo limitado.',
    ctaLabel: 'Ver ofertas',
    ctaHref: '#catalogo',
    order: 1,
  },
];

/**
 * Slides are read from Firestore collection `heroSlides`.
 * Admin documents support legacy fields (title, description, image,
 * mobileImage, ctaLabel, ctaHref, order, active) PLUS the new additive
 * banner-model fields (presentationMode, imageAlt, overlay, cta,
 * imageClick). Every loaded row runs through normalizeBanner so legacy
 * banners render EXACTLY as before, and new banners render per their
 * saved mode/overlay/cta.
 *
 * The renderer host mechanics (autoplay/arrows/dots/spacing/sizing) are
 * UNCHANGED. Only the slide CONTENT now goes through <BannerSlide>.
 */
const HeroCarousel: React.FC = () => {
  const [remoteSlides, setRemoteSlides] = useState<Banner[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  useEffect(() => {
    const slidesQuery = query(collection(db, 'heroSlides'), orderBy('order', 'asc'));
    return onSnapshot(
      slidesQuery,
      (snapshot) => {
        setRemoteSlides(
          snapshot.docs
            .map((item) => normalizeBanner({ id: item.id, ...item.data() }))
            .filter((item) => (item as any).active !== false),
        );
      },
      () => setRemoteSlides([]),
    );
  }, []);

  const slides = useMemo<Banner[]>(() => {
    if (remoteSlides.length) return remoteSlides;
    return DEFAULT_SLIDES_RAW.map((raw) => normalizeBanner(raw));
  }, [remoteSlides]);

  useEffect(() => setActiveIndex((index) => Math.min(index, slides.length - 1)), [slides.length]);
  useEffect(() => {
    if (slides.length < 2) return;
    const timer = window.setInterval(
      () => setActiveIndex((index) => (index + 1) % slides.length),
      6500,
    );
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const move = (direction: number) =>
    setActiveIndex((index) => (index + direction + slides.length) % slides.length);

  return (
    <section
      className="relative overflow-hidden px-4 py-7 sm:px-6 sm:py-10 lg:py-14"
      aria-roledescription="carrusel"
      aria-label="Promociones destacadas"
    >
      <div
        className="relative mx-auto min-h-[390px] max-w-7xl overflow-hidden rounded-3xl border border-white/10 bg-[#12091c] shadow-2xl sm:min-h-[430px]"
        onTouchStart={(event) => setTouchStart(event.touches[0].clientX)}
        onTouchEnd={(event) => {
          if (
            touchStart !== null &&
            Math.abs(event.changedTouches[0].clientX - touchStart) > 45
          )
            move(event.changedTouches[0].clientX < touchStart ? 1 : -1);
          setTouchStart(null);
        }}
      >
        {slides.map((item, index) => (
          <BannerSlide
            key={item.id}
            banner={item}
            view="carousel"
            index={index}
            active={index === activeIndex}
          />
        ))}
        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => move(-1)}
              className="absolute left-3 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-white/10 bg-black/20 p-2 text-white backdrop-blur sm:block"
              aria-label="Promoción anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              className="absolute right-3 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-white/10 bg-black/20 p-2 text-white backdrop-blur sm:block"
              aria-label="Siguiente promoción"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-2">
              {slides.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => setActiveIndex(index)}
                  className={`h-1.5 rounded-full transition-all ${
                    index === activeIndex ? 'w-6 bg-orange-400' : 'w-1.5 bg-white/40'
                  }`}
                  aria-label={`Ir a promoción ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default HeroCarousel;

// (The legacy HeroSlide interface is superseded by the Banner type in
// admin/banner/model.ts + normalizeBanner; existing Firestore rows
// without the new fields load as overlay-mode custom-link banners and
// render IDENTICALLY to the pre-change carousel.)
