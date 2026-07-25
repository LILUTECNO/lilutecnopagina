import React from 'react';
import { Header } from '../components/Header';
import HowItWorks from '../components/HowItWorks';

const HowItWorksPage: React.FC = () => (
  <div className="min-h-screen text-white">
    <Header />
    <main><HowItWorks /></main>
    <footer className="border-t border-white/10 bg-black/20 px-4 py-9 text-center text-[10px] uppercase tracking-[.2em] text-slate-400">Lilu Tecno · Tecnología mundial a tu alcance</footer>
  </div>
);
export default HowItWorksPage;
